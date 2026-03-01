"""
Website Crawler Agent — deeply crawls a company's website to extract
products, pricing, team, and positioning information.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from backend.prompts.website_crawler_prompt import WEBSITE_CRAWLER_PROMPT
from backend.tools.web_tools import (
    fetch_web_page,
    extract_page_links,
    fetch_multiple_pages,
)


class WebsiteCrawlerAgent:
    """Crawls company website pages to extract business intelligence."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="WebsiteCrawler",
            description="Crawls company websites to extract products, pricing, team, and positioning",
            system_prompt=WEBSITE_CRAWLER_PROMPT,
            model=self.model,
            tools=[fetch_web_page, extract_page_links, fetch_multiple_pages],
        )

    def crawl(
        self, website_url: str, company_name: str, key_pages: list[str] | None = None
    ) -> dict:
        """
        Crawl a company website and extract business intelligence.

        Args:
            website_url: Official company website URL
            company_name: Company name for context
            key_pages: Optional list of specific pages to prioritize

        Returns:
            Dict with product info, pricing, team, differentiators, etc.
        """
        key_page_hint = ""
        if key_pages:
            key_page_hint = (
                f"\nFocus especially on these pages: {', '.join(key_pages[:5])}"
            )

        prompt = (
            f"Crawl the website for company: {company_name}\n"
            f"Official website: {website_url}\n\n"
            f"Fetch exactly 2 pages using fetch_multiple_pages with this JSON array:\n"
            f'["{website_url}", "{website_url.rstrip("/")}/about"]\n'
            f"Extract products, pricing, value prop, target customers from just those 2 pages.\n"
            f"Return JSON immediately — do NOT fetch more pages."
        )

        response = str(self.agent(prompt))

        try:
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

        return {
            "company_name": company_name,
            "website": website_url,
            "raw_response": response,
            "company_overview": None,
            "products_services": [],
            "pricing_model": "undisclosed",
        }
