def suggest_authority(document_type: str) -> list[str]:
    authorities = []
    doc_lower = document_type.lower()
    if "memorandum" in doc_lower:
        authorities.append("Companies Act - Memorandum clauses (objects, liability, capital).")
    if "articles" in doc_lower:
        authorities.append("Companies Act - Articles provisions (governance and internal rules).")
    if not authorities:
        authorities.append("Companies Act - General corporate governance provisions.")
    return authorities
