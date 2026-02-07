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

export const analyzeInstructions = ({ instructions, extraction, resolutionTypeOverride, authorityOverride }) => {
  const normalized = normalizeText(instructions || "");
  const actions = splitSentences(normalized);

  const resolutionType =
    resolutionTypeOverride !== "auto"
      ? resolutionTypeOverride
      : detectResolutionType(normalized, extraction.authority);

  const requiredAuthority =
    authorityOverride !== "auto" ? authorityOverride : detectAuthorityThreshold(normalized);

  const warnings = [];
  if (!normalized) {
    warnings.push("No instructions provided. Please input meeting minutes or instructions.");
  }

  if (/shareholder/.test(resolutionType.toLowerCase()) && extraction.shareholders.length === 0) {
    warnings.push("Shareholder resolution requested but no shareholders detected in documents.");
  }

  if (/board/.test(resolutionType.toLowerCase()) && extraction.directors.length === 0) {
    warnings.push("Board resolution requested but no directors/managers detected in documents.");
  }

  if (extraction.missingFields?.length) {
    warnings.push(`Missing data: ${extraction.missingFields.join(", ")}.`);
  }

  if (normalized && extraction.authority.prohibitedActions.length) {
    warnings.push("Check prohibited actions clauses for potential conflict.");
  }

  const authorityChecks = {
    boardPowers: extraction.authority.boardPowers,
    shareholderMatters: extraction.authority.shareholderMatters,
    financialThresholds: extraction.authority.financialThresholds || "Not located in source documents",
    requiredAuthority,
  };

  return {
    resolutionType,
    requiredAuthority,
    actions: actions.length ? actions : ["No actions detected"],
    warnings,
    missingFields: extraction.missingFields || [],
    authorityChecks,
    references: extraction.citations,
    legalFramework: "UAE Federal Decree-Law No. 32 of 2021",
  };
};
