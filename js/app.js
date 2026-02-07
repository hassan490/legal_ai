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
};

const state = {
  documents: [],
  chunks: [],
  extraction: null,
  reasoning: null,
  draft: "",
};

const chatSteps = [
  "Upload MoA/AoA and corporate documents so I can extract company data.",
  "Upload meeting minutes/emails and describe the resolution request.",
  "Confirm extracted data and fill any missing details.",
  "Generate the resolution and download DOCX/TXT outputs.",
];

const addChatMessage = (title, message) => {
  const wrapper = document.createElement("div");
  wrapper.className = "chatbot__message";
  wrapper.innerHTML = `<span>${htmlEscape(title)}</span><p>${htmlEscape(message)}</p>`;
  elements.chatLog.appendChild(wrapper);
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
};

const resetChat = () => {
  elements.chatLog.innerHTML = "";
  addChatMessage("Legal AI", "Welcome. I will guide you through drafting UAE resolutions.");
  chatSteps.forEach((step, index) => addChatMessage(`Step ${index + 1}`, step));
};

const setDownloadState = (enabled) => {
  elements.downloadTxt.disabled = !enabled;
  elements.downloadDocx.disabled = !enabled;
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

const computeMissingFields = (extraction) => {
  const missing = [];
  if (!extraction.company.name) missing.push("Company name");
  if (!extraction.company.registeredAddress) missing.push("Registered address");
  if (!extraction.company.commercialLicense) missing.push("Commercial license number");
  if (!extraction.directors.length) missing.push("Director/manager names");
  if (!extraction.shareholders.length) missing.push("Shareholder names and ownership");
  return missing;
};

const createListItem = ({ title, fields }) => {
  const wrapper = document.createElement("div");
  wrapper.className = "list-item";
  wrapper.innerHTML = `
    <div class="list-item__header">
      <strong>${htmlEscape(title)}</strong>
      <button class="button button--ghost" type="button">Remove</button>
    </div>
    ${fields
      .map(
        ({ label, name, value, placeholder }) => `
        <label class="field">
          <span class="field__label">${htmlEscape(label)}</span>
          <input data-field="${htmlEscape(name)}" type="text" value="${htmlEscape(value || "")}" placeholder="${htmlEscape(
            placeholder
          )}" />
        </label>
      `
      )
      .join("")}
  `;

  const removeButton = wrapper.querySelector("button");
  removeButton.addEventListener("click", () => wrapper.remove());
  return wrapper;
};

const renderReviewForms = (extraction) => {
  elements.companyName.value = extraction.company.name || "";
  elements.companyForm.value = extraction.company.form || "";
  elements.companyLicense.value = extraction.company.commercialLicense || "";
  elements.companyAddress.value = extraction.company.registeredAddress || "";
  elements.companyJurisdiction.value = extraction.company.jurisdiction || "";

  elements.directorsList.innerHTML = "";
  extraction.directors.forEach((director, index) => {
    const item = createListItem({
      title: `Director ${index + 1}`,
      fields: [
        { label: "Name", name: "name", value: director.name, placeholder: "Full name" },
        { label: "Appointment method", name: "appointmentMethod", value: director.appointmentMethod, placeholder: "Appointed by shareholders" },
        { label: "Signing authority", name: "signingAuthority", value: director.signingAuthority, placeholder: "Joint signatory" },
        { label: "ID / Passport", name: "idNumber", value: director.idNumber, placeholder: "ID or passport number" },
      ],
    });
    elements.directorsList.appendChild(item);
  });

  elements.shareholdersList.innerHTML = "";
  extraction.shareholders.forEach((shareholder, index) => {
    const item = createListItem({
      title: `Shareholder ${index + 1}`,
      fields: [
        { label: "Name", name: "name", value: shareholder.name, placeholder: "Full name" },
        { label: "Ownership %", name: "ownership", value: shareholder.ownership, placeholder: "60%" },
        { label: "Nationality", name: "nationality", value: shareholder.nationality, placeholder: "UAE" },
        { label: "ID / Passport", name: "idNumber", value: shareholder.idNumber, placeholder: "ID or passport number" },
      ],
    });
    elements.shareholdersList.appendChild(item);
  });

  if (!extraction.directors.length) {
    elements.addDirector.click();
  }
  if (!extraction.shareholders.length) {
    elements.addShareholder.click();
  }
};

