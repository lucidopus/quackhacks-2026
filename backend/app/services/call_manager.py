"""CallManager: Per-call intelligence coordinator for Phase 4.

Instantiated once per call session. Manages:
- Rolling window of committed transcript segments
- Non-blocking async classifier invocation
- Trigger handling (logs in Phase 4, fires suggestion agent in Phase 5)
"""

import asyncio
import logging

from fastapi import WebSocket

from app.services.classifier import classify_transcript, CONFIDENCE_THRESHOLD
from app.services.suggestion_agent import SuggestionAgent
from app.database import get_supabase

logger = logging.getLogger(__name__)


async def _fetch_client_research(client_id: str) -> dict | None:
    """Fetch the most recent completed research summary for a client."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("research_summaries")
            .select("summary_text, company_data, linkedin_data, competitor_data, news_data")
            .eq("client_id", client_id)
            .eq("status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch client research for {client_id}: {e}")
    return None


class CallManager:
    """Manages the real-time intelligence pipeline for a single call session.

    Usage:
        manager = CallManager(call_id="...", client_id="...", client_ws=websocket)
        # Pass manager.on_committed_segment as classifier_callback to listen_for_transcripts
    """

    def __init__(self, call_id: str, client_id: str, client_ws: WebSocket | None = None):
        self.call_id = call_id
        self.client_id = client_id
        self.client_ws = client_ws
        self.recent_segments: list[dict] = []
        self.is_processing: bool = False  # Prevent concurrent classifier runs
        self._client_research: dict | None = None
        self._research_fetched: bool = False
        self.suggestion_agent = SuggestionAgent(client_ws=client_ws)

    async def _ensure_research(self):
        """Lazy-load client research on first use."""
        if not self._research_fetched:
            self._client_research = await _fetch_client_research(self.client_id)
            self._research_fetched = True
            if self._client_research:
                logger.info(f"📋 Loaded client research for call {self.call_id}")
            else:
                logger.info(f"📋 No research found for client {self.client_id}")

    async def on_committed_segment(self, call_id: str, segment: dict):
        """Called when a VAD-committed transcript segment arrives.

        Adds to the rolling window and triggers classifier if not already running.
        Non-blocking: if classifier is mid-run, the new segment is added but
        a new classifier invocation is skipped to avoid queue buildup.
        """
        # Add to rolling window (last 10 committed segments)
        self.recent_segments.append({
            "speaker": segment.get("speaker", "unknown"),
            "text": segment.get("text", ""),
        })
        if len(self.recent_segments) > 10:
            self.recent_segments = self.recent_segments[-10:]

        # Skip if classifier is already running
        if self.is_processing:
            logger.debug(f"Classifier busy — skipping segment for call {self.call_id}")
            return

        self.is_processing = True
        try:
            await self._ensure_research()

            classification = await classify_transcript(
                recent_segments=self.recent_segments,
                client_context=self._client_research,
            )

            should_trigger = classification.get("should_trigger", False)
            confidence = classification.get("confidence", 0.0)

            if should_trigger and confidence >= CONFIDENCE_THRESHOLD:
                trigger_type = classification.get("trigger_type", "unknown")
                logger.info(
                    f"🚀 TRIGGER [{self.call_id}]: {trigger_type} "
                    f"(confidence={confidence:.2f}) — {classification.get('reasoning', '')}"
                )
                asyncio.create_task(self.handle_trigger(classification))
            else:
                logger.debug(
                    f"No trigger (should_trigger={should_trigger}, confidence={confidence:.2f})"
                )
        finally:
            self.is_processing = False

    async def handle_trigger(self, classification: dict):
        """Handle a classifier trigger.

        Phase 4: Logs the trigger event and notifies frontend.
        Phase 5: Will call the suggestion agent with full MCP tool access.
        """
        trigger_type = classification.get("trigger_type", "unknown")
        confidence = classification.get("confidence", 0.0)
        reasoning = classification.get("reasoning", "")

        logger.info(
            f"💡 [Phase 4] Notifying frontend of trigger for call {self.call_id}:\n"
            f"   type={trigger_type} | confidence={confidence:.2f}\n"
            f"   reason={reasoning}"
        )

        # Notify frontend so it can show a "Thinking..." or "Analyzing..." state
        if self.client_ws:
            try:
                await self.client_ws.send_json({
                    "type": "suggestion_trigger",
                    "trigger_type": trigger_type,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "status": "thinking", # Phase 4 identifies trigger, Phase 5 generates content
                })
            except Exception as e:
                logger.error(f"Failed to send trigger to frontend: {e}")

        # Phase 5: Active Suggestion Generation
        asyncio.create_task(self.suggestion_agent.generate(
            call_id=self.call_id,
            client_id=self.client_id,
            trigger_type=trigger_type,
            recent_segments=self.recent_segments,
            classification=classification
        ))
