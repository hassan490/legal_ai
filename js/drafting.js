const formatList = (items) => items.filter(Boolean).map((item) => `- ${item}`).join("\n");

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
OF ${company.name}
(incorporated in the ${company.jurisdiction})\n`;

  const recitals = `WHEREAS:
- The Company is a ${company.form} holding Commercial License ${company.commercialLicense} with registered address at ${company.registeredAddress}.
- The governing documents authorize the following: ${formatList(
    reasoning.authorityChecks.boardPowers.slice(0, 3)
  ) || "- [Authority references to be inserted]"}.
- The meeting has been duly convened in accordance with the notice requirements and quorum rules outlined in the Articles of Association.`;

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
${formatList(attendees)}\n`;

  const signatureBlock = `SIGNATURES:
${formatList(attendees.map((name) => `${name} ____________________________`))}

Note: If any ambiguity remains, escalate for shareholder approval or seek external legal confirmation.`;

  return [preamble, recitals, resolutionBody, execution, signatureBlock].join("\n\n");
};
