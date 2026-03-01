"""
Sales Copilot Orchestrator — coordinates all specialist agents to build
a comprehensive company intelligence sales brief.

Pipeline:
  Stage 1: Company Discovery (sequential — seeds all other agents)
  Stage 2: Website Crawl + News + Financial + People + Tech + Competitive
           (all 6 run in parallel for maximum speed)
  Stage 3: Summarizer (sequential — needs all inputs)
"""

import asyncio
import json
import logging
import time
from typing import AsyncIterator, Optional

from backend.agents.discovery_agent import CompanyDiscoveryAgent
from backend.agents.website_crawler_agent import WebsiteCrawlerAgent
from backend.agents.news_agent import NewsAgent
from backend.agents.financial_agent import FinancialAgent
from backend.agents.people_agent import PeopleAgent
from backend.agents.tech_agent import TechAgent
from backend.agents.competitive_agent import CompetitiveAgent
from backend.agents.summarizer_agent import SummarizerAgent

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 8  # seconds between keepalive pings
AGENT_TIMEOUT = 90  # seconds per agent before giving up (kept short to stay fast)


class SalesCopilotOrchestrator:
    """
    Orchestrates the full company intelligence pipeline.
    Runs discovery first, then 6 specialist agents in parallel,
    then synthesizes everything into a sales brief.
    """

    def __init__(self, model_id: str, region: str):
        self.model_id = model_id
        self.region = region

        # Lazy-initialized agents
        self._discovery: Optional[CompanyDiscoveryAgent] = None
        self._crawler: Optional[WebsiteCrawlerAgent] = None
        self._news: Optional[NewsAgent] = None
        self._financial: Optional[FinancialAgent] = None
        self._people: Optional[PeopleAgent] = None
        self._tech: Optional[TechAgent] = None
        self._competitive: Optional[CompetitiveAgent] = None
        self._summarizer: Optional[SummarizerAgent] = None

    # ── Lazy agent accessors ──────────────────────────────────────────────────

    def _get_discovery(self) -> CompanyDiscoveryAgent:
        if not self._discovery:
            self._discovery = CompanyDiscoveryAgent(self.model_id, self.region)
        return self._discovery

    def _get_crawler(self) -> WebsiteCrawlerAgent:
        if not self._crawler:
            self._crawler = WebsiteCrawlerAgent(self.model_id, self.region)
        return self._crawler

    def _get_news(self) -> NewsAgent:
        if not self._news:
            self._news = NewsAgent(self.model_id, self.region)
        return self._news

    def _get_financial(self) -> FinancialAgent:
        if not self._financial:
            self._financial = FinancialAgent(self.model_id, self.region)
        return self._financial

    def _get_people(self) -> PeopleAgent:
        if not self._people:
            self._people = PeopleAgent(self.model_id, self.region)
        return self._people

    def _get_tech(self) -> TechAgent:
        if not self._tech:
            self._tech = TechAgent(self.model_id, self.region)
        return self._tech

    def _get_competitive(self) -> CompetitiveAgent:
        if not self._competitive:
            self._competitive = CompetitiveAgent(self.model_id, self.region)
        return self._competitive

    def _get_summarizer(self) -> SummarizerAgent:
        if not self._summarizer:
            self._summarizer = SummarizerAgent(self.model_id, self.region)
        return self._summarizer

    # ── Async wrappers (run sync agents in thread pool) ───────────────────────

    async def _run_with_timeout(self, name: str, coro) -> tuple[str, dict]:
        """Run a coroutine with a timeout and return (name, result)."""
        result = await asyncio.wait_for(coro, timeout=AGENT_TIMEOUT)
        return (name, result)

    async def _run_discovery(self, company_name: str) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "discovery",
            loop.run_in_executor(None, self._get_discovery().discover, company_name),
        )

    async def _run_crawler(
        self, website_url: str, company_name: str, key_pages: list
    ) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "website",
            loop.run_in_executor(
                None, self._get_crawler().crawl, website_url, company_name, key_pages
            ),
        )

    async def _run_news(self, company_name: str, industry: str) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "news",
            loop.run_in_executor(
                None, self._get_news().analyze, company_name, industry
            ),
        )

    async def _run_financial(
        self, company_name: str, crunchbase_url: str, company_type: str
    ) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "financial",
            loop.run_in_executor(
                None,
                self._get_financial().analyze,
                company_name,
                crunchbase_url,
                company_type,
            ),
        )

    async def _run_people(
        self, company_name: str, website_url: str, linkedin_url: str
    ) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "people",
            loop.run_in_executor(
                None,
                self._get_people().analyze,
                company_name,
                website_url,
                linkedin_url,
            ),
        )

    async def _run_tech(self, company_name: str, website_url: str) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "tech",
            loop.run_in_executor(
                None, self._get_tech().analyze, company_name, website_url
            ),
        )

    async def _run_competitive(
        self, company_name: str, industry: str
    ) -> tuple[str, dict]:
        loop = asyncio.get_running_loop()
        return await self._run_with_timeout(
            "competitive",
            loop.run_in_executor(
                None, self._get_competitive().analyze, company_name, industry, ""
            ),
        )

    # ── Main pipeline ─────────────────────────────────────────────────────────

    async def research_company(
        self,
        company_name: str,
        seller_context: str = "",
    ) -> AsyncIterator[dict]:
        """
        Full company research pipeline with streaming status updates.

        Args:
            company_name: Name of the company to research
            seller_context: Optional description of what the seller is selling
                           (used by summarizer to tailor talking points)

        Yields:
            Status update dicts and the final_report dict
        """
        start_time = time.time()
        company_name = company_name.strip()

        # ─── Stage 1: Company Discovery ──────────────────────────────────────
        yield {
            "event": "status",
            "agent": "discovery",
            "status": "started",
            "message": f"Discovering digital presence for '{company_name}'...",
        }

        loop = asyncio.get_running_loop()
        discovery_future = asyncio.ensure_future(self._run_discovery(company_name))

        discovery_data = None
        try:
            while True:
                done, _ = await asyncio.wait(
                    {discovery_future}, timeout=HEARTBEAT_INTERVAL
                )
                if done:
                    _, discovery_data = discovery_future.result()
                    break
                yield {"event": "heartbeat", "message": "Discovering company..."}
        except Exception as e:
            logger.error(f"Discovery failed: {e}")
            discovery_data = {"company_name": company_name, "error": str(e)}
            yield {
                "event": "status",
                "agent": "discovery",
                "status": "partial",
                "message": f"Discovery had issues — continuing with limited data",
            }

        website_url = (discovery_data or {}).get("official_website") or ""
        linkedin_url = (discovery_data or {}).get("linkedin_url") or ""
        crunchbase_url = (discovery_data or {}).get("crunchbase_url") or ""
        industry = (discovery_data or {}).get("industry") or ""
        company_type = (discovery_data or {}).get("company_type") or ""
        key_pages = (discovery_data or {}).get("key_pages") or []

        yield {
            "event": "status",
            "agent": "discovery",
            "status": "completed",
            "message": "Company discovery complete",
            "data": {
                "website": website_url or "not found",
                "industry": industry or "unknown",
                "linkedin": "found" if linkedin_url else "not found",
                "type": company_type or "unknown",
            },
        }

        # ─── Stage 2: Parallel specialist research ───────────────────────────
        stage2_tasks: dict[str, asyncio.Future] = {}

        # Website crawl (only if website was found)
        if website_url:
            yield {
                "event": "status",
                "agent": "website",
                "status": "started",
                "message": f"Crawling {website_url}...",
            }
            stage2_tasks["website"] = asyncio.ensure_future(
                self._run_crawler(website_url, company_name, key_pages)
            )
        else:
            yield {
                "event": "status",
                "agent": "website",
                "status": "skipped",
                "message": "No official website found — skipping website crawl",
            }

        # News
        yield {
            "event": "status",
            "agent": "news",
            "status": "started",
            "message": "Searching for recent news and events...",
        }
        stage2_tasks["news"] = asyncio.ensure_future(
            self._run_news(company_name, industry)
        )

        # Financial
        yield {
            "event": "status",
            "agent": "financial",
            "status": "started",
            "message": "Researching financial health and metrics...",
        }
        stage2_tasks["financial"] = asyncio.ensure_future(
            self._run_financial(company_name, crunchbase_url, company_type)
        )

        # People
        yield {
            "event": "status",
            "agent": "people",
            "status": "started",
            "message": "Identifying key decision makers...",
        }
        stage2_tasks["people"] = asyncio.ensure_future(
            self._run_people(company_name, website_url, linkedin_url)
        )

        # Tech
        yield {
            "event": "status",
            "agent": "tech",
            "status": "started",
            "message": "Analyzing technology stack...",
        }
        stage2_tasks["tech"] = asyncio.ensure_future(
            self._run_tech(company_name, website_url)
        )

        # Competitive
        yield {
            "event": "status",
            "agent": "competitive",
            "status": "started",
            "message": "Mapping competitive landscape...",
        }
        stage2_tasks["competitive"] = asyncio.ensure_future(
            self._run_competitive(company_name, industry)
        )

        # ─── Collect Stage 2 results ─────────────────────────────────────────
        agent_results: dict[str, dict] = {}
        agent_labels = {
            "website": "Website Crawler",
            "news": "News Intelligence",
            "financial": "Financial Intelligence",
            "people": "People Intelligence",
            "tech": "Tech Intelligence",
            "competitive": "Competitive Intelligence",
        }

        pending = set(stage2_tasks.values())
        future_to_name = {v: k for k, v in stage2_tasks.items()}

        while pending:
            done, pending = await asyncio.wait(pending, timeout=HEARTBEAT_INTERVAL)

            if not done:
                yield {"event": "heartbeat", "message": "Agents working in parallel..."}
                continue

            for fut in done:
                agent_key = future_to_name[fut]
                label = agent_labels.get(agent_key, agent_key)
                try:
                    _, data = fut.result()
                    agent_results[agent_key] = data
                    yield {
                        "event": "status",
                        "agent": agent_key,
                        "status": "completed",
                        "message": f"{label} complete",
                        "data": _summarize_result(agent_key, data),
                    }
                except Exception as exc:
                    logger.error(f"Agent {agent_key} failed: {exc}")
                    agent_results[agent_key] = None
                    yield {
                        "event": "status",
                        "agent": agent_key,
                        "status": "failed",
                        "message": f"{label} failed: {exc}",
                    }

        # ─── Stage 3: Summarizer ─────────────────────────────────────────────
        yield {
            "event": "status",
            "agent": "summarizer",
            "status": "started",
            "message": "Synthesizing all intelligence into sales brief...",
        }

        sum_future = asyncio.ensure_future(
            loop.run_in_executor(
                None,
                lambda: self._get_summarizer().summarize(
                    company_name=company_name,
                    discovery_data=discovery_data,
                    website_data=agent_results.get("website"),
                    news_data=agent_results.get("news"),
                    financial_data=agent_results.get("financial"),
                    people_data=agent_results.get("people"),
                    tech_data=agent_results.get("tech"),
                    competitive_data=agent_results.get("competitive"),
                    seller_context=seller_context,
                ),
            )
        )

        final_report = None
        try:
            while True:
                done, _ = await asyncio.wait({sum_future}, timeout=HEARTBEAT_INTERVAL)
                if done:
                    final_report = sum_future.result()
                    break
                yield {"event": "heartbeat", "message": "Building sales brief..."}
        except Exception as e:
            logger.error(f"Summarizer failed: {e}")
            final_report = {
                "error": str(e),
                "report": f"# {company_name} — Sales Brief\n\nSummarizer failed: {e}\n\nRaw data collected successfully.",
                "partial_data": {k: bool(v) for k, v in agent_results.items()},
            }

        elapsed = round(time.time() - start_time, 1)

        yield {
            "event": "status",
            "agent": "summarizer",
            "status": "completed",
            "message": f"Sales brief ready in {elapsed}s",
        }

        # ─── Emit final report ───────────────────────────────────────────────
        yield {
            "event": "final_report",
            "elapsed_seconds": elapsed,
            "report": final_report,
            "metadata": {
                "company_name": company_name,
                "website": website_url,
                "industry": industry,
                "agents_succeeded": [k for k, v in agent_results.items() if v],
                "agents_failed": [k for k, v in agent_results.items() if not v],
                "data_sources": {k: v is not None for k, v in agent_results.items()},
            },
        }


