from app.ingestion.loader import load_document
from app.ingestion.chunker import chunk_by_articles
from app.extraction.extractor import extract_resolution_data
from app.drafting.drafter import draft_resolution
from app.output.writer import write_txt, write_docx, write_json

# Load document
text = load_document("examples/sample_aoa.txt")

# Chunk if needed
chunks = chunk_by_articles(text)
full_text = "\n".join(chunks)

# Extract structured info
resolution_data = extract_resolution_data(full_text)

# Load instructions
with open("examples/instructions.txt", "r") as f:
    instructions = f.read()

# Draft resolution
draft = draft_resolution(resolution_data, instructions)

# Output
write_txt(draft, "output/final_resolution.txt")
write_docx(draft, "output/final_resolution.docx")
write_json(resolution_data.dict(), "output/resolution_data.json")

print("✅ Resolution generated successfully!")
