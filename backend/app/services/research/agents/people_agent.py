"""
People Intelligence Agent — identifies key decision makers, executives, and
the buying committee at the target company.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from app.services.research.prompts.people_prompt import PEOPLE_PROMPT
from app.services.research.tools.web_tools import search_web, fetch_web_page


class PeopleAgent:
    """Identifies executives and decision makers at a company."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="PeopleIntelligence",
            description="Identifies executives, decision makers and buying committee at a company",
            system_prompt=PEOPLE_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def analyze(
        self, company_name: str, website_url: str = "", linkedin_url: str = ""
    ) -> dict:
        web_hint = f"\nWebsite: {website_url}" if website_url else ""

        prompt = (
            f"Research key decision makers at: {company_name}{web_hint}\n\n"
            f"Run these 2 searches only:\n"
            f"1. '{company_name} CEO CTO CFO leadership team'\n"
            f"2. '{company_name} executives founders VP'\n\n"
            f"Extract names and titles from snippets.\n"
            f"Do NOT fetch any pages unless no names found at all.\n"
            f"Return JSON with executives and buying committee immediately."
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
            "executives": [],
            "buying_committee": [],
        }