# ── Helpers ───────────────────────────────────────────────────────────────────


def _summarize_result(agent_key: str, data: dict) -> dict:
    """Extract a few key fields to show in the status update."""
    if not data:
        return {}
    try:
        if agent_key == "website":
            return {
                "products_count": str(len(data.get("products_services", []))),
                "pricing_model": str(data.get("pricing_model", "N/A")),
            }
        elif agent_key == "news":
            return {
                "news_items": str(len(data.get("recent_news", []))),
                "total_funding": str(data.get("total_funding_raised", "N/A")),
            }
        elif agent_key == "financial":
            rev = data.get("revenue", {})
            return {
                "revenue": str(rev.get("annual_revenue", "N/A")),
                "budget_signal": str(data.get("budget_availability_signal", "N/A")),
            }
        elif agent_key == "people":
            return {
                "executives_found": str(len(data.get("executives", []))),
                "buying_committee": str(len(data.get("buying_committee", []))),
            }
        elif agent_key == "tech":
            return {
                "cloud": str(data.get("cloud_providers", ["N/A"])[:2]),
                "maturity": str(data.get("tech_sophistication_level", "N/A")),
            }
        elif agent_key == "competitive":
            return {
                "competitors": str(len(data.get("direct_competitors", []))),
                "market_position": str(data.get("market_share_assessment", "N/A")),
            }
    except Exception:
        pass
    return {}
