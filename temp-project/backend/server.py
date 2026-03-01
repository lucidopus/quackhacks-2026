"""
Sales Copilot — FastAPI server.
Exposes the multi-agent company intelligence pipeline as a REST API.

Run with:
    uvicorn backend.server:app --host 0.0.0.0 --port 8080 --reload
"""

import asyncio
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.orchestrator import SalesCopilotOrchestrator

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_ID = os.getenv("MODEL_ID", "global.anthropic.claude-haiku-4-5-20251001-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sales Copilot API",
    description="Multi-agent AI system for deep company intelligence & B2B sales preparation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton orchestrator
_orchestrator: SalesCopilotOrchestrator | None = None


def get_orchestrator() -> SalesCopilotOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        logger.info(f"Initializing orchestrator | model={MODEL_ID} region={AWS_REGION}")
        _orchestrator = SalesCopilotOrchestrator(model_id=MODEL_ID, region=AWS_REGION)
    return _orchestrator


# ── Request Models ────────────────────────────────────────────────────────────


class ResearchRequest(BaseModel):
    company_name: str = Field(..., description="Name of the company to research")
    seller_context: str = Field(
        default="",
        description=(
            "Optional: What are you selling? e.g. 'We sell cloud cost optimization software' "
            "— the summarizer uses this to tailor talking points."
        ),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_ID, "region": AWS_REGION}


@app.post("/research")
async def research_company(request: ResearchRequest):
    """
    Research a company using the multi-agent pipeline.
    Returns a streaming NDJSON response of events.

    Each line is a JSON object:
    - {"event": "status", "agent": "...", "status": "...", "message": "...", "data": {...}}
    - {"event": "heartbeat", "message": "..."}
    - {"event": "final_report", "report": {...}, "metadata": {...}, "elapsed_seconds": N}
    - {"event": "error", "message": "..."}
    """
    if not request.company_name or not request.company_name.strip():
        raise HTTPException(status_code=400, detail="company_name is required")

    orchestrator = get_orchestrator()

    async def event_stream():
        try:
            async for event in orchestrator.research_company(
                company_name=request.company_name.strip(),
                seller_context=request.seller_context,
            ):
                yield json.dumps(event) + "\n"
        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            yield json.dumps({"event": "error", "message": str(e)}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )
