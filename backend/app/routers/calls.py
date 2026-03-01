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
    """Update call status. Triggers post-call analysis on completion."""
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

    # Trigger post-call analysis on completion
    if request.status == "completed":
        client_id = result.data[0].get("client_id", "")
        if client_id:
            import asyncio
            from app.services.post_call_agent import generate_insights
            asyncio.ensure_future(generate_insights(call_id, client_id))

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


@router.get("/{call_id}/insights")
async def get_call_insights(call_id: str):
    """Get post-call insights with call metadata for traceability."""
    supabase = get_supabase()

    # Fetch insights
    result = (
        supabase.table("call_insights")
        .select("*")
        .eq("call_id", call_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="No insights found for this call")

    insights = result.data[0]

    # Fetch call metadata for traceability
    try:
        call = supabase.table("calls").select("started_at, ended_at, client_id").eq("id", call_id).single().execute()
        if call.data:
            insights["call_started_at"] = call.data.get("started_at")
            insights["call_ended_at"] = call.data.get("ended_at")
            
            # Fetch transcript segment count
            seg_count = supabase.table("transcript_segments").select("id", count="exact").eq("call_id", call_id).execute()
            insights["transcript_segments"] = seg_count.count or 0

            # Fetch client info
            client = supabase.table("clients").select("name, company, role").eq("id", call.data["client_id"]).single().execute()
            if client.data:
                insights["client_name"] = client.data["name"]
                insights["client_company"] = client.data.get("company", "")
                insights["client_role"] = client.data.get("role", "")
    except Exception:
        pass

    return insights
