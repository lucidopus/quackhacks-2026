from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_supabase
from datetime import date, time

router = APIRouter(prefix="/api/clients", tags=["clients"])

class ClientResponse(BaseModel):
    id: str
    name: str
    company: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    meeting_date: date
    meeting_time: time
    meeting_link: Optional[str] = None
    profile_data: dict = {}

@router.get("", response_model=List[ClientResponse])
def get_clients(supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("clients").select("*").order("meeting_date").order("meeting_time").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: str, supabase: Client = Depends(get_supabase)):
    try:
        response = supabase.table("clients").select("*").eq("id", client_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Client not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
