from flask import Flask, render_template_string, request

from app.drafting.drafter import draft_resolution
from app.extraction.extractor import extract_resolution_data
from app.ingestion.chunker import chunk_by_articles
from app.reasoning.authority import suggest_authority
from app.reasoning.validator import validate_resolution_data


app = Flask(__name__)

TEMPLATE = """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Legal AI Drafting Assistant</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f1117;
        --panel: #171b24;
        --muted: #8f9bb3;
        --text: #e7ecf3;
        --accent: #7c5cff;
        --accent-2: #31d0aa;
        --border: #2a3140;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      header {
        padding: 32px 40px 0;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      p.subtitle {
        margin: 0;
        color: var(--muted);
      }
      main {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 24px;
        padding: 24px 40px 40px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
      }
      label {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        margin-bottom: 8px;
      }
      textarea, input[type="file"] {
        width: 100%;
        background: #0b0e14;
        border: 1px solid var(--border);
        color: var(--text);
        padding: 12px;
        border-radius: 12px;
        font-size: 14px;
      }
      textarea {
        min-height: 180px;
        resize: vertical;
      }
      .grid {
        display: grid;
        gap: 16px;
      }
      .button {
        background: linear-gradient(135deg, var(--accent), #5c7cfa);
        border: none;
        color: white;
        padding: 12px 18px;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      .button:hover {
        transform: translateY(-1px);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(124, 92, 255, 0.12);
        color: var(--accent);
        font-size: 12px;
        margin-right: 6px;
        margin-bottom: 8px;
      }
      pre {
        background: #0b0e14;
        border-radius: 12px;
        padding: 16px;
        overflow-x: auto;
        border: 1px solid var(--border);
      }
      .summary-grid {
        display: grid;
        gap: 12px;
      }
      .summary-item {
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--border);
      }
      .summary-item h4 {
        margin: 0 0 6px;
        font-size: 13px;
        color: var(--accent-2);
      }
      .summary-item p {
        margin: 0;
        color: var(--text);
        font-size: 14px;
      }
      .footer-note {
        color: var(--muted);
        font-size: 12px;
        margin-top: 12px;
      }
      @media (max-width: 960px) {
        main {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Legal AI Drafting Assistant</h1>
      <p class="subtitle">Analyze AOA/MOA documents, extract key details, and generate draft resolutions.</p>
    </header>
    <main>
      <section class="card">
        <form method="post" enctype="multipart/form-data" class="grid">
          <div>
            <label for="document_text">Document Text</label>
            <textarea id="document_text" name="document_text" placeholder="Paste AOA/MOA or supporting emails here...">{{ document_text }}</textarea>
          </div>
          <div>
            <label for="document_file">Upload Document (optional)</label>
            <input id="document_file" type="file" name="document_file" />
          </div>
          <div>
            <label for="instructions">Drafting Instructions</label>
            <textarea id="instructions" name="instructions" placeholder="Provide any drafting instructions or formatting notes...">{{ instructions }}</textarea>
          </div>
          <button class="button" type="submit">Generate Draft</button>
        </form>
        <p class="footer-note">Tip: Upload a text-based document or paste the content directly to analyze it.</p>
      </section>
      <section class="card">
        {% if result %}
          <div class="summary-grid">
            <div class="summary-item">
              <h4>Document Type</h4>
              <p>{{ result.document_type or "Unknown" }}</p>
            </div>
            <div class="summary-item">
              <h4>Company</h4>
              <p>{{ result.company_name or "TBD" }}</p>
            </div>
            <div class="summary-item">
              <h4>Registered Office</h4>
              <p>{{ result.registered_office or "Not detected" }}</p>
            </div>
            <div class="summary-item">
              <h4>Key Dates</h4>
              <p>{{ ", ".join(result.key_dates) if result.key_dates else "Not detected" }}</p>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <span class="chip">Authorities</span>
            {% for authority in result.authorities %}
              <span class="chip">{{ authority }}</span>
            {% endfor %}
          </div>
          <h3>Draft Output</h3>
          <pre>{{ draft }}</pre>
          <h3>Extracted JSON</h3>
          <pre>{{ result_json }}</pre>
        {% else %}
          <p class="subtitle">Submit a document to see extracted details and the draft output.</p>
        {% endif %}
      </section>
    </main>
  </body>
</html>
"""


@app.route("/", methods=["GET", "POST"])
def index():
    document_text = ""
    instructions = ""
    result = None
    draft = ""
    result_json = ""

    if request.method == "POST":
        document_text = request.form.get("document_text", "")
        instructions = request.form.get("instructions", "")
        uploaded_file = request.files.get("document_file")
        if uploaded_file and uploaded_file.filename:
            document_text = uploaded_file.read().decode("utf-8")

        chunks = chunk_by_articles(document_text)
        full_text = "\n".join(chunks)

        result = extract_resolution_data(full_text)
        result.authorities = suggest_authority(result.document_type)
        result.warnings.extend(validate_resolution_data(result))
        draft = draft_resolution(result, instructions)
        result_json = result.dict()

    return render_template_string(
        TEMPLATE,
        document_text=document_text,
        instructions=instructions,
        result=result,
        draft=draft,
        result_json=result_json,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