const gatherListValues = (listElement) =>
  Array.from(listElement.querySelectorAll(".list-item")).map((item) => {
    const fields = item.querySelectorAll("[data-field]");
    const data = {};
    fields.forEach((field) => {
      data[field.dataset.field] = field.value.trim() || null;
    });
    return data;
  });

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
    state.extraction.missingFields.length
      ? "Parsing complete. Please confirm the extracted data and fill missing fields."
      : "Parsing complete. You can upload meeting minutes or emails next."
  );
};

const handleInstructionUpload = async () => {
  const files = elements.instructionUpload.files;
  if (!files.length) {
    return;
  }
  const parsed = await parseDocuments(files, "");
  const combined = parsed.map((doc) => doc.text).join("\n\n");
  elements.instructionText.value = `${elements.instructionText.value.trim()}\n\n${combined}`.trim();
  addChatMessage("Legal AI", "Instruction documents parsed. Review and edit the instructions text.");
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
  addChatMessage("Legal AI", "Data confirmed. You can now generate the resolution.");
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

  elements.resolutionOutput.innerHTML = `<div class="card"><pre>${htmlEscape(state.draft)}</pre></div>`;
  setDownloadState(true);
  addChatMessage("Legal AI", "Draft completed. Download TXT/DOCX and review outputs.");
};

const handleDownloadTxt = () => {
  if (!state.draft) return;
  downloadTxt(state.draft);
};

const handleDownloadDocx = async () => {
  if (!state.draft) return;
  try {
    await downloadDocx(state.draft);
  } catch (error) {
    elements.resolutionOutput.innerHTML = `<div class="card"><p>DOCX export failed: ${htmlEscape(
      error.message
    )}</p></div>`;
  }
};

const handleAddDirector = () => {
  const item = createListItem({
    title: "Director",
    fields: [
      { label: "Name", name: "name", value: "", placeholder: "Full name" },
      { label: "Appointment method", name: "appointmentMethod", value: "", placeholder: "Appointed by shareholders" },
      { label: "Signing authority", name: "signingAuthority", value: "", placeholder: "Joint signatory" },
      { label: "ID / Passport", name: "idNumber", value: "", placeholder: "ID or passport number" },
    ],
  });
  elements.directorsList.appendChild(item);
};

const handleAddShareholder = () => {
  const item = createListItem({
    title: "Shareholder",
    fields: [
      { label: "Name", name: "name", value: "", placeholder: "Full name" },
      { label: "Ownership %", name: "ownership", value: "", placeholder: "60%" },
      { label: "Nationality", name: "nationality", value: "", placeholder: "UAE" },
      { label: "ID / Passport", name: "idNumber", value: "", placeholder: "ID or passport number" },
    ],
  });
  elements.shareholdersList.appendChild(item);
};

const handleLoadSample = () => {
  elements.docText.value = sampleAoA;
  elements.instructionText.value = `${sampleMinutes}\n\n${sampleEmail}`;
  elements.meetingDate.value = new Date().toISOString().split("T")[0];
  elements.meetingLocation.value = "Dubai, United Arab Emirates";
  elements.chairperson.value = "Ms. Sara Al Mansouri";
  addChatMessage("Legal AI", "Sample data loaded. Click parse to start.");
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

renderChunks([]);
renderInstructionAnalysis(null);
renderMissing([]);
refreshJsonOutputs();
setDownloadState(false);
resetChat();
