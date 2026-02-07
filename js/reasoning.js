import { normalizeText, splitSentences } from "./utils.js";

const detectResolutionType = (instructions, authority) => {
  const text = instructions.toLowerCase();
  if (/amend|capital increase|merger|dissolution/.test(text)) {
    return "Special Shareholder Resolution";
  }
  if (/appoint director|open branch|bank account|signing authority/.test(text)) {
    return "Board Resolution";
  }
  if (authority.shareholderMatters.length) {
    return "Shareholder Resolution";
  }
  return "Board Resolution";
};

const detectAuthorityThreshold = (instructions) => {
  const text = instructions.toLowerCase();
  if (/unanimous|all shareholders/.test(text)) {
    return "Unanimous";
  }
  if (/special resolution|supermajority/.test(text)) {
    return "Supermajority";
  }
  return "Standard Majority";
};

const formalizeAction = (action) => {
  const normalized = action.toLowerCase();
  if (/open.*branch/.test(normalized)) {
    return "Approve the establishment of the proposed branch in accordance with applicable UAE regulations.";
  }
  if (/appoint.*manager/.test(normalized)) {
    return "Approve the appointment of the proposed manager and grant operational authority as described.";
  }
  if (/bank account/.test(normalized)) {
    return "Authorize the opening and operation of the Company bank account(s) on the approved terms.";
  }
  if (/lease|rental/.test(normalized)) {
    return "Approve the execution of the relevant lease documentation within the stated financial limits.";
  }
  if (/signing authority/.test(normalized)) {
    return "Grant signing authority to the specified individual(s) within approved limits.";
  }
  if (/capital|share capital/.test(normalized)) {
    return "Approve the relevant share capital action subject to shareholder consent requirements.";
  }
  if (!action.trim()) {
    return "[Action details required]";
  }
  return `Approve the following action: ${action.replace(/^[^a-zA-Z0-9]+/, "").trim()}.`;
};

export const analyzeInstructions = ({ instructions, extraction, resolutionTypeOverride, authorityOverride }) => {
  const normalized = normalizeText(instructions || "");
  const actions = splitSentences(normalized);
  const legalActions = actions.length ? actions.map(formalizeAction) : ["[Action details required]"];

  const resolutionType =
    resolutionTypeOverride !== "auto"
      ? resolutionTypeOverride
      : detectResolutionType(normalized, extraction.authority);

  const requiredAuthority =
    authorityOverride !== "auto" ? authorityOverride : detectAuthorityThreshold(normalized);

  const warnings = [...(extraction.warnings || [])];
  if (!normalized) {
    warnings.push("No instructions provided. Please input meeting minutes or instructions.");
  }

  if (/shareholder/.test(resolutionType.toLowerCase()) && extraction.shareholders.length === 0) {
    warnings.push("Shareholder resolution requested but no shareholders detected in documents.");
  }

  if (/board/.test(resolutionType.toLowerCase()) && extraction.directors.length === 0) {
    warnings.push("Board resolution requested but no directors/managers detected in documents.");
  }

  if (normalized && extraction.authority.prohibitedActions.length) {
    warnings.push("Check prohibited actions clauses for potential conflict.");
  }

  const authorityChecks = {
    boardPowers: extraction.authority.boardPowers,
    shareholderMatters: extraction.authority.shareholderMatters,
    financialThresholds: extraction.authority.financialThresholds,
    requiredAuthority,
  };

  return {
    resolutionType,
    requiredAuthority,
    actions: actions.length ? actions : ["No actions detected"],
    legalActions,
    warnings,
    authorityChecks,
    references: extraction.citations,
    legalFramework: "UAE Federal Decree-Law No. 32 of 2021",
  };
};
