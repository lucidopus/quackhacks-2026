"""
Research API Router — exposes the multi-agent research pipeline.

Endpoints:
  POST /api/research/{client_id}          — trigger research (background task)
  GET  /api/research/{client_id}          — get status + results
  GET  /api/research/{client_id}/stream   — SSE: live progress stream
"""

import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client

from app.database import get_supabase
from app.services.research.orchestrator import run_research, stream_research

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/research", tags=["research"])


# ── POST: trigger research ────────────────────────────────────────────────────


@router.post("/{client_id}")
async def trigger_research(
    client_id: str,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase),
):
    """
    Kick off the research pipeline for a client as a background task.
    Returns immediately with the research record status.
    """
    # Validate client exists
    try:
        client_resp = supabase.table("clients").select("id").eq("id", client_id).execute()
        if not client_resp.data:
            raise HTTPException(status_code=404, detail="Client not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Check if research already in progress or completed
    try:
        existing = (
            supabase.table("research_summaries")
            .select("id, status")
            .eq("client_id", client_id)
            .execute()
        )
        if existing.data:
            record = existing.data[0]
            if record["status"] == "in_progress":
                return {"status": "in_progress", "research_id": record["id"],
                        "message": "Research already in progress"}
            if record["status"] == "completed":
                return {"status": "completed", "research_id": record["id"],
                        "message": "Research already completed. Use GET to fetch results."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Queue background task — run_research is an async function, BackgroundTasks
    # will schedule it in the event loop
    import asyncio
    background_tasks.add_task(run_research, client_id, supabase)

    return {
        "status": "in_progress",
        "message": f"Research started for client {client_id}",
    }


# ── GET: fetch results ────────────────────────────────────────────────────────


@router.get("/{client_id}")
def get_research(
    client_id: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Get the current research status and results for a client.
    Returns the research_summaries record including summary_text and all data sections.
    """
    try:
        resp = (
            supabase.table("research_summaries")
            .select("*")
            .eq("client_id", client_id)
            .execute()
        )
        if not resp.data:
            return {"status": "not_started", "message": "No research found for this client"}
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /stream: SSE live progress ────────────────────────────────────────────


@router.get("/{client_id}/stream")
async def stream_research_sse(
    client_id: str,
    supabase: Client = Depends(get_supabase),
):
    """
    Server-Sent Events stream — runs the research pipeline in real time,
    emitting status updates as events and persisting results at the end.

    Clients can listen with EventSource('/api/research/{client_id}/stream').
    """

    async def event_generator():
        async for event in stream_research(client_id, supabase):
            data = json.dumps(event)
            yield f"data: {data}\n\n"
        yield "data: {\"event\": \"done\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
