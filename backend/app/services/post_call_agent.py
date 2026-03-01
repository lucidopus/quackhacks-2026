"""Post-Call Synthesis Agent for Phase 6.

After a call ends, makes ONE structured LLM call to generate:
- Call summary
- Action items for the salesperson
- Improvement suggestions
- Task assignments to team members

Uses Groq (llama-3.3-70b-versatile) with JSON mode.
"""

import json
import logging
import time
from typing import List, Optional
from groq import Groq

from app.config import settings
from app.database import get_supabase
from app.services.pii_masking import anonymize_text, deanonymize_text

logger = logging.getLogger(__name__)

POST_CALL_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an expert sales call analyst for ADP. Your job: help sales teams REMEMBER and EXECUTE follow-ups effortlessly.

Given a complete call transcript and the sales team roster, generate a structured JSON analysis.

JSON STRUCTURE:
{
  "summary": "2-3 sentence factual summary of the call.",
  "follow_ups": [
    {
      "action": "Specific task",
      "assigned_to": "Team member name",
      "role": "Their role",
      "priority": "high|medium|low",
      "due": "Timeframe",
      "context": "Why this matters"
    }
  ],
  "coaching": [
    {
      "area": "Skill area",
      "observation": "What happened",
      "recommendation": "What to do differently",
      "example_script": "Optional phrasing"
    }
  ],
  "key_topics": ["Topic 1", "Topic 2"]
}

RULES:
- follow_ups: Generate 4-8. Assign to team members from the roster by role.
- coaching: Generate 2-3 constructive points.
- key_topics: Extract 3-5 key topics/products/competitors.
- Respond ONLY with valid JSON."""


async def generate_insights(call_id: str, client_id: str) -> dict:
    """Generate post-call insights from the full transcript using Groq."""
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
        # Mask PII in the generated transcript text
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
        
        # 5. Build prompt and call Groq
        user_message = f"""Analyze this completed sales call and generate structured insights.
{client_info}

FULL TRANSCRIPT ({len(segments.data)} segments):
{transcript_text}

SALES TEAM (assign tasks to these people):
{team_block}

Respond with a JSON object containing the required fields."""

        client_groq = Groq(api_key=settings.groq_api_key)
        
        t1 = time.time()
        max_retries = 2
        retry_delay = 5
        
        response_content = None
        for attempt in range(max_retries + 1):
            try:
                completion = client_groq.chat.completions.create(
                    model=POST_CALL_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=2048,
                )
                response_content = completion.choices[0].message.content
                break
            except Exception as e:
                if "429" in str(e) or "rate_limit" in str(e).lower():
                    if attempt < max_retries:
                        logger.warning(f"⚠️ Groq Rate Limit Hit. Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(retry_delay)
                        continue
                raise e
                
        t2 = time.time()
        logger.info(f"📊 Post-call Groq LLM completed in {t2-t1:.1f}s")
        
        if not response_content:
            raise ValueError("No content returned by Groq.")
            
        # 6. Deanonymize and Parse
        deanonymized_json = deanonymize_text(response_content, pii_mapping)
        result = json.loads(deanonymized_json)
        
        # 7. Enrich follow_ups with team member IDs
        if team.data:
            team_lookup = {m["name"].lower(): m for m in team.data}
            for fu in result.get("follow_ups", []):
                match = team_lookup.get(fu.get("assigned_to", "").lower())
                if match:
                    fu["assignee_id"] = match["id"]
                    fu["assignee_email"] = match["email"]
        
        # 8. Save results
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
