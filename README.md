# 🦆 Wingman (QuackHacks '26)

> **AI-powered real-time sales assistance — from initial lead qualification to post-call synthesis.**
>
> Built for the ADP Challenge: *"Hack the Sales Journey with AI"*

Wingman is a full-stack, AI-first system designed to solve the sales journey end-to-end. It eliminates time wasted on unqualified leads, automates tedious pre-call research, assists the rep live on the call, and ensures follow-ups are executed effortlessly.

---

## ✨ Features

1. **AI Lead Qualification Caller:** An automated voice-to-voice AI makes initial outreach, engaging in natural conversations to gauge interest and qualify leads before a human rep ever gets involved.
2. **Pre-Call Research Pipeline:** A multi-agent system automatically compiles a concise briefing on the client from LinkedIn, news, and financials with a single click.
3. **Live Call Assistance:** Real-time dual-stream audio transcription combined with a VAD-gated AI classifier triggers context-aware suggestions (competitor rebuttals, product specs, pricing) during live calls.
4. **Post-Call Synthesis:** Instantly auto-generates call summaries, action items, and coaching feedback the moment the call ends.

---

## 🏗️ Architecture

- **Frontend:** Next.js 16, Tailwind CSS, TypeScript
- **Backend:** FastAPI, Python
- **AI/LLMs:** Groq (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`)
- **Audio/Voice:** ElevenLabs Scribe V2
- **Database & Realtime:** Supabase (Postgres, pgvector, Realtime WebSockets)
- **Privacy/Security:** Microsoft Presidio (PII masking)
- **Agent Tooling:** FastMCP, Tavily, Firecrawl

---

## 🚀 Quick Start

Ensure you have Node.js and Python installed. You will also need a Supabase project and API keys for Groq, ElevenLabs, Firecrawl, and Tavily.

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env 
# Edit .env with your LLM/Audio/Supabase API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (Next.js)

```bash
cd frontend
npm install

# Run the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 🛠️ Configuration & Environment Variables

Make sure to configure the following keys in your backend `.env` file:

- `GROQ_API_KEY`: For fast LLM inference.
- `ELEVENLABS_API_KEY`: For audio transcription and VAD.
- `FIRECRAWL_API_KEY` & `TAVILY_API_KEY`: For the pre-call research agent tools.
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: For database access and realtime subscriptions.

*Note: Ensure Supabase Realtime is enabled on the `transcripts` and `suggestions` tables for live call features to work correctly.*

---

*Built by the lucidopus team for QuackHacks '26.*
