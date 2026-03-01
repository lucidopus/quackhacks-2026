from supabase import create_client, Client
from app.config import settings

supabase: Client = create_client(settings.supabase_url, settings.supabase_secret_key)

def get_supabase() -> Client:
    return supabase
