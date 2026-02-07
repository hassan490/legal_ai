import json
from pathlib import Path

from docx import Document


def _ensure_parent(path: str) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    return output_path


def write_txt(content: str, path: str) -> None:
    output_path = _ensure_parent(path)
    output_path.write_text(content, encoding="utf-8")


def write_docx(content: str, path: str) -> None:
    output_path = _ensure_parent(path)
    document = Document()
    for line in content.splitlines():
        document.add_paragraph(line)
    document.save(output_path)


def write_json(payload: dict, path: str) -> None:
    output_path = _ensure_parent(path)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
