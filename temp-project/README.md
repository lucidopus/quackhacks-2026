# 🎯 Sales Copilot — Company Intelligence

A multi-agent AI system that researches any company and produces a comprehensive sales brief, ready before your next discovery call.

Built with **Amazon Bedrock** + **Strands Agents** + **FastAPI** + **React**.

---

## What It Does

Enter a company name and get a full sales brief in 2–4 minutes:

| Section | What's included |
|---|---|
| 🏢 Company Snapshot | Website, industry, founding year, HQ, size, public/private |
| ⚡ TL;DR | 3-bullet executive summary |
| 💰 Financial Health | Revenue/ARR, funding stage, growth trajectory, budget signal |
| 🚀 Recent Developments | Last 18 months of news, funding, product launches, leadership changes |
| 👥 Key Decision Makers | Executives + buying committee (Economic Buyer, Technical Buyer, Champion) |
| 🛠 Tech Landscape | Cloud providers, tools, integrations, tech sophistication |
| ⚔️ Competitive Position | Top competitors, market position, win/loss themes |
| 🎯 Sales Talking Points | Pain points, opening hooks, value prop alignment, risks |
| 📊 Account Score | Strategic fit, budget, momentum, tech compat, DM access |
| ✅ Next Steps | 3 specific recommended actions |

---

## Architecture

```
Frontend (React + Vite)
    │
    │  POST /research  (streaming NDJSON)
    │
FastAPI Server
    │
    └── SalesCopilotOrchestrator
          │
          ├── Stage 1 (sequential)
          │     └── CompanyDiscoveryAgent   ← finds website, LinkedIn, industry
          │
          ├── Stage 2 (all 6 in PARALLEL)
          │     ├── WebsiteCrawlerAgent     ← products, pricing, team, positioning
          │     ├── NewsAgent               ← funding, launches, leadership changes
          │     ├── FinancialAgent          ← revenue, ARR, funding, headcount
          │     ├── PeopleAgent             ← executives, buying committee
          │     ├── TechAgent               ← cloud, stack, tools, job signals
          │     └── CompetitiveAgent        ← competitors, G2/Gartner, positioning
          │
          └── Stage 3 (sequential)
                └── SummarizerAgent         ← synthesizes into sales brief
```

Each agent uses:
- `search_web()` — DuckDuckGo search (no API key required)
- `fetch_web_page()` — HTTP fetch + HTML cleaning
- `extract_page_links()` — link extraction for deep crawling
- `fetch_multiple_pages()` — parallel multi-page crawl

All agents run on **Amazon Bedrock** via the **Strands** framework.

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 18+
- AWS credentials with Bedrock access
- Bedrock model access: `claude-3-5-sonnet` (cross-region inference profile)

### 2. Backend

```bash
# From the sales-copilot directory
cp .env.example .env
# Edit .env — set MODEL_ID and AWS_REGION

pip install -r requirements.txt

# Start the backend
uvicorn backend.server:app --host 0.0.0.0 --port 8080 --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `MODEL_ID` | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | Bedrock model to use |
| `AWS_REGION` | `us-east-1` | AWS region |
| `PORT` | `8080` | Backend port |

---

## API

### `POST /research`

```json
{
  "company_name": "Snowflake",
  "seller_context": "We sell cloud cost optimization tools"
}
```

Returns a streaming NDJSON response. Each line is a JSON object:

```json
{"event": "status", "agent": "discovery", "status": "started", "message": "..."}
{"event": "status", "agent": "news", "status": "completed", "message": "...", "data": {...}}
{"event": "heartbeat", "message": "Agents working in parallel..."}
{"event": "final_report", "report": {...}, "metadata": {...}, "elapsed_seconds": 142.3}
{"event": "error", "message": "..."}
```

---

## Tech Stack

- **Backend**: Python, FastAPI, Strands Agents, Amazon Bedrock (Claude 3.5 Sonnet)
- **Search**: DuckDuckGo (no API key needed via `duckduckgo-search`)
- **Frontend**: React 18, Vite, Tailwind CSS, React Markdown
- **Streaming**: NDJSON over HTTP streaming

---

## Project Structure

```
sales-copilot/
├── backend/
│   ├── agents/
│   │   ├── discovery_agent.py      # Company URL discovery
│   │   ├── website_crawler_agent.py # Deep website crawl
│   │   ├── news_agent.py           # Recent news & events
│   │   ├── financial_agent.py      # Revenue, funding, metrics
│   │   ├── people_agent.py         # Executives & buying committee
│   │   ├── tech_agent.py           # Tech stack intelligence
│   │   ├── competitive_agent.py    # Competitive landscape
│   │   └── summarizer_agent.py     # Final brief synthesis
│   ├── tools/
│   │   └── web_tools.py            # search_web, fetch_web_page, extract_page_links
│   ├── prompts/
│   │   └── *.py                    # One prompt file per agent
│   ├── orchestrator.py             # Pipeline coordination
│   └── server.py                   # FastAPI app
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Header.jsx
│           ├── CompanySearch.jsx   # Search form + example companies
│           ├── AgentTimeline.jsx   # Real-time agent status
│           └── CompanyReport.jsx   # Final report display
├── requirements.txt
├── .env.example
└── README.md
```
