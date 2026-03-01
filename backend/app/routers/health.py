from fastapi import APIRouter, Depends
from supabase import Client
from app.database import get_supabase

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health():
    return {"status": "ok", "service": "sales-copilot-backend"}

@router.get("/db")
def health_db(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("clients").select("id", count="exact").limit(1).execute()
        return {"status": "ok", "db": "connected", "client_count": response.count}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "error": str(e)}
