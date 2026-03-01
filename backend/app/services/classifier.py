"""Lightweight Groq-powered transcript classifier for Phase 4.

Evaluates committed transcript segments (VAD-committed, complete utterances only)
and decides whether to trigger the expensive suggestion agent.

Uses llama-3.1-8b-instant for <300ms latency with structured JSON output.
"""

import json
import logging
from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)

CLASSIFIER_MODEL = "llama-3.1-8b-instant"
CONFIDENCE_THRESHOLD = 0.75

CLASSIFIER_SYSTEM_PROMPT = """You are a sales call classifier. Analyze live sales call transcript segments and decide whether the salesperson would benefit from an AI-generated suggestion RIGHT NOW.

Trigger a suggestion ONLY when one of these conditions is clearly met:
- A COMPETITOR is mentioned by name or implication ("your competitor", "the other tool", "we're also looking at X")
- A PRICING objection or question is raised ("how much", "too expensive", "budget", "cost per seat")
- A TECHNICAL question requires product knowledge ("does it support", "how does it handle", "integrate with")
- An OBJECTION is raised that could be countered ("our concern is", "the problem with", "we're not sure about")
- A PAIN POINT maps directly to a product feature the prospect doesn't know about

Do NOT trigger when:
- The conversation is small talk or rapport building
- The salesperson is already handling the topic confidently
- The segment is too short, vague, or ambiguous to act on
- The topic was just addressed in a previous segment

Respond with ONLY valid JSON in this exact structure:
{
    "should_trigger": true,
    "trigger_type": "competitor_mention" | "pricing_question" | "technical_question" | "objection" | "pain_point" | "none",
    "confidence": 0.0,
    "reasoning": "One sentence explaining the decision"
}"""


async def classify_transcript(
    recent_segments: list[dict],
    client_context: dict | None = None,
) -> dict:
    """Classify whether the latest transcript segments warrant triggering the suggestion agent.

    Args:
        recent_segments: List of recent segments (each with 'speaker' and 'text').
                         Only committed (VAD-finalized) segments should be passed.
        client_context: Optional client research context (from Phase 2) for better signal.

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

    # Format transcript
    transcript_text = "\n".join(
        f"[{seg.get('speaker', 'unknown').upper()}]: {seg.get('text', '')}"
        for seg in recent_segments
    )

    # Build context block
    context_block = ""
    if client_context and not client_context.get("error"):
        summary = client_context.get("summary_text", "")
        company = client_context.get("company_data", {})
        if summary:
            context_block = f"\nCLIENT RESEARCH CONTEXT:\n{summary[:500]}"
        elif company:
            context_block = f"\nCLIENT COMPANY: {json.dumps(company)[:300]}"

    user_message = f"""Analyze this live sales call transcript and classify it.

RECENT TRANSCRIPT (last {len(recent_segments)} committed segments):
{transcript_text}
{context_block}

Should a suggestion be triggered? Respond with JSON only."""

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
