const formatList = (items) => items.filter(Boolean).map((item) => `- ${item}`).join("\n");

const displayValue = (value, fallback) => (value ? value : fallback);

const formatDate = (value) => {
  if (!value) {
    return "[Date]";
  }
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const draftResolution = ({ extraction, reasoning, meeting }) => {
  const company = extraction.company;
  const directors = extraction.directors.map((director) => director.name).filter(Boolean);
  const shareholders = extraction.shareholders.map((shareholder) => shareholder.name).filter(Boolean);
  const attendees = reasoning.resolutionType.toLowerCase().includes("shareholder")
    ? shareholders
    : directors;

  const preamble = `RESOLUTION OF THE ${reasoning.resolutionType.toUpperCase()}
OF ${displayValue(company.name, "[Company name missing]")}
(incorporated in the ${displayValue(company.jurisdiction, "[Jurisdiction missing]")})\n`;

  const recitals = `WHEREAS:
- The Company is a ${displayValue(company.form, "[Legal form missing]")} holding Commercial License ${displayValue(
    company.commercialLicense,
    "[License number missing]"
  )} with registered address at ${displayValue(company.registeredAddress, "[Registered address missing]")}.
- The governing documents authorize the following: ${formatList(
    reasoning.authorityChecks.boardPowers.slice(0, 3)
  ) || "- [Authority references to be inserted]"}.
- The meeting has been duly convened in accordance with notice and quorum requirements set out in the Articles of Association.`;

  const resolutionBody = `IT IS RESOLVED THAT:
${formatList(reasoning.actions)}

AUTHORITY & COMPLIANCE:
- Required authority: ${reasoning.requiredAuthority}.
- Applicable legal framework: ${reasoning.legalFramework}.
- References: ${reasoning.references
    .map((ref) => `${ref.heading || "Section"} (${ref.source})`)
    .slice(0, 4)
    .join("; ") || "[Insert Article references]"}.
`;

  const execution = `EXECUTION:
Signed on ${formatDate(meeting.date)} at ${meeting.location || "[Location]"}.
Chairperson: ${meeting.chairperson || "[Name]"}

Attendees:
${formatList(attendees.length ? attendees : ["[No attendees detected]"])}\n`;

  const signatureBlock = `SIGNATURES:
${formatList(attendees.map((name) => `${name} ____________________________`))}

Note: If any ambiguity remains, escalate for shareholder approval or seek external legal confirmation.`;

  return [preamble, recitals, resolutionBody, execution, signatureBlock].join("\n\n");
};
