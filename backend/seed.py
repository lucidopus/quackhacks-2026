from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# We need the service role key to bypass RLS or write safely
supabase_url: str = os.getenv("SUPABASE_URL", "")
supabase_key: str = os.getenv("SUPABASE_SECRET_KEY", "")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

clients = [
    {
        "name": "Sarah Chen",
        "company": "TechFlow Inc",
        "role": "VP of Engineering",
        "email": "sarah.chen@techflow.com",
        "phone": "+1-555-0101",
        "meeting_date": "2026-03-05",
        "meeting_time": "14:30:00",
        "meeting_link": "https://meet.google.com/abc-defg-hij",
        "profile_data": {"source": "outreach_ai", "qualified": True, "interest_level": "high"}
    },
    {
        "name": "Marcus Rodriguez",
        "company": "DataVault Systems",
        "role": "CTO",
        "email": "m.rodriguez@datavault.io",
        "phone": "+1-555-0102",
        "meeting_date": "2026-03-05",
        "meeting_time": "16:00:00",
        "meeting_link": "https://meet.google.com/klm-nopq-rst",
        "profile_data": {"source": "outreach_ai", "qualified": True, "interest_level": "medium"}
    },
    {
        "name": "Priya Patel",
        "company": "CloudScale Analytics",
        "role": "Head of Product",
        "email": "priya@cloudscale.co",
        "phone": "+1-555-0103",
        "meeting_date": "2026-03-06",
        "meeting_time": "10:00:00",
        "meeting_link": "https://meet.google.com/uvw-xyz-123",
        "profile_data": {"source": "outreach_ai", "qualified": True, "interest_level": "high"}
    },
    {
        "name": "James O'Brien",
        "company": "FinEdge Capital",
        "role": "Director of Operations",
        "email": "jobrien@finedge.com",
        "phone": "+1-555-0104",
        "meeting_date": "2026-03-07",
        "meeting_time": "11:30:00",
        "meeting_link": "https://meet.google.com/456-789-abc",
        "profile_data": {"source": "outreach_ai", "qualified": True, "interest_level": "medium"}
    }
]

def seed_database():
    print("Seeding demo clients into Supabase...")
    try:
        # Check if they already exist to prevent duplicates
        existing = supabase.table("clients").select("id").execute()
        if existing.data and len(existing.data) > 0:
            print("Database already contains clients. Skipping seed.")
            return

        response = supabase.table("clients").insert(clients).execute()
        print(f"Successfully inserted {len(response.data)} clients!")
    except Exception as e:
        print(f"Error seeding database: {e}")

if __name__ == "__main__":
    seed_database()
