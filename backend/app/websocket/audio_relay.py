"""WebSocket audio relay: Browser → Backend → ElevenLabs Scribe V2.

Handles two audio streams (mic + speaker) for speaker attribution.
Stores committed transcript segments in Supabase.

The browser sends raw PCM int16 16kHz audio via AudioWorklet,
so no server-side transcoding is needed — we relay directly to Scribe V2.
"""

import asyncio
import base64
import json
import logging
from fastapi import WebSocket, WebSocketDisconnect
import websockets
from websockets.asyncio.client import ClientConnection
from websockets.protocol import State as WsState

from app.config import settings
from app.database import get_supabase
from app.services.call_manager import CallManager

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

SCRIBE_V2_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"


async def connect_to_scribe_v2() -> ClientConnection:
    """Open a WebSocket connection to ElevenLabs Scribe V2."""
    url = (
        f"{SCRIBE_V2_URL}"
        f"?model_id=scribe_v2_realtime"
        f"&language_code=en"
        f"&sample_rate=16000"
        f"&encoding=pcm_s16le"
        f"&commit_strategy=vad"
        f"&vad_silence_threshold_secs=0.8"
        f"&inactivity_timeout=180"
    )
    extra_headers = {"xi-api-key": settings.elevenlabs_api_key}

    logger.info(f"Connecting to Scribe V2 (inactivity_timeout=180s)...")
    ws = await websockets.connect(url, additional_headers=extra_headers)

    # Wait for session_started message
    init_msg = await ws.recv()
    init_data = json.loads(init_msg)
    logger.info(f"Scribe V2 session: {json.dumps(init_data)[:200]}")

    return ws


class ScribeRelay:
    """Manages a Scribe V2 connection with auto-reconnection logic."""
    def __init__(self, call_id: str, speaker: str, client_ws: WebSocket | None = None, classifier_callback = None):
        self.call_id = call_id
        self.speaker = speaker
        self.client_ws = client_ws
        self.classifier_callback = classifier_callback
        self.scribe_ws: ClientConnection | None = None
        self.listener_task: asyncio.Task | None = None
        self._is_active = True
        self._msg_count = 0

    async def connect(self):
        """Connect or reconnect to Scribe V2 and start the listener."""
        try:
            if self.scribe_ws and self.scribe_ws.state != WsState.CLOSED:
                try:
                    await self.scribe_ws.close()
                except Exception:
                    pass
            
            self.scribe_ws = await connect_to_scribe_v2()
            
            # Start/restart listener task
            if self.listener_task:
                self.listener_task.cancel()
            
            self.listener_task = asyncio.create_task(self._listen_loop())
            logger.info(f"🚀 ScribeRelay for [{self.speaker}] connected.")
            return True
        except Exception as e:
            logger.error(f"Failed to connect ScribeRelay for [{self.speaker}]: {e}")
            return False

    async def send_audio(self, audio_b64: str):
        """Send audio chunk to Scribe V2, reconnecting if needed."""
        if not self._is_active:
            return

        if not self.scribe_ws or self.scribe_ws.state != WsState.OPEN:
            logger.warning(f"🔄 Reconnecting ScribeRelay for [{self.speaker}]...")
            if not await self.connect():
                return

        try:
            await self.scribe_ws.send(json.dumps({
                "message_type": "input_audio_chunk",
                "audio_base_64": audio_b64,
            }))
        except Exception as e:
            logger.error(f"Scribe V2 send failed for {self.speaker}: {e}")
            if "closed" in str(e).lower() or isinstance(e, websockets.exceptions.ConnectionClosed):
                await self.connect() # Attempt immediate reconnection on next chunk

    async def _listen_loop(self):
        """Internal listen loop for transcripts."""
        supabase = get_supabase()
        try:
            async for message in self.scribe_ws:
                data = json.loads(message)
                msg_type = data.get("type", data.get("message_type", ""))

                if msg_type in ("committed_transcript", "committed_transcript_with_timestamps"):
                    text = data.get("text", "")
                    if not text or not text.strip():
                        continue

                    logger.info(f"✅ [{self.speaker}] {text}")

                    # Store in Supabase
                    segment = None
                    try:
                        result = supabase.table("transcript_segments").insert({
                            "call_id": self.call_id,
                            "speaker": self.speaker,
                            "text": text.strip(),
                            "is_final": True,
                        }).execute()
                        if result.data:
                            segment = result.data[0]
                    except Exception as e:
                        logger.error(f"DB insert failed: {e}")

                    # Trigger classifier
                    if self.classifier_callback and segment:
                        asyncio.create_task(self.classifier_callback(self.call_id, segment))

                    # Forward to browser
                    if self.client_ws:
                        try:
                            await self.client_ws.send_json({
                                "type": "transcript",
                                "speaker": self.speaker,
                                "text": text.strip(),
                                "is_final": True,
                            })
                        except Exception:
                            pass

                elif msg_type == "partial_transcript":
                    text = data.get("text", "")
                    if self.client_ws and text and text.strip():
                        try:
                            await self.client_ws.send_json({
                                "type": "transcript",
                                "speaker": self.speaker,
                                "text": text.strip(),
                                "is_final": False,
                            })
                        except Exception:
                            pass

                elif msg_type == "session_started":
                    logger.info(f"🎙️ Scribe V2 session started for [{self.speaker}]")

                elif msg_type and "error" in msg_type.lower():
                    logger.error(f"❌ Scribe V2 error [{self.speaker}]: {json.dumps(data)}")
                
                self._msg_count += 1
                if self._msg_count % 50 == 0:
                    logger.debug(f"ℹ️ Scribe V2 listener [{self.speaker}] active. Msgs: {self._msg_count}")

        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"⚠️ Scribe V2 connection closed [{self.speaker}]: {e.code} {e.reason}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Transcript listener error [{self.speaker}]: {e}", exc_info=True)

    async def close(self):
        """Properly close the relay."""
        self._is_active = False
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                pass
        if self.scribe_ws and self.scribe_ws.state != WsState.CLOSED:
            try:
                await self.scribe_ws.close()
            except Exception:
                pass


