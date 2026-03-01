"""
News Intelligence Agent — finds recent news, funding rounds, product launches,
and other events about a company.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from backend.prompts.news_prompt import NEWS_PROMPT
from backend.tools.web_tools import search_web, fetch_web_page


class NewsAgent:
    """Finds and analyzes recent news about a company."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="NewsIntelligence",
            description="Finds recent news, funding, and events about a company",
            system_prompt=NEWS_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def analyze(self, company_name: str, industry: str = "") -> dict:
        """
        Find and analyze recent news about a company.

        Args:
            company_name: Company name to research
            industry: Optional industry for better search targeting

        Returns:
            Dict with recent news, funding history, product launches, etc.
        """
        industry_hint = f" ({industry})" if industry else ""

        prompt = (
            f"Research recent news for: {company_name}{industry_hint}\n\n"
            f"Run these 2 searches only:\n"
            f"1. '{company_name} news funding 2024 2025'\n"
            f"2. '{company_name} product launch acquisition partnership'\n\n"
            f"Extract all findings from snippets alone — do NOT fetch any article pages.\n"
            f"Return JSON immediately."
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
            "raw_response": response,
            "recent_news": [],
            "funding_history": [],
            "key_narrative": response[:500] if response else None,
        }
