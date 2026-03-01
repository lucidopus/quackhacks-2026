"""Suggestion Agent for Phase 5.

Uses Groq with Tool Calling to gather context (via MCP tools) 
and generate real-time sales suggestions.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional

from groq import Groq
from app.config import settings
from app.mcp.server import web_search, fetch_product_context, get_client_research

logger = logging.getLogger(__name__)

SUGGESTION_MODEL = "llama-3.1-8b-instant"  # Highly stable and fast for tool use

SYSTEM_PROMPT = """You are a high-speed Sales Co-Pilot for ADP. 
Goal: Provide concise, "glanceable" Battlecards that a salesperson can read and understand in seconds during a live call.

CRITICAL RULES:
- FOCUS ON THE LATEST MESSAGE: The most recent segment (marked >>>) is the PRIMARY context. Earlier messages are background only.
- DO NOT repeat information from previous suggestions. Each Battlecard must offer NEW, actionable intel.
- Use short, actionable sentences. Avoid long paragraphs or conversational filler.
- FORMAT: Use a single bulleted list of hard facts and rebuttals.
- STYLE: Use **bolding** for critical numbers, percentages, and status keywords.
- CONTENT: Focus on pricing, integrations, and specs found via tools.
- BREVITY: Max 3-4 bullet points. Total length ~50-75 words.
- DATA: Always include specific numbers or feature names (e.g., "**$1,200/seat**", "**SAP Sync**").

Example Output:
• Chorus is charging **$1,400/user**, but ADP can offer a bulk rate (approx. **15% TCO savings**) for your upcoming 50-person expansion.
• We provide **Native SAP SuccessFactors** integration that ensures **auto-sync** of employee data across both systems.
• Pre-call research indicates a **50-person** scale-up phase next month; emphasize ADP's scalability for payroll and HR.
"""

# Tool definitions for Groq
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
            # 1. Prepare conversation history — mark latest segment with >>>
            transcript_lines = []
            for i, s in enumerate(recent_segments):
                prefix = ">>>" if i == len(recent_segments) - 1 else "   "
                transcript_lines.append(f"{prefix} {s['speaker'].upper()}: {s['text']}")
            transcript_text = "\n".join(transcript_lines)
            
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
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
                    result_preview = tool_results[i][:200] if len(tool_results[i]) > 200 else tool_results[i]
                    logger.info(f"📥 Tool result [{tool_call.function.name}]: {result_preview}")
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": tool_call.function.name,
                        "content": tool_results[i],
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
