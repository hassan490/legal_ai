import { parseDocuments, chunkArticles } from "./parsers.js";
import { extractLegalData } from "./extractors.js";
import { analyzeInstructions } from "./reasoning.js";
import { draftResolution } from "./drafting.js";
import { downloadTxt, downloadDocx } from "./exporter.js";
import { formatJson, htmlEscape } from "./utils.js";
import { sampleAoA, sampleMinutes, sampleEmail } from "./sampleData.js";

const elements = {
  docUpload: document.getElementById("doc-upload"),
  docText: document.getElementById("doc-text"),
  parseDocs: document.getElementById("parse-docs"),
  chunksOutput: document.getElementById("chunks-output"),
  instructionUpload: document.getElementById("instruction-upload"),
  instructionText: document.getElementById("instruction-text"),
  instructionUpload: document.getElementById("instruction-upload"),
  instructionOutput: document.getElementById("instruction-output"),
  resolutionType: document.getElementById("resolution-type"),
  authorityThreshold: document.getElementById("authority-threshold"),
  runAnalysis: document.getElementById("run-analysis"),
  instructionOutput: document.getElementById("instruction-output"),
  missingOutput: document.getElementById("missing-output"),
  companyName: document.getElementById("company-name"),
  companyForm: document.getElementById("company-form"),
  companyLicense: document.getElementById("company-license"),
  companyAddress: document.getElementById("company-address"),
  companyJurisdiction: document.getElementById("company-jurisdiction"),
  directorsList: document.getElementById("directors-list"),
  shareholdersList: document.getElementById("shareholders-list"),
  addDirector: document.getElementById("add-director"),
  addShareholder: document.getElementById("add-shareholder"),
  confirmData: document.getElementById("confirm-data"),
  meetingDate: document.getElementById("meeting-date"),
  meetingLocation: document.getElementById("meeting-location"),
  chairperson: document.getElementById("chairperson"),
  generateResolution: document.getElementById("generate-resolution"),
  resolutionOutput: document.getElementById("resolution-output"),
  downloadTxt: document.getElementById("download-txt"),
  downloadDocx: document.getElementById("download-docx"),
  extractionJson: document.getElementById("extraction-json"),
  reasoningJson: document.getElementById("reasoning-json"),
  chatLog: document.getElementById("chat-log"),
  resetChat: document.getElementById("reset-chat"),
  loadSample: document.getElementById("load-sample"),
  downloadTxt: document.getElementById("download-txt"),
  downloadDocx: document.getElementById("download-docx"),
  chatLog: document.getElementById("chat-log"),
  resetChat: document.getElementById("reset-chat"),
};

let latestDocuments = [];
let latestChunks = [];
let latestExtraction = null;
let latestReasoning = null;
let latestDraft = "";

const chatSteps = [
  "Upload MoA/AoA and constitutional documents so I can extract company details.",
  "Upload meeting minutes/emails and confirm the resolution type and authority.",
  "Review extracted data and confirm any missing details.",
  "Generate the draft resolution and download DOCX/TXT outputs.",
];