async def handle_call_websocket(websocket: WebSocket, call_id: str, client_id: str):
    """Main WebSocket handler for a live call session."""
    await websocket.accept()
    logger.info(f"🔌 Call WebSocket connected: {call_id}")

    supabase = get_supabase()
    call_manager = CallManager(call_id=call_id, client_id=client_id, client_ws=websocket)

    # Initial status update
    try:
        from datetime import datetime, timezone
        supabase.table("calls").update({
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", call_id).execute()
    except Exception as e:
        logger.error(f"Failed to update call status: {e}")

    # Set up relays
    mic_relay = ScribeRelay(call_id, "salesperson", websocket, call_manager.on_committed_segment)
    speaker_relay = ScribeRelay(call_id, "client", websocket, call_manager.on_committed_segment)

    await asyncio.gather(mic_relay.connect(), speaker_relay.connect())

    chunk_count = 0

    try:
        while True:
            try:
                raw_message = await websocket.receive_text()
                message = json.loads(raw_message)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Receive error: {e}")
                break

            msg_type = message.get("type")

            if msg_type == "audio_chunk":
                stream = message.get("stream")
                audio_b64 = message.get("data", "")
                if not audio_b64:
                    continue

                chunk_count += 1
                if chunk_count <= 3 or chunk_count % 100 == 0:
                    logger.info(f"📤 Heartbeat Call {call_id} | Chunk #{chunk_count} [{stream}]")

                relay = mic_relay if stream == "mic" else speaker_relay
                await relay.send_audio(audio_b64)

            elif msg_type == "stop":
                logger.info(f"⏹️ Stop signal: {call_id}")
                break

    except Exception as e:
        logger.error(f"Call error: {e}", exc_info=True)
    finally:
        await asyncio.gather(mic_relay.close(), speaker_relay.close())

        # Final status update
        try:
            from datetime import datetime, timezone
            supabase.table("calls").update({
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", call_id).execute()
        except Exception as e:
            logger.error(f"Failed to update call status: {e}")

        logger.info(f"📞 Call ended: {call_id}")
