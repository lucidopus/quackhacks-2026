from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from app.database import get_supabase

router = APIRouter(prefix="/api/calls", tags=["calls"])


class CreateCallRequest(BaseModel):
    client_id: str


class UpdateCallRequest(BaseModel):
    status: str  # "active" | "completed" | "failed"


@router.post("")
async def create_call(request: CreateCallRequest):
    """Create a new call session for a client."""
    supabase = get_supabase()

    # Verify client exists
    client = supabase.table("clients").select("id, name, company").eq("id", request.client_id).single().execute()
    if not client.data:
        raise HTTPException(status_code=404, detail="Client not found")

    # Create call record
    call_data = {
        "client_id": request.client_id,
        "status": "pending",
    }
    result = supabase.table("calls").insert(call_data).execute()

    return {
        "call_id": result.data[0]["id"],
        "status": "pending",
        "client": client.data,
    }


@router.patch("/{call_id}")
async def update_call(call_id: str, request: UpdateCallRequest):
    """Update call status."""
    supabase = get_supabase()

    update_data = {"status": request.status}
    now = datetime.now(timezone.utc).isoformat()

    if request.status == "active":
        update_data["started_at"] = now
    elif request.status in ("completed", "failed"):
        update_data["ended_at"] = now

    result = supabase.table("calls").update(update_data).eq("id", call_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Call not found")

    return result.data[0]


@router.get("/{call_id}")
async def get_call(call_id: str):
    """Get call details including transcript segment count."""
    supabase = get_supabase()

    call = supabase.table("calls").select("*").eq("id", call_id).single().execute()
    if not call.data:
        raise HTTPException(status_code=404, detail="Call not found")

    # Get transcript segments count
    segments = supabase.table("transcript_segments").select("id", count="exact").eq("call_id", call_id).execute()

    return {
        **call.data,
        "transcript_count": segments.count or 0,
    }
