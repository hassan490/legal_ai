import { sampleText } from "./data/sample.js";
import { parseDocument } from "./core/parser.js";
import { buildDraft } from "./core/drafter.js";
import {
  renderSummary,
  renderTimeline,
  renderOutputs,
  renderClauseMap,
} from "./ui/render.js";
import { setupInteractions } from "./ui/interactions.js";

const state = {
  format: "resolution",
  includeRisk: true,
  includeChecklist: true,
  includeTimeline: true,
  includeClauseMap: true,
};

const elements = {
  documentText: document.getElementById("documentText"),
  documentFile: document.getElementById("documentFile"),
  instructions: document.getElementById("instructions"),
  generateDraft: document.getElementById("generateDraft"),
  downloadDraft: document.getElementById("downloadDraft"),
  downloadJson: document.getElementById("downloadJson"),
  loadSample: document.getElementById("loadSample"),
  summaryGrid: document.getElementById("summaryGrid"),
  authorityList: document.getElementById("authorityList"),
  timeline: document.getElementById("timeline"),
  clauseMap: document.getElementById("clauseMap"),
  draftOutput: document.getElementById("draftOutput"),
  jsonOutput: document.getElementById("jsonOutput"),
  chipGroup: document.getElementById("outputFormat"),
  includeRisk: document.getElementById("includeRisk"),
  includeChecklist: document.getElementById("includeChecklist"),
  includeTimeline: document.getElementById("includeTimeline"),
  includeClauseMap: document.getElementById("includeClauseMap"),
};

const runPipeline = () => {
  const documentText = elements.documentText.value.trim();
  if (!documentText) {
    elements.draftOutput.textContent = "Please paste or upload a document.";
    return;
  }

  const result = parseDocument(documentText);
  const draft = buildDraft({
    result,
    instructions: elements.instructions.value.trim(),
    format: state.format,
    includeRisk: state.includeRisk,
    includeChecklist: state.includeChecklist,
    includeTimeline: state.includeTimeline,
    includeClauseMap: state.includeClauseMap,
  });

  renderSummary(elements, result);
  renderTimeline(elements, result);
  if (state.includeClauseMap) {
    renderClauseMap(elements, result);
  } else {
    renderClauseMap(elements, { clauseMap: [] });
  }
  renderOutputs(elements, result, draft);
};

setupInteractions({
  elements,
  state,
  sampleText,
  onGenerate: runPipeline,
});

renderSummary(elements, {
  documentType: "AOA/MOA",
  companyName: "",
  registeredOffice: "",
  keyDates: [],
  directors: [],
  shareCapital: "",
  authorities: [],
});
renderTimeline(elements, { timeline: [] });
renderClauseMap(elements, { clauseMap: [] });
