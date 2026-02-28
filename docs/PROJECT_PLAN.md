# Intelligent Sales Co-Pilot — Project Plan

> QuackHacks '26 | ADP Challenge: "Hack the Sales Journey with AI"

---

## What I Want to Build

I am building an **Intelligent Sales Co-Pilot** — a seamless, end-to-end support system for sales professionals. This isn't another CRM tool or a passive note-taker. It's a proactive partner that handles the cognitive heavy lifting **before**, **during**, and **after** a sales call.

It automates the "detective work" of pre-call research, provides high-utility intelligence in the heat of a live conversation, and ensures that no post-call detail ever falls through the cracks. The sales professional should feel like they have a senior researcher whispering in their ear — one who already knows everything about the client, listens to the entire conversation, and only speaks up when they have something genuinely valuable to say.

---

## The Core Problem

Sales professionals are currently forced to choose between being **"present"** in a conversation and being **"informed."** They face three primary points of friction:

1. **Information Overload**: Spending hours manually scraping LinkedIn profiles, company websites, and news articles for context before every call. This research is repetitive, time-consuming, and often incomplete.

2. **Context Switching**: Trying to look up competitor pricing, product specs, or market data while simultaneously trying to build rapport with a prospect. The moment you break eye contact to search for something, you lose the conversation.

3. **Administrative Debt**: The mental tax of remembering every action item, writing call summaries, and drafting follow-up plans once the call ends. This leads to lost data, missed opportunities, and incomplete CRM records.

---

## How It Will Work

The system operates in three distinct phases, coordinated by a central intelligence. A sales professional interacts with a single interface — a **client dashboard** — that orchestrates everything behind the scenes.

### The Client Dashboard

The entry point is a `/clients` page showing all qualified clients, sorted by upcoming meeting date and time. Each client card displays their name, meeting details, and basic profile information. Every card has two actions:

- **Research** — triggers the pre-call intelligence gathering
- **Join Meet** — opens the Google Meet link and simultaneously activates the live assistance system

**Where clients come from:** Clients are sourced from an upstream **AI caller system** — a separate, independent system that autonomously makes outbound calls to a lead list, asks qualifying questions, and only uploads the qualified prospects (those who agree to a follow-up meeting) into the `/clients` pipeline along with their basic info and scheduled meeting details. This AI caller is a separate system and is **out of scope** for this build, but the `/clients` dashboard is designed to receive its output. For the hackathon demo, clients can be manually seeded or pre-populated to simulate this pipeline.

### Phase 1: The Research Phase (Async, Pre-Call)

When the "Research" button is clicked, the system automatically and simultaneously:

- Pulls the client's **LinkedIn profile** (role, tenure, background)
- Gathers **company information** (size, industry, recent funding, leadership)
- Runs a **competitor analysis** relevant to the sales context
- Aggregates **recent news and activity** (press releases, product launches, social posts)

All of this raw data is processed through a **privacy layer that masks personally identifiable information** — phone numbers, email addresses, and other sensitive data are scrubbed before anything is stored or sent to an AI model. This is a hard requirement, not an afterthought.

The output is a concise, actionable **research summary** — ready and waiting on the client card by the time the salesperson joins the call.

### Phase 2: Live Assistance (Real-Time, During the Call)

When the "Join Meet" button is clicked, two things happen in parallel:

1. The salesperson joins their Google Meet call normally.
2. The system activates a **real-time listening and suggestion engine** that runs silently in the background.

This engine captures audio from both sides of the conversation — the salesperson's microphone and the meeting's speaker output — and transcribes it in real-time using **ElevenLabs Scribe V2**. Two separate audio streams are maintained to distinguish who is speaking (the salesperson vs. the client).

A lightweight **classifier** continuously monitors the rolling transcript. It acts as a gatekeeper — most of the time, it does nothing. But when it detects a moment that matters (a competitor is mentioned, a pricing objection is raised, a technical question comes up), it triggers the **main suggestion agent**.

This agent has access to specialized tools:

- **Web Search** — to pull current competitor pricing, market data, or recent news in real time
- **Product Context** — to retrieve specific internal product specifications and positioning
- **Client Research** — to reference the pre-call research already gathered in Phase 1

The agent generates a targeted suggestion and streams it to the UI as a non-intrusive overlay — a quiet, context-aware nudge that helps the salesperson respond with confidence without breaking their conversational flow.

