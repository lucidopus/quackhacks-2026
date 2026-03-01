import asyncio
import json
import uuid
import logging
from app.services.suggestion_agent import SuggestionAgent
from app.database import get_supabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_brevity():
    print("🚀 Verifying Suggestion Brevity & Quality...")
    
    # Mock data
    call_id = f"brevity-test-{uuid.uuid4().hex[:6]}"
    client_id = "some-client-id"
    trigger_type = "competitor_mention"
    
    recent_segments = [
        {"speaker": "client", "text": "We are currently using Chorus and paying about $1,400 per person. We have 50 people. Does ADP integrate with SAP SuccessFactors?"}
    ]
    
    classification = {
        "reasoning": "The client mentioned Chorus (competitor) and asked about SAP integration and pricing."
    }

    class MockWS:
        async def send_json(self, data):
            if data.get('type') == 'suggestion_content':
                print(f"\n💡 [AI SUGGESTION CONTENT]:\n{data.get('content')}")
                print(f"\n✅ Status: {data.get('status')}")
                
    agent = SuggestionAgent(client_ws=MockWS())
    
    print("\n⏳ Generating suggestion (expecting ultra-concise Battlecard)...")
    await agent.generate(
        suggestion_id="test-id",
        call_id=call_id,
        client_id=client_id,
        trigger_type=trigger_type,
        recent_segments=recent_segments,
        classification=classification
    )

if __name__ == "__main__":
    asyncio.run(verify_brevity())
