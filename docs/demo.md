# Intelligent Sales Co-Pilot — Demo Guide

> **QuackHacks '26 | ADP Challenge: "Hack the Sales Journey with AI"**  
> Track: *Hack the Sales Journey with AI — Build a full stack AI-powered solution that helps sales teams remember and execute follow-ups effortlessly*

---

## 1. Elevator Pitch (30 seconds)

> "Sales reps spend hours on pre-call research, then lose that context the moment a client asks something unexpected mid-call. Our Intelligent Sales Co-Pilot solves all three stages of the problem: it researches clients automatically before the call, whispers in the rep's ear in real-time during the call, and writes the follow-up summary the moment the call ends. It's a full-stack, AI-first system — not another CRM bolt-on."

---

## 2. What We Built

A three-phase AI co-pilot for sales professionals, built on top of the ADP product catalog:

| Phase | What It Does |
|---|---|
| **Pre-Call Research** | Multi-agent pipeline auto-researches the client (LinkedIn, company news, competitors, financials) and surfaces a concise briefing on the client card |
| **Live Call Assistance** | Real-time dual-stream audio transcription + AI classifier that triggers context-aware suggestions (competitor rebuttals, product specs, pricing) exactly when needed |
| **Post-Call Synthesis** | Automatic call summary, action-item checklist, and coaching feedback generated the moment the call ends |

**Stack:** Next.js 16 · FastAPI · Groq (LLaMA 3.3-70B) · ElevenLabs Scribe V2 · Supabase (Postgres + Realtime + pgvector) · Microsoft Presidio (PII masking) · FastMCP · Tavily · Firecrawl

---

## 3. Demo Pre-Checks

Before starting the demo, confirm all of the following:

- [ ] Backend running on `:8000` → `uvicorn app.main:app --reload --port 8000`
- [ ] Frontend running on `:3000` → `cd frontend && npm run dev`
- [ ] `.env` has valid keys: `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Supabase Realtime is enabled on the `transcripts` and `suggestions` tables
- [ ] Client **Sarah Chen / TechFlow Inc** is seeded in the database
- [ ] Browser has microphone permission granted
- [ ] Open http://localhost:3000/clients in the demo browser tab

---

## 4. Demo Walkthrough

### Step 1 — Client Dashboard (30 seconds)

**Show:** `http://localhost:3000/clients`

- Walk through the client card for **Sarah Chen, VP of Engineering @ TechFlow Inc**
- Highlight: meeting date/time, client role, the two CTA buttons (**Research** and **Join Meet**)

> **Talk track:** "This is where a sales rep's day starts. Clients are piped in from an upstream AI caller that qualifies leads automatically. The rep sees who they're talking to, when, and can trigger research with one click."

---

### Step 2 — Pre-Call Research (60–90 seconds)

**Action:** Click **Research** on Sarah Chen's card

- A modal opens showing the research pipeline running: Company Info → LinkedIn → News → Competitors → Financials → Tech Stack → Summary
- Wait ~20-30 seconds for the summary to appear
- Show the final briefing: company background, key people, recent news, competitive context

> **Talk track:** "Seven specialized AI agents run in parallel. Each one uses live web search or structured data extraction. A PII masking layer — built on Microsoft Presidio — strips sensitive identifiers before anything touches an LLM. The rep gets a crisp briefing, ready before the call starts."

**Key points to highlight:**
- Multi-agent architecture (not a single prompt dump)
- PII masking is a hard requirement — show that it's in the pipeline
- Results are stored in Supabase for the suggestion agent to reference during the live call

---

### Step 3 — Live Call Assistance (3–4 minutes)

**Action:** Click **Join Meet** to open the live call interface

- Two audio capture streams activate (mic + speaker tab audio)
- The transcript panel is live and empty

Now read the demo script below. After each trigger line, **pause and wait for the AI suggestion to appear** before continuing.

---

#### Script

**[SALESPERSON]:** Hi Sarah, this is Harshil calling from ADP. How are you doing today?

**[CLIENT]:** Hey Harshil! I'm doing well. How about you?

**[SALESPERSON]:** Great! I wanted to follow up on your team's expansion and how you're currently handling payroll.

---

**[CLIENT]:** Yeah, so we just finished onboarding **Chorus** for our sales team. It's decent for transcription, but we're still looking for something better on the HR and payroll side.

**[SALESPERSON]:** Interesting — you're using Chorus. Tell me more about that.

**[CLIENT]:** The main issue is cost. Chorus is charging us about **fourteen hundred dollars per user**, and with the team growing to 50 people next month, that's getting really steep.

> ⏳ **Wait for suggestion** — expected: Chorus pricing comparison, ADP competitive advantage

---

**[SALESPERSON]:** ADP offers volume pricing that could save you significantly. What features are you looking for beyond payroll?

**[CLIENT]:** Payroll for sure, but also benefits admin, time tracking, and talent management. Everything in one platform instead of cobbling tools together.

