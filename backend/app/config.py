import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    tavily_api_key: str = os.getenv("TAVILY_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")

settings = Settings()
