const formatList = (items) => items.filter(Boolean).map((item) => `- ${item}`).join("\n");

const formatDate = (value) => {
  if (!value) {
    return "[Date not provided]";
  }
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const safeValue = (value, fallback) => (value ? value : fallback);

export const draftResolution = ({ extraction, reasoning, meeting }) => {
  const company = extraction.company;
  const directors = extraction.directors.map((director) => director.name).filter(Boolean);
  const shareholders = extraction.shareholders.map((shareholder) => shareholder.name).filter(Boolean);

  const attendees = reasoning.resolutionType.toLowerCase().includes("shareholder")
    ? shareholders
    : directors;

  const preamble = `RESOLUTION OF THE ${reasoning.resolutionType.toUpperCase()}
OF ${safeValue(company.name, "[Company name not provided]")}
(incorporated in the ${safeValue(company.jurisdiction, "[Jurisdiction not provided]")})\n`;

  const recitals = `WHEREAS:
- The Company is a ${safeValue(company.form, "[Company form not provided]")} holding Commercial License ${safeValue(
    company.commercialLicense,
    "[License number not provided]"
  )} with registered address at ${safeValue(company.registeredAddress, "[Registered address not provided]")}.
- The governing documents authorize the following: ${formatList(
    reasoning.authorityChecks.boardPowers.slice(0, 3)
  ) || "- [Authority references not located]"}.
- The meeting has been duly convened in accordance with the notice requirements and quorum rules outlined in the Articles of Association.`;

  const resolutionBody = `IT IS RESOLVED THAT:
${formatList(reasoning.legalActions)}

AUTHORITY & COMPLIANCE:
- Required authority: ${reasoning.requiredAuthority}.
- Applicable legal framework: ${reasoning.legalFramework}.
- References: ${reasoning.references
    .map((ref) => `${ref.heading || "Section"} (${ref.source})`)
    .slice(0, 4)
    .join("; ") || "[Insert Article references]"}.
`;

  const execution = `EXECUTION:
Signed on ${formatDate(meeting.date)} at ${safeValue(meeting.location, "[Location not provided]")}.
Chairperson: ${safeValue(meeting.chairperson, "[Chairperson not provided]")}

Attendees:
${attendees.length ? formatList(attendees) : "- [Attendees not identified]"}\n`;

  const signatureBlock = `SIGNATURES:
${attendees.length ? formatList(attendees.map((name) => `${name} ____________________________`)) : "- [Signatories not identified]"}

Note: Any ambiguity must be escalated for shareholder approval or external legal confirmation.`;

  return [preamble, recitals, resolutionBody, execution, signatureBlock].join("\n\n");
};
