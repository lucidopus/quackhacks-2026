"""
Competitive Intelligence Agent — maps the competitive landscape around a
target company, identifies key competitors, and surfaces positioning gaps.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from app.services.research.prompts.competitive_prompt import COMPETITIVE_PROMPT
from app.services.research.tools.web_tools import search_web, fetch_web_page


class CompetitiveAgent:
    """Analyzes competitive landscape and market positioning of a company."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="CompetitiveIntelligence",
            description="Maps competitors, market position, and G2/Gartner classification of a company",
            system_prompt=COMPETITIVE_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def analyze(
        self, company_name: str, industry: str = "", market_category: str = ""
    ) -> dict:
        context = ""
        if industry:
            context += f"\nIndustry: {industry}"
        if market_category:
            context += f"\nMarket category: {market_category}"

        prompt = (
            f"Research competitive landscape for: {company_name}{context}\n\n"
            f"Run these 2 searches only:\n"
            f"1. '{company_name} competitors alternatives market'\n"
            f"2. '{company_name} G2 category leader vs'\n\n"
            f"Extract competitors and positioning from snippets alone — do NOT fetch pages.\n"
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
            "direct_competitors": [],
            "market_share_assessment": "unknown",
            "narrative": response[:500] if response else None,
        }
