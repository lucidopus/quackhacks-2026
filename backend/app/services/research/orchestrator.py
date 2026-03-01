"""
Research Supabase Orchestrator — wraps ResearchPipeline and handles all
Supabase persistence: creating the research record, streaming status updates,
and storing final results in the research_summaries table.

Column mapping (research_summaries):
  summary_text    ← summarizer's markdown brief
  company_data    ← website crawler agent results
  news_data       ← news agent results
  competitor_data ← competitive agent results
  linkedin_data   ← people/decision-makers agent results
  raw_research    ← everything (all agent results + discovery + metadata)
  status          ← pending → in_progress → completed | failed
"""

import asyncio
import logging
from typing import AsyncIterator

from supabase import Client

from app.config import settings
from app.services.research.pipeline import ResearchPipeline

logger = logging.getLogger(__name__)

# Singleton pipeline — shared across requests (agents are lazy-initialized inside)
_pipeline: ResearchPipeline | None = None


def get_pipeline() -> ResearchPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = ResearchPipeline(
            model_id=settings.research_model_id,
            region=settings.aws_region,
        )
    return _pipeline


async def run_research(client_id: str, supabase: Client) -> None:
    """
    Background task: runs the full research pipeline for a client and
    persists results to Supabase.

    Called by the POST /api/research/{client_id} endpoint via BackgroundTasks.
    """
    # ── 1. Validate client exists ─────────────────────────────────────────────
    try:
        client_resp = supabase.table("clients").select("*").eq("id", client_id).execute()
        if not client_resp.data:
            logger.error(f"run_research: client {client_id} not found")
            return
        client = client_resp.data[0]
    except Exception as e:
        logger.error(f"run_research: failed to fetch client {client_id}: {e}")
        return

    company_name: str = client.get("company") or client.get("name") or ""
    if not company_name:
        logger.error(f"run_research: client {client_id} has no company name")
        return

    # ── 2. Upsert research record → in_progress ───────────────────────────────
    research_id: str | None = None
    try:
        # Check for existing record (avoid duplicate runs)
        existing = (
            supabase.table("research_summaries")
            .select("id, status")
            .eq("client_id", client_id)
            .execute()
        )
        if existing.data:
            research_id = existing.data[0]["id"]
            supabase.table("research_summaries").update({"status": "in_progress"}).eq(
                "id", research_id
            ).execute()
        else:
            insert_resp = (
                supabase.table("research_summaries")
                .insert({"client_id": client_id, "status": "in_progress"})
                .execute()
            )
            research_id = insert_resp.data[0]["id"]
    except Exception as e:
        logger.error(f"run_research: failed to create research record: {e}")
        return

    # ── 3. Run pipeline and collect results ───────────────────────────────────
    agent_results: dict = {}
    discovery_data: dict = {}
    final_report: dict = {}

    try:
        pipeline = get_pipeline()
        async for event in pipeline.run(company_name=company_name):
            if event.get("event") == "final_report":
                agent_results = event.get("agent_results", {})
                discovery_data = event.get("discovery_data") or {}
                final_report = event.get("report") or {}
            # Other events (status/heartbeat) are not streamed here —
            # they are yielded in the SSE endpoint instead.

    except Exception as e:
        logger.error(f"run_research: pipeline failed for {client_id}: {e}")
        try:
            supabase.table("research_summaries").update({"status": "failed"}).eq(
                "id", research_id
            ).execute()
        except Exception:
            pass
        return

    # ── 4. Persist results ────────────────────────────────────────────────────
    try:
        supabase.table("research_summaries").update(
            {
                "status": "completed",
                "summary_text": final_report.get("report") or final_report.get("full_response") or "",
                # Map agent outputs to named columns
                "company_data": agent_results.get("website") or {},
                "news_data": agent_results.get("news") or {},
                "competitor_data": agent_results.get("competitive") or {},
                "linkedin_data": agent_results.get("people") or {},
                # Raw research stores everything for full fidelity
                "raw_research": {
                    "discovery": discovery_data,
                    "website": agent_results.get("website"),
                    "news": agent_results.get("news"),
                    "financial": agent_results.get("financial"),
                    "people": agent_results.get("people"),
                    "tech": agent_results.get("tech"),
                    "competitive": agent_results.get("competitive"),
                    "data_sources": final_report.get("data_sources", {}),
                },
            }
        ).eq("id", research_id).execute()
        logger.info(f"run_research: completed for client {client_id} (research_id={research_id})")
    except Exception as e:
        logger.error(f"run_research: failed to persist results for {client_id}: {e}")
        try:
            supabase.table("research_summaries").update({"status": "failed"}).eq(
                "id", research_id
            ).execute()
        except Exception:
            pass


