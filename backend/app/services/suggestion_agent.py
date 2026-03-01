"""Suggestion Agent for Phase 5.

Uses Groq with Tool Calling to gather context (via MCP tools) 
and generate real-time sales suggestions.

The agent now selects a category-specific prompt based on the classifier's
trigger_type so that each kind of conversation moment (competitor mention,
pricing question, tech inquiry, objection, feature request) gets a
tailored response format.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional

from groq import Groq
from app.config import settings
from app.mcp.server import web_search, fetch_product_context, get_client_research
from app.services.pii_masking import anonymize_text

logger = logging.getLogger(__name__)

SUGGESTION_MODEL = "llama-3.3-70b-versatile"  # Higher TPM limits and context window on Groq

# ---------------------------------------------------------------------------
# Category-specific system prompts
# ---------------------------------------------------------------------------

_BASE_RULES = """CRITICAL RULES (apply to ALL suggestions):
- FOCUS ON THE LATEST MESSAGE: The most recent segment (marked >>>) is the PRIMARY context. Earlier messages are background only.
- DO NOT repeat information from previous suggestions. Each card must offer NEW, actionable intel.
- Use short, actionable sentences. Avoid long paragraphs or conversational filler.
- STYLE: Use **bolding** for critical numbers, percentages, and status keywords.
- BREVITY: Max 3-4 bullet points. Total length ~50-75 words.
- DATA: Always include specific numbers or feature names when available."""

CATEGORY_PROMPTS: Dict[str, str] = {
    "competitor": f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Deliver a **Head-to-Head Competitor Battlecard** the salesperson can scan in seconds.

{_BASE_RULES}

FORMAT — Competitor Battlecard:
• **THEM**: One line summarising the competitor's weakness or pricing gap.
• **US**: One line on ADP's direct advantage (feature, price, integration).
• **SWITCH LEVER**: One line on switching cost, contract lock-in, or migration ease.
• (Optional) **WIN STAT**: A customer win-rate or case-study data point.

Example:
• **THEM**: Chorus charges **$1,400/user** with no native HRIS sync.
• **US**: ADP offers bulk pricing at ~**$1,190/user** with **SAP SuccessFactors auto-sync**.
• **SWITCH LEVER**: We handle full data migration in **<2 weeks** with dedicated onboarding.
""",

    "price": f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Deliver a **Pricing / TCO Summary** the salesperson can reference instantly.

{_BASE_RULES}

FORMAT — Pricing Card:
• **THEIR COST**: What the client is paying now (per-seat, annual, etc.).
• **OUR OFFER**: ADP's comparable price point and any volume/bundle discounts.
• **SAVINGS**: Estimated TCO savings (%, $ amount, or payback period).
• (Optional) **ROI HOOK**: One sentence tying cost savings to a business outcome.

Example:
• **THEIR COST**: Currently paying **$1,400/seat x 50 users = $70K/yr**.
• **OUR OFFER**: ADP Run at **$1,050/seat** with **15% volume discount** for 50+ seats.
• **SAVINGS**: Estimated **~$21K/yr** TCO reduction (**30%** savings).
""",

    "tech": f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Deliver a **Tech / Integration Snapshot** the salesperson can share on-the-fly.

{_BASE_RULES}

FORMAT — Tech Card:
• **CAPABILITY**: Does ADP support the requested integration/feature? Yes/No + detail.
• **HOW**: One line on the integration method (native, API, marketplace connector).
• **TIMELINE**: Typical setup or migration time.
• (Optional) **EDGE**: One differentiator vs. competitor integrations.

Example:
• **CAPABILITY**: Yes — **native SAP SuccessFactors** connector, bi-directional sync.
• **HOW**: Pre-built marketplace integration; no custom API work needed.
• **TIMELINE**: Typical go-live in **5-7 business days**.
""",

    "objection": f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Deliver a **Quick Rebuttal Card** using the Acknowledge → Counter → Evidence framework.

