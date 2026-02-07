import re
from typing import List

from app.extraction.schemas import ResolutionData, ExtractedParty


DATE_PATTERN = re.compile(
    r"\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})\b"
)

COMPANY_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z0-9&,\.\s]{2,}?\s+(Private Limited|Limited|Ltd\.|LLP|Inc\.|"
    r"Corporation|Company))\b"
)

REGISTERED_OFFICE_PATTERN = re.compile(
    r"(?i)(registered office|registered address|principal office)[:\-]?\s*(.+)"
)

DIRECTOR_PATTERN = re.compile(
    r"(?i)(director|board of directors)[:\-]?\s*(.+)"
)

SHARE_CAPITAL_PATTERN = re.compile(
    r"(?i)(share capital|authorized capital|authorised capital)[:\-]?\s*(.+)"
)

OBJECTS_PATTERN = re.compile(
    r"(?i)^(objects|objectives|main objects)[:\-]?\s*(.+)$"
)


def _find_first_match(pattern: re.Pattern, text: str) -> str:
    match = pattern.search(text)
    if match:
        return match.group(len(match.groups()))
    return ""


def _collect_list(pattern: re.Pattern, text: str) -> List[str]:
    items = []
    for line in text.splitlines():
        match = pattern.search(line.strip())
        if match:
            candidate = match.group(len(match.groups()))
            if candidate:
                items.append(candidate.strip())
    return items


def _extract_key_clauses(text: str) -> List[str]:
    clauses = []
    for line in text.splitlines():
        if re.match(r"(?i)^(article|clause|section)\s+\d+", line.strip()):
            clauses.append(line.strip())
    return clauses


def _extract_parties(text: str) -> List[ExtractedParty]:
    parties = []
    seen = set()
    for line in text.splitlines():
        if "member" in line.lower() or "shareholder" in line.lower():
            name = line.strip()
            if name and (name, "Member/Shareholder") not in seen:
                parties.append(ExtractedParty(name=name, role="Member/Shareholder"))
                seen.add((name, "Member/Shareholder"))
        email_match = re.match(r"(?i)^(from|to):\s*(.+)$", line.strip())
        if email_match:
            role = "Sender" if email_match.group(1).lower() == "from" else "Recipient"
            name = email_match.group(2).strip()
            if name and (name, role) not in seen:
                parties.append(ExtractedParty(name=name, role=role))
                seen.add((name, role))
    return parties


def _extract_registered_office(text: str) -> str:
    lines = text.splitlines()
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r"(?i)^(email|from|to|subject|date)\b", stripped):
            continue
        lower_line = line.lower()
        if "registered office" in lower_line or "registered address" in lower_line:
            has_digits = any(char.isdigit() for char in line)
            if not (stripped.endswith(":") or "address" in lower_line or has_digits):
                continue
            cleaned = re.sub(
                r"(?i).*registered (office|address)( is| to|:)?",
                "",
                line,
            ).strip(" :-")
            address_lines = [cleaned] if cleaned else []
            for next_line in lines[idx + 1 : idx + 4]:
                if not next_line.strip():
                    break
                if re.match(r"(?i)^(email|from|to|subject|date)\b", next_line.strip()):
                    break
                if re.match(
                    r"(?i)^(please|authorize|best|regards|noted|for the record)\b",
                    next_line.strip(),
                ):
                    break
                address_lines.append(next_line.strip())
            address = " ".join(address_lines).strip(", ")
            if address:
                return address
    return _find_first_match(REGISTERED_OFFICE_PATTERN, text)


def extract_resolution_data(text: str) -> ResolutionData:
    document_type = "AOA/MOA"
    lower_text = text.lower()
    if "articles of association" in lower_text or "articles" in lower_text:
        document_type = "Articles of Association"
    if "memorandum of association" in lower_text or "memorandum" in lower_text:
        if document_type == "Articles of Association":
            document_type = "Articles + Memorandum of Association"
        else:
            document_type = "Memorandum of Association"

    company_name_match = COMPANY_PATTERN.search(text)
    company_name = company_name_match.group(1).strip() if company_name_match else ""

    registered_office = _extract_registered_office(text)
    share_capital = _find_first_match(SHARE_CAPITAL_PATTERN, text)

    directors = _collect_list(DIRECTOR_PATTERN, text)
    objectives = []
    for line in text.splitlines():
        match = OBJECTS_PATTERN.match(line.strip())
        if match:
            objectives.append(match.group(len(match.groups())).strip())

    key_dates = sorted(set(match.group(1) for match in DATE_PATTERN.finditer(text)))
    key_clauses = _extract_key_clauses(text)
    shareholders = [party.name for party in _extract_parties(text)]

    governance_notes = []
    if "quorum" in lower_text:
        governance_notes.append("Quorum requirements mentioned.")
    if "director" in lower_text:
        governance_notes.append("Director appointment/removal provisions present.")
    if "meeting" in lower_text:
        governance_notes.append("Meeting procedures referenced.")

    warnings = []
    if not company_name:
        warnings.append("Company name not detected; confirm manually.")
    if not registered_office:
        warnings.append("Registered office not detected; confirm address manually.")

    parties = _extract_parties(text)

    return ResolutionData(
        document_type=document_type,
        company_name=company_name,
        registered_office=registered_office,
        key_dates=key_dates,
        directors=directors,
        shareholders=shareholders,
        share_capital=share_capital,
        objectives=objectives,
        key_clauses=key_clauses,
        governance_notes=governance_notes,
        parties=parties,
        warnings=warnings,
    )
