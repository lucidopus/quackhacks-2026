"""Lightweight Groq-powered transcript classifier for Phase 4.

Evaluates committed transcript segments (VAD-committed, complete utterances only)
and decides whether to trigger the expensive suggestion agent.

Uses llama-3.1-8b-instant for <300ms latency with structured JSON output.
"""

import json
import logging
from groq import Groq

from app.config import settings
from app.services.pii_masking import anonymize_text

logger = logging.getLogger(__name__)

CLASSIFIER_MODEL = "llama-3.1-8b-instant"
CONFIDENCE_THRESHOLD = 0.75

CLASSIFIER_SYSTEM_PROMPT = """You are a real-time sales call classifier. Your job is to analyze the LATEST transcript segment (marked with >>>) and decide if the salesperson needs a NEW suggestion right now.

IMPORTANT RULES:
1. Focus ONLY on the >>> segment. Prior segments are context only.
2. Each trigger_type must be SPECIFIC to what the >>> segment is about.
3. DIFFERENT topics = DIFFERENT trigger_types. Examples:
   - Client mentions Chorus → "Competitor: Chorus"
   - Client asks about pricing for 500 seats → "Price: 500 seats"
   - Client asks about SAP integration → "Tech: SAP Integration"
   - Client mentions Gusto → "Competitor: Gusto"
   - Client raises implementation concerns → "Objection: Implementation"
   - Client asks about benefits → "Feature: Benefits"
4. If the >>> segment introduces a NEW topic not yet covered, TRIGGER it even if other topics were discussed earlier.
5. You will be given a list of ALREADY TRIGGERED topics. Do NOT trigger those exact topics again.

TRIGGER CATEGORIES:
- "Competitor: [name]" — A competitor is mentioned (Chorus, Gusto, Paychex, Workday, etc.)
- "Price: [context]" — Specific pricing question (cost per seat, TCO, budget)
- "Tech: [topic]" — Technical/integration question (SAP, API, migration)
- "Objection: [concern]" — Pushback or concern (implementation time, cost, complexity)
- "Feature: [area]" — Feature deep-dive request (benefits, time tracking, talent mgmt)

DO NOT TRIGGER IF:
- The >>> segment is small talk, filler words, or basic confirmation ("yeah", "okay", "right")
- The >>> segment repeats a topic from the ALREADY TRIGGERED list
- The salesperson is already explaining the answer in the >>> segment

Respond with ONLY valid JSON:
{
    "should_trigger": true,
    "trigger_type": "Category: Specific Label",
    "confidence": 0.0,
    "reasoning": "Short explanation"
}"""


async def classify_transcript(
    recent_segments: list[dict],
    client_context: dict | None = None,
    already_triggered: set[str] | None = None,
) -> dict:
    """Classify whether the latest transcript segments warrant triggering the suggestion agent.

    Args:
        recent_segments: List of recent segments (each with 'speaker' and 'text').
                         Only committed (VAD-finalized) segments should be passed.
        client_context: Optional client research context (from Phase 2) for better signal.
        already_triggered: Set of topic keys already triggered in this call.

    Returns:
        Dict with keys: should_trigger (bool), trigger_type (str), confidence (float), reasoning (str)
    """
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY not set — classifier disabled")
        return {
            "should_trigger": False,
            "trigger_type": "none",
            "confidence": 0.0,
            "reasoning": "Classifier disabled: GROQ_API_KEY not configured",
        }

    if not recent_segments:
        return {
            "should_trigger": False,
            "trigger_type": "none",
            "confidence": 0.0,
            "reasoning": "No segments to classify",
        }

    # Format transcript — highlight the latest segment with >>>
    transcript_lines = []
    for i, seg in enumerate(recent_segments):
        prefix = ">>>" if i == len(recent_segments) - 1 else "   "
        transcript_lines.append(
            f"{prefix} [{seg.get('speaker', 'unknown').upper()}]: {seg.get('text', '')}"
        )
    transcript_text = "\n".join(transcript_lines)
    
    # Mask PII in the generated transcript text
    transcript_text, _ = anonymize_text(transcript_text)

    # Build context block
    context_block = ""
    if client_context and not client_context.get("error"):
        summary = client_context.get("summary_text", "")
        company = client_context.get("company_data", {})
        if summary:
            context_block = f"\nCLIENT RESEARCH CONTEXT:\n{summary[:500]}"
        elif company:
            context_block = f"\nCLIENT COMPANY: {json.dumps(company)[:300]}"

    # Include already triggered topics
    triggered_block = ""
    if already_triggered:
        triggered_list = ", ".join(sorted(already_triggered))
        triggered_block = f"\nALREADY TRIGGERED (do NOT re-trigger these): {triggered_list}"

    user_message = f"""Analyze the >>> segment in this live sales call and classify it.

RECENT TRANSCRIPT (last {len(recent_segments)} committed segments):
{transcript_text}
{context_block}
{triggered_block}

Should a NEW suggestion be triggered based on the >>> segment? Respond with JSON only."""

    try:
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=CLASSIFIER_MODEL,
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=200,
        )

        result = json.loads(response.choices[0].message.content)

        # Validate required fields
        result.setdefault("should_trigger", False)
        result.setdefault("trigger_type", "none")
        result.setdefault("confidence", 0.0)
        result.setdefault("reasoning", "")

        # Ensure confidence is a float
        result["confidence"] = float(result["confidence"])

        logger.info(
            f"🧠 Classifier: trigger={result['should_trigger']} "
            f"type={result['trigger_type']} "
            f"confidence={result['confidence']:.2f} "
            f"reason='{result['reasoning']}'"
        )

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Classifier JSON parse error: {e}")
    except Exception as e:
        logger.error(f"Classifier error: {e}")

    return {
        "should_trigger": False,
        "trigger_type": "none",
        "confidence": 0.0,
        "reasoning": f"Classifier error — skipped",
    }