**[SALESPERSON]:** That sounds like **ADP Workforce Now** — our all-in-one HCM platform covering payroll, benefits, time, and talent in a single system.

> ⏳ **Wait for suggestion** — expected: Workforce Now feature list, pricing tiers, TCO comparison

---

**[CLIENT]:** That sounds promising. One important thing — we use **SAP SuccessFactors** for employee data. Can ADP integrate with that?

**[SALESPERSON]:** Absolutely. ADP Workforce Now has a native SAP SuccessFactors integration. Let me pull up the details...

> ⏳ **Wait for suggestion** — expected: SAP SuccessFactors native integration, auto-sync details

---

**[CLIENT]:** We also looked at **Gusto** briefly. Some colleagues recommended it — simpler, more transparent on pricing.

**[SALESPERSON]:** Fair point. Gusto is great for very small teams, but there are some important differences I should point out...

> ⏳ **Wait for suggestion** — expected: Gusto limitations at scale, ADP mid-market positioning

---

**[CLIENT]:** My biggest concern is **implementation**. We've heard horror stories about payroll migrations taking months. How long does ADP take to set up?

**[SALESPERSON]:** That's a really common concern. ADP has streamlined implementation significantly...

> ⏳ **Wait for suggestion** — expected: implementation timeline, dedicated support, migration tooling

---

**[SALESPERSON]:** Based on everything we discussed, I think ADP Workforce Now with the SAP integration is the perfect fit. Would you be interested in a live demo next week?

**[CLIENT]:** I'd love that. Can you send a proposal with pricing for 50 users?

**[SALESPERSON]:** Absolutely — I'll have that to you by end of day. Thanks, Sarah!

**[CLIENT]:** Thank you, Harshil. Talk soon!

---

### Step 4 — Post-Call Synthesis (30–45 seconds)

**Action:** Click **End Call**

- Navigate to `http://localhost:3000/clients/[id]/insights`
- Show the auto-generated output:
  - **Call Summary** — key discussion points in bullet form
  - **Action Items** — next steps with owners (e.g., "Send pricing proposal for 50 users")
  - **Coaching Notes** — specific improvement suggestions for the rep

> **Talk track:** "The moment the call ends, the same agent that powered the live suggestions writes the follow-up. No rep ever has to type a call summary again. Action items are extracted automatically. This directly solves ADP's challenge — helping sales teams remember and execute follow-ups effortlessly."

---

## 5. Architecture Callouts (for technical judges)

| Decision | Why |
|---|---|
| **Dual audio streams** | Separate mic and speaker capture enables speaker attribution without server-side diarization |
| **VAD-gated classifier** | Classifier only runs on complete utterances (ElevenLabs VAD commit signal), not partials — avoids false positives |
| **Groq inference** | `llama-3.1-8b-instant` for low-latency classification; `llama-3.3-70b-versatile` for high-quality suggestion generation |
| **MCP tools** | Suggestion agent calls Web Search, Product Context, and Client Research as structured tools — not a single stuffed prompt |
| **PII masking** | Presidio detects and pseudonymizes sensitive data before any LLM call; UI restores real names from the mapping |
| **pgvector RAG** | Research summaries are vectorized and stored in Supabase; suggestion agent uses semantic search to retrieve relevant context |
| **Supabase Realtime** | Transcript words and suggestions push to the frontend via WebSocket — no polling |

---

## 6. Judging Criteria Alignment

| ADP Criterion | How We Address It |
|---|---|
| **AI-powered follow-up** | Post-call synthesis auto-generates summaries, action items, and coaching notes instantly |
| **Full-stack implementation** | Next.js frontend + FastAPI backend + Supabase DB + Realtime + pgvector |
| **Practical innovation** | Solves a real rep pain point — no more context-switching or missed follow-ups |
| **Technical depth** | Multi-agent research pipeline, real-time audio processing, MCP tool architecture, PII compliance |
| **Demo-ability** | End-to-end flow is live and demoed in ~5 minutes with a realistic call scenario |

---

## 7. Verification Checklist (run before presenting)

```bash
# Backend import check
cd backend && source venv/bin/activate && python -c "import app.main; print('✅ Backend OK')"

# Frontend type check
cd frontend && npx tsc --noEmit
```

| Feature | Expected Behavior |
|---|---|
| Transcription | Messages appear in real-time, partials resolve to finals, no duplicates |
| Speaker labels | Salesperson and Client correctly attributed |
| Classifier triggers | 3–5 triggers across the demo call (competitor, pricing, tech, objection) |
| Suggestion content | Real product data: pricing numbers, feature names, integration specs |
| Suggestion stacking | Latest suggestion tagged "LATEST", previous ones dimmed |
| Timing | Suggestions appear within 5–15 seconds of trigger utterance |
| Post-call insights | Summary, action items, and coaching notes generated within 30 seconds of ending call |

---

*Built for QuackHacks '26 — ADP Challenge*
