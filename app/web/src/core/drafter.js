const formatHeader = (result, format) => {
  const today = new Date().toISOString().split("T")[0];
  const formatLabel = format === "memo" ? "Memo" : format === "brief" ? "Brief" : "Resolution";
  return [
    `Draft ${formatLabel}`,
    `Date: ${today}`,
    `Document Type: ${result.documentType}`,
    `Company: ${result.companyName || "TBD"}`,
  ].join("\n");
};

const renderSection = (title, lines) => {
  if (!lines || lines.length === 0) {
    return `${title}\n- Not provided`;
  }
  const formatted = Array.isArray(lines) ? lines : [lines];
  return `${title}\n${formatted.map((line) => `- ${line}`).join("\n")}`;
};

const buildChecklist = (result) => [
  "Confirm board approval form (written resolution vs meeting minutes).",
  "Verify registered office address matches filings.",
  "Check quorum and notice requirements referenced in Articles.",
  result.authorities.length
    ? "Cross-check relevant Companies Act sections cited."
    : "Confirm legal authority citations with counsel.",
];

const buildRiskNotes = (result) => {
  const risks = [];
  if (!result.companyName) risks.push("Company name missing.");
  if (!result.registeredOffice) risks.push("Registered office not detected.");
  if (!result.keyClauses.length) risks.push("Key clauses not detected.");
  if (!result.actionItems.length) risks.push("No action items detected in correspondence.");
  return risks.length ? risks : ["No critical gaps detected from the extracted text."];
};

export const buildDraft = ({
  result,
  instructions,
  format,
  includeRisk,
  includeChecklist,
  includeTimeline,
  includeClauseMap,
}) => {
  const sections = [
    renderSection("Registered Office", result.registeredOffice || ""),
    renderSection("Key Dates", result.keyDates),
    renderSection("Directors", result.directors),
    renderSection("Share Capital", result.shareCapital || ""),
    renderSection("Objectives", result.objectives),
    renderSection("Key Clauses", result.keyClauses),
    renderSection("Governance Notes", result.governanceNotes),
    renderSection(
      "Parties",
      result.parties.map((party) => `${party.name} (${party.role})`)
    ),
    renderSection("Action Items", result.actionItems),
    renderSection("Authorities", result.authorities),
  ];

  if (includeTimeline) {
    sections.push(
      renderSection(
        "Timeline",
        result.timeline.map((item) => `${item.date} — ${item.summary}`)
      )
    );
  }

  if (includeClauseMap) {
    sections.push(
      renderSection(
        "Clause Map",
        result.clauseMap.map((item) => `${item.label} — ${item.summary}`)
      )
    );
  }

  if (includeRisk) {
    sections.push(renderSection("Risk Flags", buildRiskNotes(result)));
  }

  if (includeChecklist) {
    sections.push(renderSection("Filing Checklist", buildChecklist(result)));
  }

  return [
    formatHeader(result, format),
    "",
    "Instructions:",
    instructions || "None provided.",
    "",
    sections.join("\n\n"),
    "",
    "Prepared by the Legal AI Drafting Studio.",
  ].join("\n");
};
