import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timedelta

load_dotenv()

supabase_url: str = os.getenv("SUPABASE_URL", "")
supabase_key: str = os.getenv("SUPABASE_SECRET_KEY", "")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def get_relative_date(days_offset):
    return (datetime.now() + timedelta(days=days_offset)).strftime("%Y-%m-%d")

# Desired mappings based on email to ensure idempotency
updates = {
    "sarah.chen@techflow.com": get_relative_date(0),
    "m.rodriguez@datavault.io": get_relative_date(0),
    "priya@cloudscale.co": get_relative_date(1),
    "jobrien@finedge.com": get_relative_date(2),
    "ken.krupa@chubb.com": get_relative_date(3),
}

def migrate_dates():
    print("Migrating dates to be relative to today...")
    try:
        for email, new_date in updates.items():
            response = supabase.table("clients").update({"meeting_date": new_date}).eq("email", email).execute()
            if response.data:
                 print(f"Updated {email} to {new_date}")
            else:
                 print(f"No record found for {email}, skipping.")
        print("Migration complete!")
    except Exception as e:
        print(f"Error migrating dates: {e}")

if __name__ == "__main__":
    migrate_dates()
