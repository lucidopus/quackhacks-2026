"""Post-Call Synthesis Agent for Phase 6.

After a call ends, makes ONE structured LLM call to generate:
- Call summary
- Action items for the salesperson
- Improvement suggestions
- Task assignments to team members

Uses Gemini (google-genai) with JSON structured output via Pydantic schemas.
"""

import json
import logging
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.config import settings
from app.database import get_supabase
from app.services.pii_masking import anonymize_text, deanonymize_text

logger = logging.getLogger(__name__)

POST_CALL_MODEL = "gemini-2.5-pro"

class FollowUp(BaseModel):
    action: str = Field(description="Specific, actionable follow-up task")
    assigned_to: str = Field(description="Team member name from the roster")
    role: str = Field(description="Their role (e.g., Account Executive, Sales Engineer, etc.)")
    priority: str = Field(description="Priority: high, medium, or low")
    due: str = Field(description="Concrete timeframe (e.g., 'Today', 'Within 48 hours', 'This week')")
    context: str = Field(description="Why this matters — reference the specific moment in the call")

class Coaching(BaseModel):
    area: str = Field(description="Skill area (e.g., 'Discovery', 'Objection Handling', 'Closing')")
    observation: str = Field(description="What happened in the call")
    recommendation: str = Field(description="What to do differently next time")
    example_script: Optional[str] = Field(None, description="Optional: exact phrasing the salesperson could use")

class PostCallInsights(BaseModel):
    summary: str = Field(description="2-3 sentence factual summary: who spoke, what was discussed, what was agreed.")
    follow_ups: List[FollowUp] = Field(description="4-8 follow ups assigned to specific team members")
    coaching: List[Coaching] = Field(description="2-3 constructive coaching points referencing specific call moments")
    key_topics: List[str] = Field(description="Extract 3-5 key topics/products/competitors discussed")

SYSTEM_PROMPT = """You are an expert sales call analyst for ADP. Your job: help sales teams REMEMBER and EXECUTE follow-ups effortlessly.

Given a complete call transcript and the sales team roster, generate structured insights using the save_post_call_insights function.

RULES:
- follow_ups: Generate 4-8. Each MUST be assigned to a specific team member from the roster. Match by role:
  • Account Executive → quotes, proposals, scheduling demos/meetings
  • Sales Engineer → technical demos, integration plans, architecture reviews
  • Customer Success Manager → onboarding plans, transition support, relationship building
  • Sales Manager → deal strategy, escalation, pipeline updates
  • Marketing Liaison → collateral, case studies, competitive materials
- coaching: Generate 2-3. Be constructive. Reference specific call moments.
- key_topics: Extract 3-5 key topics/products/competitors discussed.
- NO overlap: each follow-up should be a distinct action, not a rephrasing of another.
- Prioritize by urgency: "high" = client is waiting on this, "medium" = important but not urgent, "low" = nice to have."""


async def generate_insights(call_id: str, client_id: str) -> dict:
    """Generate post-call insights from the full transcript.
    
    Creates a 'processing' record in call_insights, runs the LLM,
    then updates with the results.
    """
    supabase = get_supabase()
    
    # 1. Create processing record
    insight_record = supabase.table("call_insights").insert({
        "call_id": call_id,
        "status": "processing",
    }).execute()
    insight_id = insight_record.data[0]["id"]
    logger.info(f"📊 Post-call analysis started for call {call_id} (insight_id={insight_id})")

    try:
        # 2. Fetch full transcript
        segments = (
            supabase.table("transcript_segments")
            .select("speaker, text, created_at")
            .eq("call_id", call_id)
            .eq("is_final", True)
            .order("created_at", desc=False)
            .execute()
        )
        
        if not segments.data:
            logger.warning(f"No transcript segments found for call {call_id}")
            supabase.table("call_insights").update({
                "status": "failed",
                "summary": "No transcript data available for analysis.",
            }).eq("id", insight_id).execute()
            return {"error": "No transcript segments"}
        
        # Format transcript
        transcript_text = "\n".join(
            f"[{seg['speaker'].upper()}]: {seg['text']}"
            for seg in segments.data
        )
        # Mask PII in the generated transcript text, trapping the mapping for later
        transcript_text, pii_mapping = anonymize_text(transcript_text)
        logger.info(f"📊 Transcript: {len(segments.data)} segments, {len(transcript_text)} chars")
        
        # 3. Fetch team members
        team = supabase.table("team_members").select("id, name, role, email").execute()
        team_block = "\n".join(
            f"- {m['name']} ({m['role']}) — {m['email']}"
            for m in team.data
        ) if team.data else "No team members available."
        
        # 4. Fetch client info
        client_info = ""
        try:
            client = supabase.table("clients").select("name, company, role").eq("id", client_id).single().execute()
            if client.data:
                client_info = f"\nCLIENT: {client.data['name']} — {client.data.get('role', '')} at {client.data.get('company', '')}"
        except Exception:
            pass
        
        # 5. Build prompt and call LLM
        user_message = f"""Analyze this completed sales call and generate structured insights.
{client_info}

FULL TRANSCRIPT ({len(segments.data)} segments):
{transcript_text}

SALES TEAM (assign tasks to these people):
{team_block}

Generate a comprehensive analysis with summary, action items, improvement suggestions, and task assignments. Call the function to save the results."""

        client_gemini = genai.Client(api_key=settings.gemini_api_key)
        
        def save_post_call_insights(
            summary: str,
            follow_ups: List[FollowUp],
            coaching: List[Coaching],
            key_topics: List[str]
        ):
            """Save the analyzed insights from the sales call."""
            pass

        import time
        t1 = time.time()
        
        response = client_gemini.models.generate_content(
            model=POST_CALL_MODEL,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=user_message)])],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=2048,
                tools=[save_post_call_insights],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode="ANY",
                        allowed_function_names=["save_post_call_insights"]
                    )
                )
            )
        )
        t2 = time.time()
        logger.info(f"📊 Post-call LLM completed in {t2-t1:.1f}s")
        
        if not response.function_calls:
            raise ValueError("No function calls returned by Gemini.")
            
        fc = response.function_calls[0]
        # fc.args is a dictionary mapping to the function arguments
        raw_result_dict = dict(fc.args)
        
        # Reverse the PII masking on the resulting strings
        # Easiest way to do deep reversal across arbitrary nested structs is string replace on JSON representation
        raw_result_json = json.dumps(raw_result_dict)
        deanonymized_json = deanonymize_text(raw_result_json, pii_mapping)
        result = json.loads(deanonymized_json)
        
        # 6. Enrich follow_ups with team member IDs
        if team.data:
            team_lookup = {m["name"].lower(): m for m in team.data}
            for fu in result.get("follow_ups", []):
                match = team_lookup.get(fu.get("assigned_to", "").lower())
                if match:
                    fu["assignee_id"] = match["id"]
                    fu["assignee_email"] = match["email"]
        
        # 7. Save results (reuse existing columns)
        supabase.table("call_insights").update({
            "summary": result.get("summary", ""),
            "action_items": result.get("follow_ups", []),
            "improvement_suggestions": result.get("coaching", []),
            "task_assignments": result.get("key_topics", []),
            "status": "completed",
        }).eq("id", insight_id).execute()
        
        logger.info(f"✅ Post-call insights saved for call {call_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Post-call analysis failed for call {call_id}: {e}")
        supabase.table("call_insights").update({
            "status": "failed",
            "summary": f"Analysis failed: {str(e)}",
        }).eq("id", insight_id).execute()
        return {"error": str(e)}
