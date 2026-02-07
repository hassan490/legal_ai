from datetime import datetime

from app.drafting.prompts import build_instruction_block
from app.extraction.schemas import ResolutionData


def _render_section(title: str, lines: list[str]) -> str:
    if not lines:
        return f"{title}\n- Not provided\n"
    return f"{title}\n" + "\n".join(f"- {line}" for line in lines) + "\n"


def draft_resolution(resolution_data: ResolutionData, instructions: str) -> str:
    instruction_block = build_instruction_block(instructions)
    now = datetime.utcnow().strftime("%Y-%m-%d")

    header = (
        f"Draft Legal Memorandum/Resolution\n"
        f"Date: {now}\n"
        f"Document Type: {resolution_data.document_type}\n"
        f"Company: {resolution_data.company_name or 'TBD'}\n"
    )

    body_sections = [
        _render_section("Registered Office", [resolution_data.registered_office]),
        _render_section("Key Dates", resolution_data.key_dates),
        _render_section("Directors", resolution_data.directors),
        _render_section("Shareholders", resolution_data.shareholders),
        _render_section("Share Capital", [resolution_data.share_capital]),
        _render_section("Objectives/Objects", resolution_data.objectives),
        _render_section("Key Clauses", resolution_data.key_clauses),
        _render_section("Governance Notes", resolution_data.governance_notes),
        _render_section("Legal Authority References", resolution_data.authorities),
        _render_section(
            "Parties",
            [f"{party.name} ({party.role})" for party in resolution_data.parties],
        ),
        _render_section("Warnings", resolution_data.warnings),
    ]

    draft = (
        f"{header}\n"
        f"Instructions Applied:\n{instruction_block}\n\n"
        + "\n".join(body_sections)
        + "\nPrepared by the Legal AI Drafting Assistant."
    )

    return draft
