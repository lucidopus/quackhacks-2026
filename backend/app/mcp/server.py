"""FastMCP server with three tools for the Sales Co-Pilot suggestion agent.

Tools:
- web_search: Real-time web search via Tavily for competitor data, news, pricing
- fetch_product_context: Retrieve internal product specs and competitor profiles
- get_client_research: Fetch pre-call research from Supabase (Phase 2 output)
"""

import logging
import os

from fastmcp import FastMCP

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

mcp = FastMCP(
    "sales-copilot-tools",
    instructions=(
        "Tools for the Sales Co-Pilot suggestion agent. "
        "Use these to gather context before generating real-time sales suggestions."
    ),
)


@mcp.tool()
async def web_search(query: str, num_results: int = 5) -> dict:
    """Search the web for current information. Use this to find:
    - Competitor pricing and product details
    - Recent market news and trends
    - Company announcements or press releases
    - Industry benchmarks and statistics

    Args:
        query: The search query. Be specific and include company/product names.
        num_results: Number of results to return (default 5, max 10).

    Returns:
        A dict with 'results' containing title, url, and content for each result.
    """
    if not settings.tavily_api_key:
        return {"error": "Tavily API key not configured", "results": []}

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(
            query=query,
            max_results=min(num_results, 10),
            search_depth="advanced",
        )
        return {
            "results": [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", ""),
                    "score": r.get("score", 0),
                }
                for r in response.get("results", [])
            ]
        }
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return {"error": str(e), "results": []}


@mcp.tool()
async def fetch_product_context(product_name: str, fields: list[str] | None = None) -> dict:
    """Retrieve internal product specifications and positioning data from the database.
    Use this when the conversation involves product comparisons (ADP products vs competitors), 
    technical specs, or feature questions.

    Available products typically include: 'adp-workforce-now', 'adp-run', 'adp-vantage', 
    'competitor-gong', 'competitor-chorus', etc.

    Args:
        product_name: The name/key of the product to look up (lowercase, hyphenated).
        fields: Optional list of specific fields to return (e.g., ['pricing', 'features', 'differentiators']).
                If not provided, returns all available data.

    Returns:
        A dict with product details including name, description, features, pricing, and positioning.
    """
    try:
        supabase = get_supabase()
        
        # Normalize key
        key = product_name.lower().strip()
        
        # Query Supabase by key or fuzzy match name
        result = (
            supabase.table("products")
            .select("*")
            .or_(f"key.eq.{key},name.ilike.%{key}%")
            .limit(1)
            .execute()
        )

        if not result.data:
            # Try a broader search if no exact match
            result = (
                supabase.table("products")
                .select("key, name")
                .limit(10)
                .execute()
            )
            available = [f"{r['key']} ({r['name']})" for r in result.data] if result.data else []
            return {"error": f"Product '{product_name}' not found. Available products include: {available}"}

        product = result.data[0]
        
        if fields:
            return {k: v for k, v in product.items() if k in fields}

        return product

    except Exception as e:
        logger.error(f"Failed to fetch product context: {e}")
        return {"error": str(e)}


@mcp.tool()
async def get_client_research(client_id: str) -> dict:
    """Fetch the pre-call research summary for a specific client.
    This includes LinkedIn profile, company info, competitor landscape,
    and recent news — all researched during the pre-call phase (Phase 2).

    Args:
        client_id: The UUID of the client.

    Returns:
        A dict with the research summary and raw research data.
        Returns an error dict if no research exists.
    """
    if not client_id:
        return {"error": "client_id is required"}

    try:
        supabase = get_supabase()
        result = (
            supabase.table("research_summaries")
            .select("*")
            .eq("client_id", client_id)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if result.data:
            return result.data[0]

        return ""
    except Exception as e:
        logger.error(f"Failed to fetch client research: {e}")
        return ""
