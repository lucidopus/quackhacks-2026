# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory.

## Stack

- Python with FastAPI, Pydantic v2, uvicorn
- Entry point: `app/main.py` (`app` is the FastAPI instance)

## Commands

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Defined in `.env` (copy from `.env.example`):
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — database
- `GROQ_API_KEY` — LLM inference
- `ELEVENLABS_API_KEY` — Scribe V2 transcription
- `FIRECRAWL_API_KEY` — web scraping for research
- `TAVILY_API_KEY` — web search tool

## Architecture

- **CORS** — allows `http://localhost:3000` (frontend dev server)
- **Health check** — `GET /health`

### Planned Components

- **WebSocket relay** — receives browser audio, transcodes WebM/Opus to PCM 16kHz, forwards to ElevenLabs Scribe V2 WebSocket. Two separate connections (mic stream + speaker stream) for speaker attribution.
- **Classifier** — `llama-3.1-8b-instant` on Groq. Evaluates complete utterances (on VAD commit signals, not partial fragments). Returns structured JSON decision. Fires suggestion agent only when confidence > 0.85.
- **Suggestion agent** — `llama-3.3-70b-versatile` on Groq with Local Tool Calling. Backend orchestrates the agentic loop (messages + tool definitions → tool_calls → execute via MCP → append results → repeat).
- **MCP Server** — FastMCP exposing Web Search (Tavily), Product Context, and Client Research tools.
- **PII masking** — Microsoft Presidio. Pseudonymization with reversible mappings before any data reaches an LLM.
- **Data layer** — Supabase Postgres with Realtime (transcript broadcasting) and pgvector (semantic search/RAG).

## Important Constraints

- Never do a `supabase db reset` without explicit user approval.
- Sensitive client data (emails, phone numbers) must be PII-masked before LLM inference.
- Browser must NOT connect directly to ElevenLabs — all audio routes through this backend.

## ⚠️ MANDATORY: Verification After Every Change

**You MUST run these checks after ANY backend code change, BEFORE presenting results to the user.**

```bash
# General backend syntax check
cd backend && source venv/bin/activate && python -c "import app.main; print('✅ Backend OK')"

# After modifying audio_relay.py
python -c "import app.websocket.audio_relay; print('✅ audio_relay OK')"

# After modifying classifier.py or suggestion_agent.py
python -c "import app.services.classifier; import app.services.suggestion_agent; print('✅ Services OK')"

# After modifying call_manager.py
python -c "import app.services.call_manager; print('✅ CallManager OK')"
```

**Fix all errors before reporting success. Never say "it's deployed" if verification hasn't passed.**
