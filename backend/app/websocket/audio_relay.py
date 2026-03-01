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

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

SCRIBE_V2_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"


async def connect_to_scribe_v2() -> websockets.WebSocketClientProtocol:
    """Open a WebSocket connection to ElevenLabs Scribe V2."""
    url = (
        f"{SCRIBE_V2_URL}"
        f"?model_id=scribe_v2_realtime"
        f"&language_code=en"
        f"&sample_rate=16000"
        f"&encoding=pcm_s16le"
        f"&commit_strategy=vad"
        f"&vad_silence_threshold_secs=0.8"
    )
    extra_headers = {"xi-api-key": settings.elevenlabs_api_key}

    logger.info(f"Connecting to Scribe V2...")
    ws = await websockets.connect(url, additional_headers=extra_headers)

    # Wait for session_started message
    init_msg = await ws.recv()
    init_data = json.loads(init_msg)
    logger.info(f"Scribe V2 session: {json.dumps(init_data)[:200]}")

    return ws


async def listen_for_transcripts(
    scribe_ws: websockets.WebSocketClientProtocol,
    call_id: str,
    speaker: str,
    client_ws: WebSocket | None = None,
):
    """Listen for transcript results from Scribe V2 and store in Supabase."""
    supabase = get_supabase()

    try:
        async for message in scribe_ws:
            data = json.loads(message)
            msg_type = data.get("type", data.get("message_type", ""))

            if msg_type in ("committed_transcript", "committed_transcript_with_timestamps"):
                text = data.get("text", "")
                if not text or not text.strip():
                    continue

                logger.info(f"✅ [{speaker}] {text}")

                # Store in Supabase
                try:
                    supabase.table("transcript_segments").insert({
                        "call_id": call_id,
                        "speaker": speaker,
                        "text": text.strip(),
                        "is_final": True,
                    }).execute()
                except Exception as e:
                    logger.error(f"DB insert failed: {e}")

                # Forward to browser
                if client_ws:
                    try:
                        await client_ws.send_json({
                            "type": "transcript",
                            "speaker": speaker,
                            "text": text.strip(),
                            "is_final": True,
                        })
                    except Exception:
                        pass

            elif msg_type == "partial_transcript":
                text = data.get("text", "")
                if client_ws and text and text.strip():
                    try:
                        await client_ws.send_json({
                            "type": "transcript",
                            "speaker": speaker,
                            "text": text.strip(),
                            "is_final": False,
                        })
                    except Exception:
                        pass

            elif msg_type == "session_started":
                logger.info(f"🎙️ Scribe V2 session started for [{speaker}]")

            elif msg_type and "error" in msg_type.lower():
                logger.error(f"❌ Scribe V2 error [{speaker}]: {json.dumps(data)}")

    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Scribe V2 closed [{speaker}]: {e}")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Transcript listener error [{speaker}]: {e}")


async def handle_call_websocket(websocket: WebSocket, call_id: str):
    """Main WebSocket handler for a live call session.
    
    Browser sends raw PCM int16 16kHz audio (base64-encoded).
    We relay it directly to Scribe V2 — no transcoding needed.
    """
    await websocket.accept()
    logger.info(f"🔌 Call WebSocket connected: {call_id}")

    supabase = get_supabase()

    # Update call status
    try:
        from datetime import datetime, timezone
        supabase.table("calls").update({
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", call_id).execute()
    except Exception as e:
        logger.error(f"Failed to update call status: {e}")

    mic_scribe = None
    speaker_scribe = None
    mic_listener_task = None
    speaker_listener_task = None

    try:
        # Connect to Scribe V2 (two connections: mic + speaker)
        logger.info("Connecting mic to Scribe V2...")
        mic_scribe = await connect_to_scribe_v2()
        logger.info("Connecting speaker to Scribe V2...")
        speaker_scribe = await connect_to_scribe_v2()

        # Start transcript listeners
        mic_listener_task = asyncio.create_task(
            listen_for_transcripts(mic_scribe, call_id, "salesperson", websocket)
        )
        speaker_listener_task = asyncio.create_task(
            listen_for_transcripts(speaker_scribe, call_id, "client", websocket)
        )

        chunk_count = 0

        # Main loop: receive PCM from browser, relay to Scribe V2
        while True:
            try:
                raw_message = await websocket.receive_text()
                message = json.loads(raw_message)
            except WebSocketDisconnect:
                logger.info(f"Browser disconnected: {call_id}")
                break
            except Exception as e:
                logger.error(f"Receive error: {e}")
                break

            msg_type = message.get("type")

            if msg_type == "audio_chunk":
                stream = message.get("stream")  # "mic" or "speaker"
                audio_b64 = message.get("data", "")

                if not audio_b64:
                    continue

                target_ws = mic_scribe if stream == "mic" else speaker_scribe

                chunk_count += 1
                if chunk_count <= 3 or chunk_count % 40 == 0:
                    pcm_bytes = base64.b64decode(audio_b64)
                    logger.info(f"📤 Chunk #{chunk_count} [{stream}]: {len(pcm_bytes)} bytes PCM")

                # Relay PCM directly to Scribe V2 (already base64 encoded)
                if target_ws:
                    try:
                        await target_ws.send(json.dumps({
                            "message_type": "input_audio_chunk",
                            "audio_base_64": audio_b64,
                        }))
                    except Exception as e:
                        logger.error(f"Scribe V2 send failed: {e}")

            elif msg_type == "stop":
                logger.info(f"⏹️ Stop signal: {call_id}")
                break

            elif msg_type == "start":
                logger.info(f"▶️ Start signal: {call_id}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {call_id}")
    except Exception as e:
        logger.error(f"Call error: {e}", exc_info=True)
    finally:
        if mic_listener_task:
            mic_listener_task.cancel()
        if speaker_listener_task:
            speaker_listener_task.cancel()

        for ws in (mic_scribe, speaker_scribe):
            if ws:
                try:
                    await ws.close()
                except Exception:
                    pass

        # Update call status
        try:
            from datetime import datetime, timezone
            supabase.table("calls").update({
                "status": "completed",
                "ended_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", call_id).execute()
        except Exception as e:
            logger.error(f"Failed to update call status: {e}")

        logger.info(f"📞 Call ended: {call_id}")
