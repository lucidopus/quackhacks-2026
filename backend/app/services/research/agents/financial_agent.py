"""
Financial Intelligence Agent — finds revenue, funding, headcount, and financial
health indicators for the target company.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from app.services.research.prompts.financial_prompt import FINANCIAL_PROMPT
from app.services.research.tools.web_tools import search_web, fetch_web_page


class FinancialAgent:
    """Researches financial health and metrics for a company."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="FinancialIntelligence",
            description="Finds revenue, funding, headcount, and financial health for a company",
            system_prompt=FINANCIAL_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def analyze(
        self, company_name: str, crunchbase_url: str = "", company_type: str = ""
    ) -> dict:
        type_hint = f"\nCompany type: {company_type}" if company_type else ""

        prompt = (
            f"Research financial metrics for: {company_name}{type_hint}\n\n"
            f"Run these 2 searches only:\n"
            f"1. '{company_name} revenue funding employees valuation'\n"
            f"2. '{company_name} ARR growth annual report'\n\n"
            f"Extract all figures from snippets — do NOT fetch pages unless no revenue data found at all.\n"
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
            "revenue": {},
            "company_size": {},
            "financial_health": {},
        }