{_BASE_RULES}

FORMAT — Objection Handler:
• **ACKNOWLEDGE**: One empathetic line validating the concern.
• **COUNTER**: A direct rebuttal with a specific fact or feature.
• **EVIDENCE**: A proof point — case study, stat, or guarantee.

Example:
• **ACKNOWLEDGE**: Implementation concerns are common when switching payroll providers.
• **COUNTER**: ADP assigns a **dedicated migration team** — avg. go-live is **12 business days**.
• **EVIDENCE**: **94%** of mid-market migrations completed on-time in 2024 (internal data).
""",

    "feature": f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Deliver a **Feature Deep-Dive Card** highlighting ADP's capability and differentiation.

{_BASE_RULES}

FORMAT — Feature Card:
• **FEATURE**: Name of the ADP capability and a one-line description.
• **DIFFERENTIATOR**: How this compares to what competitors offer (or lack).
• **IMPACT**: Business outcome or efficiency gain for the client.
• (Optional) **ADD-ON**: Related features the client may not know about.

Example:
• **FEATURE**: **ADP Benefits Administration** — fully integrated with payroll, auto-deductions.
• **DIFFERENTIATOR**: Unlike Gusto, supports **multi-carrier quoting** and **COBRA admin** natively.
• **IMPACT**: Clients report **~8 hrs/month** saved on manual benefits reconciliation.
""",
}

DEFAULT_PROMPT = f"""You are a high-speed Sales Co-Pilot for ADP.
Goal: Provide concise, "glanceable" Battlecards that a salesperson can read and understand in seconds during a live call.

{_BASE_RULES}

FORMAT: Use a single bulleted list of hard facts and actionable intel.
CONTENT: Focus on pricing, integrations, and specs found via tools.

Example Output:
• Chorus is charging **$1,400/user**, but ADP can offer a bulk rate (approx. **15% TCO savings**) for your upcoming 50-person expansion.
• We provide **Native SAP SuccessFactors** integration that ensures **auto-sync** of employee data across both systems.
• Pre-call research indicates a **50-person** scale-up phase next month; emphasize ADP's scalability for payroll and HR.
"""


def _select_prompt(trigger_type: str) -> str:
    """Pick the best category prompt based on the classifier's trigger_type string.

    The classifier emits types like "Competitor: Chorus", "Price: 500 seats", etc.
    We parse the category prefix and look it up in CATEGORY_PROMPTS.
    """
    if not trigger_type:
        return DEFAULT_PROMPT

    category = trigger_type.split(":")[0].strip().lower()
    return CATEGORY_PROMPTS.get(category, DEFAULT_PROMPT)


# ---------------------------------------------------------------------------
# Tool definitions for Groq
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for real-time competitor data, pricing, and news.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The specific search query."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_product_context",
            "description": "Retrieve internal ADP product specs or competitor profiles from our database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {"type": "string", "description": "Name/key of the product (e.g., 'adp-run', 'gong')."},
                },
                "required": ["product_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_client_research",
            "description": "Fetch pre-call research summary for the current client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "The UUID of the client."},
                },
                "required": ["client_id"],
            },
        },
    }
]

async def call_tool(name: str, args: Dict[str, Any]) -> str:
    """Execute the local MCP tool function based on the LLM's request."""
    try:
        if name == "web_search":
            result = await web_search(**args)
            return json.dumps(result)
        elif name == "fetch_product_context":
            result = await fetch_product_context(**args)
            return json.dumps(result)
        elif name == "get_client_research":
            result = await get_client_research(**args)
            return json.dumps(result)
        return f"Error: Tool {name} not found"
    except Exception as e:
        logger.error(f"Error executing tool {name}: {e}")
        return f"Error: {str(e)}"

