import argparse
from pathlib import Path

from app.ingestion.loader import load_document
from app.ingestion.chunker import chunk_by_articles
from app.extraction.extractor import extract_resolution_data
from app.drafting.drafter import draft_resolution
from app.output.writer import write_txt, write_docx, write_json
from app.reasoning.validator import validate_resolution_data
from app.reasoning.authority import suggest_authority


def run_pipeline(input_path: str, instructions_path: str, output_dir: str) -> None:
    text = load_document(input_path)

    chunks = chunk_by_articles(text)
    full_text = "\n".join(chunks)

    resolution_data = extract_resolution_data(full_text)
    resolution_data.authorities = suggest_authority(resolution_data.document_type)
    resolution_data.warnings.extend(validate_resolution_data(resolution_data))

    instructions = ""
    if Path(instructions_path).exists():
        instructions = Path(instructions_path).read_text(encoding="utf-8")

    draft = draft_resolution(resolution_data, instructions)

    write_txt(draft, f"{output_dir}/final_resolution.txt")
    write_docx(draft, f"{output_dir}/final_resolution.docx")
    write_json(resolution_data.dict(), f"{output_dir}/resolution_data.json")

    print("✅ Resolution generated successfully!")


def main() -> None:
    parser = argparse.ArgumentParser(description="AOA/MOA legal drafting pipeline")
    parser.add_argument(
        "--input",
        default="examples/samples_aoa.txt",
        help="Path to the input document",
    )
    parser.add_argument(
        "--instructions",
        default="examples/instructions.txt",
        help="Path to drafting instructions",
    )
    parser.add_argument(
        "--output-dir",
        default="output",
        help="Directory for generated outputs",
    )
    args = parser.parse_args()

    run_pipeline(args.input, args.instructions, args.output_dir)


if __name__ == "__main__":
    main()
