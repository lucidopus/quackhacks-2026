"""
Summarizer Agent — synthesizes data from all specialist agents into a
final comprehensive sales brief.
"""

import json
from strands import Agent
from strands.models import BedrockModel

from backend.prompts.summarizer_prompt import SUMMARIZER_PROMPT


def _truncate(value, limit: int) -> str:
    """Safely truncate any value to string of max `limit` chars."""
    if value is None:
        return ""
    s = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
    return s if len(s) <= limit else s[:limit] + "…"


class SummarizerAgent:
    """Synthesizes all agent outputs into a final sales brief."""

    def __init__(self, model_id: str, region: str):
        self.model = BedrockModel(model_id=model_id, region_name=region)
        self.agent = Agent(
            name="SalesBriefSummarizer",
            description=(
                "Synthesizes company discovery, website, news, financial, people, "
                "tech, and competitive intelligence into an actionable sales brief"
            ),
            system_prompt=SUMMARIZER_PROMPT,
            model=self.model,
        )

    def summarize(
        self,
        company_name: str,
        discovery_data: dict | None = None,
        website_data: dict | None = None,
        news_data: dict | None = None,
        financial_data: dict | None = None,
        people_data: dict | None = None,
        tech_data: dict | None = None,
        competitive_data: dict | None = None,
        seller_context: str = "",
    ) -> dict:
        """
        Synthesize all agent outputs into a sales brief.

        Args:
            company_name: Name of the researched company
            discovery_data: Output from CompanyDiscoveryAgent
            website_data: Output from WebsiteCrawlerAgent
            news_data: Output from NewsAgent
            financial_data: Output from FinancialAgent
            people_data: Output from PeopleAgent
            tech_data: Output from TechAgent
            competitive_data: Output from CompetitiveAgent
            seller_context: Optional context about what the seller is selling

        Returns:
            dict with the markdown sales brief
        """
        sections: list[str] = []

        # Company identity
        if discovery_data:
            sections.append(f"## COMPANY IDENTITY\n{_truncate(discovery_data, 1200)}")
        else:
            sections.append(f"## COMPANY IDENTITY\nCompany: {company_name}")

        # Website intelligence
        if website_data:
            # Drop raw_response to save tokens
            trimmed_web = {k: v for k, v in website_data.items() if k != "raw_response"}
            sections.append(f"## WEBSITE INTELLIGENCE\n{_truncate(trimmed_web, 1500)}")
        else:
            sections.append("## WEBSITE INTELLIGENCE\nNot available.")

        # News
        if news_data:
            trimmed_news = {k: v for k, v in news_data.items() if k != "raw_response"}
            sections.append(f"## NEWS & EVENTS\n{_truncate(trimmed_news, 1800)}")
        else:
            sections.append("## NEWS & EVENTS\nNot available.")

        # Financial
        if financial_data:
            trimmed_fin = {
                k: v for k, v in financial_data.items() if k != "raw_response"
            }
            sections.append(
                f"## FINANCIAL INTELLIGENCE\n{_truncate(trimmed_fin, 1200)}"
            )
        else:
            sections.append("## FINANCIAL INTELLIGENCE\nNot available.")

        # People
        if people_data:
            trimmed_people = {
                k: v for k, v in people_data.items() if k != "raw_response"
            }
            sections.append(
                f"## PEOPLE & DECISION MAKERS\n{_truncate(trimmed_people, 1500)}"
            )
        else:
            sections.append("## PEOPLE & DECISION MAKERS\nNot available.")

        # Tech
        if tech_data:
            trimmed_tech = {k: v for k, v in tech_data.items() if k != "raw_response"}
            sections.append(f"## TECHNOLOGY STACK\n{_truncate(trimmed_tech, 1000)}")
        else:
            sections.append("## TECHNOLOGY STACK\nNot available.")

        # Competitive
        if competitive_data:
            trimmed_comp = {
                k: v for k, v in competitive_data.items() if k != "raw_response"
            }
            sections.append(
                f"## COMPETITIVE LANDSCAPE\n{_truncate(trimmed_comp, 1000)}"
            )
        else:
            sections.append("## COMPETITIVE LANDSCAPE\nNot available.")

        seller_hint = (
            f"\n\n## SELLER CONTEXT\n{seller_context}\nTailor the brief for this context."
            if seller_context
            else ""
        )

        prompt = (
            f"Produce a sales brief for: **{company_name}**\n\n"
            + "\n\n".join(sections)
            + seller_hint
            + "\n\nFollow your system prompt format exactly."
        )

        response = str(self.agent(prompt))

        return {
            "report": response,
            "full_response": response,
            "data_sources": {
                "discovery": discovery_data is not None,
                "website": website_data is not None,
                "news": news_data is not None,
                "financial": financial_data is not None,
                "people": people_data is not None,
                "tech": tech_data is not None,
                "competitive": competitive_data is not None,
            },
        }