async def stream_research(
    client_id: str, supabase: Client
) -> AsyncIterator[dict]:
    """
    SSE-friendly generator: runs the pipeline and yields every status/heartbeat
    event in real time, then persists results at the end.

    Yields dicts that the router serialises as SSE data lines.
    """
    # ── 1. Validate client ────────────────────────────────────────────────────
    try:
        client_resp = supabase.table("clients").select("*").eq("id", client_id).execute()
        if not client_resp.data:
            yield {"event": "error", "message": f"Client {client_id} not found"}
            return
        client = client_resp.data[0]
    except Exception as e:
        yield {"event": "error", "message": str(e)}
        return

    company_name: str = client.get("company") or client.get("name") or ""
    if not company_name:
        yield {"event": "error", "message": "Client has no company name"}
        return

    # ── 2. Create / update research record ────────────────────────────────────
    research_id: str | None = None
    try:
        existing = (
            supabase.table("research_summaries")
            .select("id, status")
            .eq("client_id", client_id)
            .execute()
        )
        if existing.data:
            research_id = existing.data[0]["id"]
            supabase.table("research_summaries").update({"status": "in_progress"}).eq(
                "id", research_id
            ).execute()
        else:
            insert_resp = (
                supabase.table("research_summaries")
                .insert({"client_id": client_id, "status": "in_progress"})
                .execute()
            )
            research_id = insert_resp.data[0]["id"]
    except Exception as e:
        yield {"event": "error", "message": f"DB error: {e}"}
        return

    yield {
        "event": "started",
        "research_id": research_id,
        "company": company_name,
        "message": f"Starting research for {company_name}",
    }

    # ── 3. Run pipeline, stream events ────────────────────────────────────────
    agent_results: dict = {}
    discovery_data: dict = {}
    final_report: dict = {}

    try:
        pipeline = get_pipeline()
        async for event in pipeline.run(company_name=company_name):
            if event.get("event") == "final_report":
                agent_results = event.get("agent_results", {})
                discovery_data = event.get("discovery_data") or {}
                final_report = event.get("report") or {}
            # Yield every event to the SSE stream
            yield event
    except Exception as e:
        logger.error(f"stream_research: pipeline error for {client_id}: {e}")
        yield {"event": "error", "message": str(e)}
        try:
            supabase.table("research_summaries").update({"status": "failed"}).eq(
                "id", research_id
            ).execute()
        except Exception:
            pass
        return

    # ── 4. Persist ────────────────────────────────────────────────────────────
    try:
        supabase.table("research_summaries").update(
            {
                "status": "completed",
                "summary_text": final_report.get("report") or final_report.get("full_response") or "",
                "company_data": agent_results.get("website") or {},
                "news_data": agent_results.get("news") or {},
                "competitor_data": agent_results.get("competitive") or {},
                "linkedin_data": agent_results.get("people") or {},
                "raw_research": {
                    "discovery": discovery_data,
                    "website": agent_results.get("website"),
                    "news": agent_results.get("news"),
                    "financial": agent_results.get("financial"),
                    "people": agent_results.get("people"),
                    "tech": agent_results.get("tech"),
                    "competitive": agent_results.get("competitive"),
                    "data_sources": final_report.get("data_sources", {}),
                },
            }
        ).eq("id", research_id).execute()

        yield {
            "event": "saved",
            "research_id": research_id,
            "message": "Research saved to database",
        }
    except Exception as e:
        logger.error(f"stream_research: persist failed for {client_id}: {e}")
        yield {"event": "error", "message": f"Failed to save results: {e}"}