The classifier is deliberately conservative. It only fires when the moment genuinely warrants it. No notification fatigue. No constant interruptions. Just high-signal assistance at the exact right moment.

### Phase 3: Post-Call Synthesis (Automatic, After the Call)

When the call ends, the classifier fires one final time, triggering the agent to generate:

- A **concise call summary** capturing the key discussion points
- A **checklist of next action items** with owners and deadlines where identifiable
- **Improvement suggestions** — specific, actionable feedback on how the salesperson can refine their pitch for next time

This output appears on the client card in the dashboard, closing the loop. No manual note-taking. No forgotten follow-ups. The CRM stays current automatically.

---

## The Experience I Want

I want the user to feel **exceptionally capable**. The interface should be:

- **Minimalist and non-intrusive** — it appears only when it has something valuable to contribute
- **Automatic** — the transition from research to live call should feel seamless, with all relevant context already loaded
- **Trustworthy** — the PII masking should be visible and demonstrable; the salesperson knows their client's sensitive data is protected
- **Fast** — research summaries in seconds, not minutes. Real-time suggestions that arrive while the topic is still being discussed, not after the moment has passed

During a call, the suggestions should feel like a "whisper in the ear" from a senior researcher who has been listening attentively and speaks up only when they can add genuine value.

---

## Essential Requirements

These are non-negotiable specifications for the system:

### Audio Intelligence
- **ElevenLabs Scribe V2** (Realtime WebSocket API) for high-accuracy, low-latency transcription (~150ms end-to-end). See the [Scribe V2 Realtime API documentation](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime) for the WebSocket protocol, message formats, and configuration options
- **Two separate audio streams** — microphone and speaker output — fed into two independent Scribe V2 WebSocket connections to achieve speaker attribution without complex diarization logic (Scribe V2 Realtime does not support native speaker diarization, so two streams is the workaround)
- **Browser-based audio capture** using the Web Media APIs (`getUserMedia` for mic, `getDisplayMedia` for meeting tab audio)
- **Backend WebSocket relay** — the browser must NOT connect directly to ElevenLabs (API key exposure risk). Audio flows: Browser → Backend WebSocket → ElevenLabs WebSocket. The backend also handles audio format transcoding since browser `MediaRecorder` outputs WebM/Opus but Scribe V2 Realtime expects PCM at 16kHz

### Modular Tooling
- **FastMCP (Python)** to build the MCP Server that exposes tools (Web Search, Product Context, Client Research) to the suggestion agent
- Tools are kept clean, focused, and extensible — each tool does one thing well

### Privacy-First Design
- **Microsoft Presidio** (open-source, MIT License) for PII detection and masking during the research and storage phase
- Pseudonymization with reversible mappings — the AI sees `PERSON_1` and `COMPANY_1`; the UI restores real names for display
- Sensitive client data (emails, phone numbers) never reaches the LLM in raw form

### Intelligent Triggers
- A dedicated **LLM classifier** (`llama-3.1-8b-instant` on Groq) that analyzes the rolling transcript and returns a structured JSON decision on whether to invoke the main suggestion agent
- The classifier is deliberately conservative — it only triggers the heavy agent when confidence exceeds a threshold (e.g., >0.85), avoiding notification fatigue
- It fires when actionable context is detected (competitor mentions, objections, technical questions, pricing discussions)
- **Transcript buffering**: The classifier does NOT run on every partial transcript fragment. Real-time transcripts contain stutters, half-sentences, and interruptions that would produce garbage triggers (e.g., "Yeah so their pri—" could be pricing, privacy, or principal). Instead, the classifier waits for a natural pause — using Scribe V2's VAD (Voice Activity Detection) commit signal, which fires when the speaker stops talking for a configurable silence threshold. This ensures the classifier always evaluates complete thoughts, significantly reducing false-positive triggers on the expensive suggestion agent
- **Example flow**: At minute `t`, a VAD commit arrives with a complete sentence. The classifier evaluates it and determines no action is needed — the conversation is still small talk. At minute `t+5`, a commit contains the client mentioning a competitor by name. The classifier fires with high confidence, the full updated live transcript is sent to the main suggestion agent, and the agent generates a suggestion that streams to the UI in real time. At the end of the call, the classifier always fires one final time to trigger the post-call analysis agent