const addChatMessage = (title, message) => {
  if (!elements.chatLog) {
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "chatbot__message";
  wrapper.innerHTML = `<span>${htmlEscape(title)}</span><p>${htmlEscape(message)}</p>`;
  elements.chatLog.appendChild(wrapper);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
};

const resetChat = () => {
  if (!elements.chatLog) {
    return;
  }
  elements.chatLog.innerHTML = "";
  addChatMessage("Legal AI", "Welcome. I will guide you through drafting UAE board/shareholder resolutions.");
  chatSteps.forEach((step, index) => {
    addChatMessage(`Step ${index + 1}`, step);
  });
};

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
        <span class="badge">Source: ${htmlEscape(chunk.source)}</span>
      </div>`
    )
    .join("");
};

const renderInstructionAnalysis = (analysis) => {
  if (!analysis) {
    elements.instructionOutput.innerHTML = "<p>No instructions analyzed yet.</p>";
    return;
  }

  const missing = analysis.missingFields?.length
    ? `<div class="card"><strong>Missing Data</strong><ul>${analysis.missingFields
        .map((item) => `<li>${htmlEscape(item)}</li>`)
        .join("")}</ul></div>`
    : "";

  const warnings = analysis.warnings.length
    ? `<div class="card"><strong>Warnings</strong><ul>${analysis.warnings
        .map((warning) => `<li>${htmlEscape(warning)}</li>`)
        .join("")}</ul></div>`
    : "";

  elements.instructionOutput.innerHTML = `
    <div class="card">
      <strong>Resolution Type</strong>
      <p>${htmlEscape(analysis.resolutionType)}</p>
      <span class="badge">Authority: ${htmlEscape(analysis.requiredAuthority)}</span>
    </div>
    <div class="card">
      <strong>Key Actions</strong>
      <ul>${analysis.actions.map((action) => `<li>${htmlEscape(action)}</li>`).join("")}</ul>
    </div>
    ${missing}
    ${warnings}
  `;
};

const renderMissing = (missingFields = []) => {
  if (!missingFields.length) {
    elements.missingOutput.innerHTML = "<p>All required fields are filled.</p>";
    return;
  }
  elements.missingOutput.innerHTML = missingFields
    .map((field) => `<div class="card"><span class="badge badge--warning">Missing</span> ${htmlEscape(field)}</div>`)
    .join("");
};

const refreshJsonOutputs = () => {
  elements.extractionJson.textContent = state.extraction
    ? formatJson(state.extraction)
    : "Run parsing to view extracted legal data.";
  elements.reasoningJson.textContent = state.reasoning
    ? formatJson(state.reasoning)
    : "Run analysis to view authority reasoning.";
};

const setDownloadState = (enabled) => {
  elements.downloadTxt.disabled = !enabled;
  elements.downloadDocx.disabled = !enabled;
};

const handleParseDocuments = async () => {
  const files = elements.docUpload.files;
  const textInput = elements.docText.value.trim();

  state.documents = await parseDocuments(files, textInput);
  state.chunks = chunkArticles(state.documents);
  renderChunks(state.chunks);

  state.extraction = extractLegalData(state.chunks);
  renderReviewForms(state.extraction);
  renderMissing(state.extraction.missingFields);
  refreshJsonOutputs();
  addChatMessage(
    "Legal AI",
    latestExtraction.missingFields?.length
      ? "Parsing complete. Some required data is missing; please review the Missing Data list."
      : "Parsing complete. Please upload meeting minutes/emails and provide instructions."
  );
};

const handleRunAnalysis = () => {
  if (!state.extraction) {
    elements.instructionOutput.innerHTML = "<p>Please parse documents first.</p>";
    return;
  }
  const instructions = elements.instructionText.value.trim();
  state.reasoning = analyzeInstructions({
    instructions,
    extraction: state.extraction,
    resolutionTypeOverride: elements.resolutionType.value,
    authorityOverride: elements.authorityThreshold.value,
  });
  renderInstructionAnalysis(state.reasoning);
  refreshJsonOutputs();
  addChatMessage("Legal AI", "Analysis complete. Confirm extracted data before drafting.");
};

const handleConfirmData = () => {
  if (!state.extraction) {
    return;
  }
  state.extraction.company = {
    name: elements.companyName.value.trim() || null,
    form: elements.companyForm.value.trim() || null,
    commercialLicense: elements.companyLicense.value.trim() || null,
    registeredAddress: elements.companyAddress.value.trim() || null,
    jurisdiction: elements.companyJurisdiction.value.trim() || null,
  };

  state.extraction.directors = gatherListValues(elements.directorsList).filter((director) => director.name);
  state.extraction.shareholders = gatherListValues(elements.shareholdersList).filter(
    (shareholder) => shareholder.name
  );

  state.extraction.missingFields = computeMissingFields(state.extraction);
  renderMissing(state.extraction.missingFields);
  refreshJsonOutputs();
  addChatMessage(
    "Legal AI",
    "Reasoning complete. Confirm the extracted data and add any missing details before drafting."
  );
};

const handleGenerateResolution = () => {
  if (!state.extraction || !state.reasoning) {
    elements.resolutionOutput.innerHTML = "<p>Please parse documents and run reasoning first.</p>";
    return;
  }

  state.draft = draftResolution({
    extraction: state.extraction,
    reasoning: state.reasoning,
    meeting: {
      date: elements.meetingDate.value,
      location: elements.meetingLocation.value,
      chairperson: elements.chairperson.value,
      },
  });

  latestDraft = draft;
  elements.resolutionOutput.innerHTML = `<div class="card"><pre>${htmlEscape(draft)}</pre></div>`;
  setDownloadState(true);
  addChatMessage("Legal AI", "Draft completed. You can download TXT or DOCX and review the JSON data.");
};

const handleLoadSample = () => {
  elements.docText.value = sampleAoA;
  elements.instructionText.value = `${sampleMinutes}\n\n${sampleEmail}`;
  elements.meetingDate.value = new Date().toISOString().split("T")[0];
  elements.meetingLocation.value = "Dubai, United Arab Emirates";
  elements.chairperson.value = "Ms. Sara Al Mansouri";
  addChatMessage("Legal AI", "Sample data loaded. Parse documents to begin the workflow.");
};

const handleDownloadTxt = () => {
  if (!latestDraft) {
    return;
  }
  downloadTxt(latestDraft);
};

const handleDownloadDocx = async () => {
  if (!latestDraft) {
    return;
  }
  try {
    await downloadDocx(latestDraft);
  } catch (error) {
    elements.resolutionOutput.innerHTML = `<div class="card"><p>DOCX export failed: ${htmlEscape(
      error.message
    )}</p></div>`;
  }
};

const handleInstructionUpload = async () => {
  const files = elements.instructionUpload.files;
  if (!files.length) {
    return;
  }
  const parsed = await parseDocuments(files, "");
  const combined = parsed.map((doc) => doc.text).join("\n\n");
  elements.instructionText.value = `${elements.instructionText.value.trim()}\n\n${combined}`.trim();
  addChatMessage("Legal AI", "Instruction documents parsed. Review the combined instructions text.");
};

elements.parseDocs.addEventListener("click", handleParseDocuments);
elements.instructionUpload.addEventListener("change", handleInstructionUpload);
elements.runAnalysis.addEventListener("click", handleRunAnalysis);
elements.confirmData.addEventListener("click", handleConfirmData);
elements.generateResolution.addEventListener("click", handleGenerateResolution);
elements.downloadTxt.addEventListener("click", handleDownloadTxt);
elements.downloadDocx.addEventListener("click", handleDownloadDocx);
elements.addDirector.addEventListener("click", handleAddDirector);
elements.addShareholder.addEventListener("click", handleAddShareholder);
elements.resetChat.addEventListener("click", resetChat);
elements.loadSample.addEventListener("click", handleLoadSample);
elements.downloadTxt.addEventListener("click", handleDownloadTxt);
elements.downloadDocx.addEventListener("click", handleDownloadDocx);
elements.instructionUpload.addEventListener("change", handleInstructionUpload);
elements.resetChat.addEventListener("click", resetChat);

renderChunks([]);
renderInstructionAnalysis(null);
renderMissing([]);
refreshJsonOutputs();
setDownloadState(false);
resetChat();
