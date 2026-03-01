"""Post-Call Synthesis Agent for Phase 6.

After a call ends, makes ONE structured LLM call to generate:
- Call summary
- Action items for the salesperson
- Improvement suggestions
- Task assignments to team members

Uses Groq llama-3.3-70b-versatile with JSON structured output.
"""

import json
import logging
from groq import Groq

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

POST_CALL_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an expert sales call analyst for ADP. Your job: help sales teams REMEMBER and EXECUTE follow-ups effortlessly.

Given a complete call transcript and the sales team roster, generate structured JSON:

{
    "summary": "2-3 sentence factual summary: who spoke, what was discussed, what was agreed.",
    "follow_ups": [
        {
            "action": "Specific, actionable follow-up task",
            "assigned_to": "Team member name from the roster",
            "role": "Their role",
            "priority": "high | medium | low",
            "due": "Concrete timeframe (e.g., 'Today', 'Within 48 hours', 'This week')",
            "context": "Why this matters — reference the specific moment in the call"
        }
    ],
    "coaching": [
        {
            "area": "Skill area (e.g., 'Discovery', 'Objection Handling', 'Closing')",
            "observation": "What happened in the call",
            "recommendation": "What to do differently next time",
            "example_script": "Optional: exact phrasing the salesperson could use"
        }
    ],
    "key_topics": ["topic1", "topic2"]
}

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

Generate a comprehensive analysis with summary, action items, improvement suggestions, and task assignments. Respond with JSON only."""

        client_groq = Groq(api_key=settings.groq_api_key)
        
        import time
        t1 = time.time()
        response = client_groq.chat.completions.create(
            model=POST_CALL_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000,
        )
        t2 = time.time()
        logger.info(f"📊 Post-call LLM completed in {t2-t1:.1f}s")
        
        result = json.loads(response.choices[0].message.content)
        
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
