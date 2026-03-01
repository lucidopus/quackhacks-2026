from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, clients, calls, research
from app.websocket.audio_relay import handle_call_websocket

app = FastAPI(title="Sales Co-Pilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(clients.router)
app.include_router(calls.router)
app.include_router(research.router)


@app.websocket("/ws/call/{call_id}")
async def call_websocket(websocket: WebSocket, call_id: str, client_id: str):
    """WebSocket endpoint for live call audio streaming."""
    await handle_call_websocket(websocket, call_id, client_id)