class SuggestionAgent:
    def __init__(self, client_ws=None):
        self.client_ws = client_ws
        self.client = Groq(api_key=settings.groq_api_key)

    async def generate(
        self, 
        suggestion_id: str,
        call_id: str, 
        client_id: str, 
        trigger_type: str, 
        recent_segments: List[Dict[str, str]],
        classification: Dict[str, Any]
    ):
        """Root method to generate and stream a suggestion."""
        import time
        t0 = time.time()
        try:
            # 0. Select category-specific prompt based on trigger type
            system_prompt = _select_prompt(trigger_type)
            logger.info(f"📋 Selected prompt category for trigger '{trigger_type}'")

            # 1. Prepare conversation history — mark latest segment with >>>
            transcript_lines = []
            for i, s in enumerate(recent_segments):
                prefix = ">>>" if i == len(recent_segments) - 1 else "   "
                transcript_lines.append(f"{prefix} {s['speaker'].upper()}: {s['text']}")
            transcript_text = "\n".join(transcript_lines)
            
            # Mask PII in the transcript text
            transcript_text, _ = anonymize_text(transcript_text)
            
            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user", 
                    "content": f"TRIGGER TYPE: {trigger_type}\nREASONING: {classification.get('reasoning')}\n\nCLIENT_ID: {client_id}\n\nTRANSCRIPT:\n{transcript_text}"
                }
            ]

            # 2. First LLM pass: Decide if tools are needed
            t1 = time.time()
            response = self.client.chat.completions.create(
                model=SUGGESTION_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=150
            )
            t2 = time.time()
            logger.info(f"⏱️ LLM Pass 1: {t2-t1:.1f}s")
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            # 3. Handle tool calls (if any)
            if tool_calls:
                messages.append(response_message)
                
                # Execute tool calls in parallel
                tool_tasks = []
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.bytes) if hasattr(tool_call.function, 'bytes') else json.loads(tool_call.function.arguments)
                    logger.info(f"🔧 Tool call: {function_name}({json.dumps(function_args)})")
                    tool_tasks.append(call_tool(function_name, function_args))
                
                tool_results = await asyncio.gather(*tool_tasks)
                
                for i, tool_call in enumerate(tool_calls):
                    result_str = tool_results[i]
                    # Aggressively truncate to fit within lower TPM limits (e.g., 6000 TPM)
                    if result_str and len(result_str) > 2000:
                        result_str = result_str[:2000] + "... [TRUNCATED DUE TO LENGTH]"

                    result_preview = result_str[:200] if len(result_str) > 200 else result_str
                    logger.info(f"📥 Tool result [{tool_call.function.name}]: {result_preview}")
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": tool_call.function.name,
                        "content": result_str,
                    })

                # 4. Second LLM pass: Final synthesis
                t3 = time.time()
                logger.info(f"⏱️ Tool execution: {t3-t2:.1f}s")
                final_response = self.client.chat.completions.create(
                    model=SUGGESTION_MODEL,
                    messages=messages,
                    temperature=0.1,
                    max_tokens=150
                )
                suggestion_text = final_response.choices[0].message.content
                t4 = time.time()
                logger.info(f"⏱️ LLM Pass 2: {t4-t3:.1f}s | Total: {t4-t0:.1f}s")
            else:
                suggestion_text = response_message.content
                logger.info(f"⏱️ No tools needed. Total: {time.time()-t0:.1f}s")

            # 5. Stream back to frontend
            if self.client_ws:
                await self.client_ws.send_json({
                    "id": suggestion_id,
                    "type": "suggestion_content",
                    "call_id": call_id,
                    "trigger_type": trigger_type,
                    "content": suggestion_text,
                    "status": "done"
                })
                
            logger.info(f"💡 Generated suggestion for call {call_id}")

        except Exception as e:
            logger.error(f"Error in SuggestionAgent: {e}", exc_info=True)
            if self.client_ws:
                await self.client_ws.send_json({
                    "id": suggestion_id,
                    "type": "suggestion_content",
                    "trigger_type": trigger_type,
                    "error": "Failed to generate suggestion",
                    "status": "error"
                })
