"""
Company Discovery Agent — finds official URLs and basic identity for a given company name.
First agent to run; its output seeds all subsequent agents.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from app.services.research.prompts.discovery_prompt import DISCOVERY_PROMPT
from app.services.research.tools.web_tools import search_web, fetch_web_page


class CompanyDiscoveryAgent:
    """Discovers company's official digital presence from its name."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="CompanyDiscovery",
            description="Finds official website, LinkedIn, and basic identity for a company",
            system_prompt=DISCOVERY_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def discover(self, company_name: str) -> dict:
        prompt = (
            f"Research the company: {company_name}\n\n"
            f"Run ONE search: '{company_name} official website LinkedIn industry founded'\n"
            f"Extract website, LinkedIn URL, industry, founding year, HQ, public/private from snippets.\n"
            f"Return JSON immediately — do NOT fetch any pages."
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
            "official_website": None,
            "linkedin_url": None,
            "industry": None,
            "description": None,
        }
