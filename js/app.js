import { parseDocuments, chunkArticles } from "./parsers.js";
import { extractLegalData } from "./extractors.js";
import { analyzeInstructions } from "./reasoning.js";
import { draftResolution } from "./drafting.js";
import { formatJson, htmlEscape } from "./utils.js";
import { sampleAoA, sampleInstructions } from "./sampleData.js";

const elements = {
  docUpload: document.getElementById("doc-upload"),
  docText: document.getElementById("doc-text"),
  parseDocs: document.getElementById("parse-docs"),
  chunksOutput: document.getElementById("chunks-output"),
  instructionText: document.getElementById("instruction-text"),
  instructionOutput: document.getElementById("instruction-output"),
  resolutionType: document.getElementById("resolution-type"),
  authorityThreshold: document.getElementById("authority-threshold"),
  runAnalysis: document.getElementById("run-analysis"),
  meetingDate: document.getElementById("meeting-date"),
  meetingLocation: document.getElementById("meeting-location"),
  chairperson: document.getElementById("chairperson"),
  generateResolution: document.getElementById("generate-resolution"),
  resolutionOutput: document.getElementById("resolution-output"),
  extractionJson: document.getElementById("extraction-json"),
  reasoningJson: document.getElementById("reasoning-json"),
  loadSample: document.getElementById("load-sample"),
};

let latestDocuments = [];
let latestChunks = [];
let latestExtraction = null;
let latestReasoning = null;

const renderChunks = (chunks) => {
  if (!chunks.length) {
    elements.chunksOutput.innerHTML = "<p>No document content parsed yet.</p>";
    return;
  }
  elements.chunksOutput.innerHTML = chunks
    .map(
      (chunk) => `
      <div class="card">
        <strong>${htmlEscape(chunk.heading || "Untitled Section")}</strong>
        <p>${htmlEscape(chunk.body.slice(0, 240))}${chunk.body.length > 240 ? "…" : ""}</p>
        <span class="status-pill">Source: ${htmlEscape(chunk.source)}</span>
      </div>`
    )
    .join("");
};

const renderInstructionAnalysis = (analysis) => {
  if (!analysis) {
    elements.instructionOutput.innerHTML = "<p>No instructions analyzed yet.</p>";
    return;
  }

  const warnings = analysis.warnings.length
    ? `<div class="card"><strong>Warnings</strong><ul>${analysis.warnings
        .map((warning) => `<li>${htmlEscape(warning)}</li>`)
        .join("")}</ul></div>`
    : "";

  elements.instructionOutput.innerHTML = `
    <div class="card">
      <strong>Resolution Type</strong>
      <p>${htmlEscape(analysis.resolutionType)}</p>
      <span class="status-pill status-pill--success">Authority: ${htmlEscape(analysis.requiredAuthority)}</span>
    </div>
    <div class="card">
      <strong>Key Actions</strong>
      <ul>${analysis.actions.map((action) => `<li>${htmlEscape(action)}</li>`).join("")}</ul>
    </div>
    ${warnings}
  `;
};

const refreshJsonOutputs = () => {
  elements.extractionJson.textContent = latestExtraction
    ? formatJson(latestExtraction)
    : "Run parsing to view extracted legal data.";
  elements.reasoningJson.textContent = latestReasoning
    ? formatJson(latestReasoning)
    : "Run analysis to view authority reasoning.";
};

const handleParseDocuments = async () => {
  const files = elements.docUpload.files;
  const textInput = elements.docText.value.trim();

  latestDocuments = await parseDocuments(files, textInput);
  latestChunks = chunkArticles(latestDocuments);
  renderChunks(latestChunks);

  latestExtraction = extractLegalData(latestChunks);
  refreshJsonOutputs();
};

const handleRunAnalysis = () => {
  if (!latestExtraction) {
    elements.instructionOutput.innerHTML = "<p>Please parse documents first.</p>";
    return;
  }
  const instructions = elements.instructionText.value.trim();
  latestReasoning = analyzeInstructions({
    instructions,
    extraction: latestExtraction,
    resolutionTypeOverride: elements.resolutionType.value,
    authorityOverride: elements.authorityThreshold.value,
  });
  renderInstructionAnalysis(latestReasoning);
  refreshJsonOutputs();
};

const handleGenerateResolution = () => {
  if (!latestExtraction || !latestReasoning) {
    elements.resolutionOutput.innerHTML = "<p>Please parse documents and run reasoning first.</p>";
    return;
  }

  const draft = draftResolution({
    extraction: latestExtraction,
    reasoning: latestReasoning,
    meeting: {
      date: elements.meetingDate.value,
      location: elements.meetingLocation.value,
      chairperson: elements.chairperson.value,
    },
  });

  elements.resolutionOutput.innerHTML = `<div class="card"><pre>${htmlEscape(draft)}</pre></div>`;
};

const handleLoadSample = () => {
  elements.docText.value = sampleAoA;
  elements.instructionText.value = sampleInstructions;
  elements.meetingDate.value = new Date().toISOString().split("T")[0];
  elements.meetingLocation.value = "Dubai, United Arab Emirates";
  elements.chairperson.value = "Ms. Sara Al Mansouri";
};

elements.parseDocs.addEventListener("click", handleParseDocuments);
elements.runAnalysis.addEventListener("click", handleRunAnalysis);
elements.generateResolution.addEventListener("click", handleGenerateResolution);
elements.loadSample.addEventListener("click", handleLoadSample);

renderChunks([]);
renderInstructionAnalysis(null);
refreshJsonOutputs();
