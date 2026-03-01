# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Intelligent Sales Co-Pilot** — an AI-powered real-time sales assistance system for QuackHacks '26 (ADP Challenge). Three phases: pre-call research, live conversation intelligence with real-time suggestions, and post-call synthesis.

## Monorepo Structure

- `frontend/` — Next.js 16 app (React 19, TypeScript, Tailwind CSS v4, App Router at `src/app/`)
- `backend/` — Python FastAPI service (uvicorn, pydantic)
- `docs/PROJECT_PLAN.md` — detailed product spec and architecture decisions
- `research/` — reference PDFs (not code)

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev          # starts on :3000
npm run build        # production build
npm run lint         # eslint
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then fill in keys
uvicorn app.main:app --reload --port 8000
```

### Required Environment Variables (backend/.env)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`

## Architecture Decisions

- **LLM inference via Groq** — `llama-3.1-8b-instant` for the real-time classifier, `llama-3.3-70b-versatile` for the suggestion agent and post-call analysis. Uses Groq's Local Tool Calling mode (backend orchestrates the agentic loop).
- **Audio transcription** — ElevenLabs Scribe V2 Realtime WebSocket API. Two separate audio streams (mic + speaker) for speaker attribution. Audio routes through the backend (browser → backend WebSocket → ElevenLabs) to avoid API key exposure. Backend handles WebM/Opus → PCM 16kHz transcoding.
- **Classifier trigger strategy** — does NOT run on every partial transcript. Waits for Scribe V2 VAD commit signals (complete utterances) to avoid false positives on half-sentences. Only triggers the suggestion agent when confidence > 0.85.
- **PII masking** — Microsoft Presidio for detection/masking during research. Pseudonymization with reversible mappings (AI sees `PERSON_1`, UI restores real names).
- **MCP tools** — FastMCP (Python) exposes Web Search, Product Context, and Client Research tools to the suggestion agent.
- **Database** — Supabase (Postgres) with Realtime for live transcript broadcasting and pgvector for semantic search/RAG.
- **CORS** — backend allows `http://localhost:3000` (frontend dev server).

## Important Constraints

- Never do a `supabase db reset` without explicit user approval.
- PII masking is a hard requirement — sensitive client data must never reach an LLM in raw form.
- The upstream AI caller system is out of scope; clients are seeded/pre-populated for demo purposes.

## ⚠️ MANDATORY: Programmatic Verification After Every Change

**You MUST run these verification commands after ANY code change, BEFORE presenting results to the user.** Do NOT skip this step. Fix any errors before reporting success.

### Frontend changes
```bash
cd frontend && yarn tsc --noEmit
```
If this fails, fix the TypeScript errors before proceeding.

### Backend changes
```bash
cd backend && source venv/bin/activate && python -c "import app.main; print('✅ Backend OK')"
```
If this fails, fix the Python import/syntax errors before proceeding.

### Cross-cutting changes (both frontend + backend)
Run BOTH commands above.

### After modifying `audio_relay.py` specifically
```bash
cd backend && source venv/bin/activate && python -c "import app.websocket.audio_relay; print('✅ audio_relay OK')"
```

### After modifying Supabase data (products, clients, etc.)
```bash
cd backend && source venv/bin/activate && python -c "
from app.database import get_supabase
sb = get_supabase()
# Verify the table you changed — e.g.:
result = sb.table('products').select('key, name').execute()
print(f'✅ Products: {len(result.data)} records')
"
```

**If any check fails, you must fix the error and re-run verification. Never tell the user "it's deployed" if verification hasn't passed.**
