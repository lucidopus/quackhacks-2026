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

SYSTEM_PROMPT = """You are an expert Sales Co-Pilot for ADP. Your goal is to provide real-time, high-value suggestions to a salesperson during a live call.

When a trigger (competitor mention, pricing question, technical objection) is detected, you will:
1. Use your available tools to gather facts (competitor pricing, ADP product specs, client research).
2. Synthesize a concise, "glanceable" suggestion for the salesperson.

SUGGESTION GUIDELINES:
- Be extremely concise (max 2-3 bullet points).
- Provide specific "rebuttals" or "value props" based on the facts you find.
- Cite your sources (e.g., "From Web Search", "From Client Research").
- Focus on ADP's strengths (TCO, integration, reliability).

Tone: Professional, helpful, and strategic.
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
        call_id: str, 
        client_id: str, 
        trigger_type: str, 
        recent_segments: List[Dict[str, str]],
        classification: Dict[str, Any]
    ):
        """Root method to generate and stream a suggestion."""
        try:
            # 1. Prepare conversation history for the agent
            transcript_text = "\n".join([f"{s['speaker'].upper()}: {s['text']}" for s in recent_segments])
            
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user", 
                    "content": f"TRIGGER TYPE: {trigger_type}\nREASONING: {classification.get('reasoning')}\n\nCLIENT_ID: {client_id}\n\nTRANSCRIPT:\n{transcript_text}"
                }
            ]

            # 2. First LLM pass: Decide if tools are needed
            response = self.client.chat.completions.create(
                model=SUGGESTION_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.1
            )
            
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
                    tool_tasks.append(call_tool(function_name, function_args))
                
                tool_results = await asyncio.gather(*tool_tasks)
                
                for i, tool_call in enumerate(tool_calls):
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": tool_call.function.name,
                        "content": tool_results[i],
                    })

                # 4. Second LLM pass: Final synthesis
                final_response = self.client.chat.completions.create(
                    model=SUGGESTION_MODEL,
                    messages=messages,
                    temperature=0.1
                )
                suggestion_text = final_response.choices[0].message.content
            else:
                suggestion_text = response_message.content

            # 5. Stream back to frontend
            if self.client_ws:
                await self.client_ws.send_json({
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
                    "type": "suggestion_content",
                    "error": "Failed to generate suggestion",
                    "status": "error"
                })
