import asyncio
from app.services.post_call_agent import generate_insights
from app.database import get_supabase

async def test():
    # Find a call with a completed transcript
    supabase = get_supabase()
    calls = supabase.table("calls").select("id, client_id").limit(1).execute()
    if not calls.data:
        print("No calls found to test.")
        return
        
    call_id = calls.data[0]["id"]
    client_id = calls.data[0]["client_id"]
    print(f"Testing Gemini analysis on Call {call_id}...")
    
    result = await generate_insights(call_id, client_id)
    print("\n--- GEMINI RESULT ---")
    import json
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test())
