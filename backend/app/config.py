import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_secret_key: str = os.getenv("SUPABASE_SECRET_KEY", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    tavily_api_key: str = os.getenv("TAVILY_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    # AWS Bedrock — uses terminal login (no key needed when using aws sso/cli credentials)
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    research_model_id: str = os.getenv(
        "RESEARCH_MODEL_ID",
        "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    )

settings = Settings()