### Speed
- **Groq** for all LLM inference — chosen specifically for its low-latency hardware
- **`llama-3.1-8b-instant`** for the classifier (needs to return a simple JSON decision in <300ms)
- **`llama-3.3-70b-versatile`** for the suggestion agent and post-call analysis (handles complex reasoning, tool orchestration, and nuanced sales context)
- Groq's **Local Tool Calling** mode — the Python backend orchestrates the agentic loop (send messages + tool definitions → model returns tool_calls → backend executes tools via MCP → appends results → repeats until final response). This gives full control over the loop, retry logic, and context injection rather than delegating to Groq's server-side Remote MCP

### Data Layer
- **Supabase (Postgres)** as the primary database
- Supabase Realtime for live transcript segment broadcasting to the UI via WebSocket
- Supabase pgvector for semantic search over historical calls and research data (RAG)
- The data model should roughly cover: clients and their profiles, research summaries per client, call records with start/end times and status, individual transcript segments (the hot table — high write frequency during live calls), post-call summaries with action items, and AI suggestions generated during live calls

### Architecture
- **Monorepo** with two main processes:
  - `web/` — Next.js frontend (client dashboard, live call UI, real-time suggestion overlay)
  - `backend/` — Single Python service (FastMCP server + classifier + suggestion agent + Presidio PII masking)

---

## Success Metrics

1. **Accuracy of Real-Time Hits**: How often the web search or product context tool provides the correct, relevant answer to a customer's objection or question — measured during live demo calls.

2. **Reduction in Prep Time**: The time a salesperson spends on pre-call research should drop from minutes to seconds. The research summary should be ready before the meeting starts.

3. **Follow-up Speed**: The time between the call ending and the "Next Action Items" being ready. Target: available within seconds of the call concluding, not minutes.

4. **Trigger Precision**: The classifier should have a low false-positive rate — suggestions should only appear when they are genuinely useful. A salesperson who gets irrelevant pop-ups will stop trusting the system.

5. **Demo Impact**: For the hackathon pitch, the system should visibly demonstrate the full loop — research → live call with a real suggestion triggered by a competitor mention → post-call summary — in a single, smooth demo flow.

---

## The Bigger Picture

While this is being built for sales professionals and the ADP challenge, the underlying architecture of **"Listen → Classify → Tool-Assisted Intervention"** is a blueprint for any high-stakes, real-time communication environment.

By mastering this pattern for sales, we are creating a framework for real-time AI assistance that can eventually be generalized to:

- **Customer Support** — real-time policy lookups and resolution suggestions during support calls
- **Project Management** — meeting intelligence that captures decisions and auto-creates tickets
- **Live Technical Coaching** — an assistant that detects when a student is struggling and provides contextual hints
- **Medical Consultations** — real-time clinical guideline retrieval during patient interactions (with appropriate compliance)

The initial outreach phase — an AI caller that autonomously contacts leads, qualifies them through a scripted conversation, and feeds qualified prospects into the `/clients` pipeline — is a separate system that feeds into this one. It is **out of scope** for the hackathon build but represents the natural upstream extension. Together, outreach + co-pilot would form a complete autonomous sales pipeline from first contact to closed deal.

---

## User Flow Summary

```
/clients (Dashboard)
    │
    ├── [Client Card] — Name, Meeting Details, Research Summary
    │       │
    │       ├── [Research Button]
    │       │       └── Triggers async parallel research agents
    │       │           ├── LinkedIn scrape
    │       │           ├── Company info
    │       │           ├── Competitor analysis
    │       │           └── Recent news/activity
    │       │               └── PII masked → Summary generated → Saved to card
    │       │
    │       └── [Join Meet Button]
    │               ├── Opens Google Meet
    │               └── Activates Live Assistance System
    │                       ├── Mic audio stream → Scribe V2 (WebSocket 1)
    │                       ├── Speaker audio stream → Scribe V2 (WebSocket 2)
    │                       ├── Combined transcript → Classifier (continuous)
    │                       │       ├── No action needed → Continue listening
    │                       │       └── Trigger detected → Main Suggestion Agent
    │                       │               ├── Web Search tool
    │                       │               ├── Product Context tool
    │                       │               └── Client Research tool
    │                       │                   └── Suggestion → Streamed to UI overlay
    │                       └── Call ends → Post-Call Agent triggered
    │                               ├── Call summary
    │                               ├── Action items checklist
    │                               └── Improvement suggestions
    │                                   └── Saved to client card on /clients
    │
    └── [Next Client Card] ...
```
