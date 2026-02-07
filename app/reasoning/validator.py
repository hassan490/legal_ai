from app.extraction.schemas import ResolutionData


def validate_resolution_data(resolution_data: ResolutionData) -> list[str]:
    issues = []
    if not resolution_data.company_name:
        issues.append("Missing company name.")
    if not resolution_data.registered_office:
        issues.append("Missing registered office.")
    if not resolution_data.key_clauses:
        issues.append("No key clauses detected.")
    if not resolution_data.objectives:
        issues.append("No objectives detected.")
    return issues
