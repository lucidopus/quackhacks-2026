"""
Technology Intelligence Agent — determines the tech stack, cloud providers,
and tools used by the target company based on job postings, engineering blogs,
and public signals.
"""

import json
import re
from strands import Agent
from strands.models import BedrockModel

from backend.prompts.tech_prompt import TECH_PROMPT
from backend.tools.web_tools import search_web, fetch_web_page


class TechAgent:
    """Identifies the technology stack and tools used by a company."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="TechIntelligence",
            description="Identifies cloud providers, tools, and tech stack used by a company",
            system_prompt=TECH_PROMPT,
            model=self.model,
            tools=[search_web, fetch_web_page],
        )

    def analyze(self, company_name: str, website_url: str = "") -> dict:
        """
        Identify the company's technology stack and digital maturity.

        Args:
            company_name: Company name
            website_url: Website URL to help find careers and blog pages

        Returns:
            Dict with cloud providers, tools, tech sophistication, etc.
        """
        web_hint = f"\nWebsite: {website_url}" if website_url else ""

        prompt = (
            f"Research technology stack used by: {company_name}{web_hint}\n\n"
            f"Run these 2 searches only:\n"
            f"1. '{company_name} tech stack AWS Azure GCP engineering'\n"
            f"2. '{company_name} jobs engineering Python Kubernetes required skills'\n\n"
            f"Infer the stack from snippet keywords alone — do NOT fetch pages.\n"
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
            "cloud_providers": [],
            "tech_sophistication_level": "unknown",
            "tech_summary": response[:500] if response else None,
        }
