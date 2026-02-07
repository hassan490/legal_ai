from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any


@dataclass
class ExtractedParty:
    name: str
    role: str


@dataclass
class ResolutionData:
    document_type: str
    company_name: str
    registered_office: str
    key_dates: List[str] = field(default_factory=list)
    directors: List[str] = field(default_factory=list)
    shareholders: List[str] = field(default_factory=list)
    share_capital: str = ""
    objectives: List[str] = field(default_factory=list)
    key_clauses: List[str] = field(default_factory=list)
    governance_notes: List[str] = field(default_factory=list)
    authorities: List[str] = field(default_factory=list)
    parties: List[ExtractedParty] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def dict(self) -> Dict[str, Any]:
        return asdict(self)
