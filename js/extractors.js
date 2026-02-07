import { splitSentences } from "./utils.js";

const findMatches = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
};

const buildField = (value) => (value && value.trim() ? value.trim() : null);

const buildParty = (sentence, typeLabel) => {
  const name = buildField(findMatches(sentence, [/Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+[A-Za-z\s]+/])) || null;
  return {
    name,
    nationality: buildField(findMatches(sentence, [/nationality[:\-\s]+([^,]+)/i])),
    idNumber: buildField(findMatches(sentence, [/passport|emirates id[:\-\s]+([^,]+)/i])),
    ownership: buildField(findMatches(sentence, [/([0-9]{1,3}%)/])),
    powerOfAttorney: /power of attorney|poa/i.test(sentence) ? "On file" : null,
    sourceSentence: sentence,
    type: typeLabel,
  };
};

export const extractLegalData = (chunks) => {
  const combined = chunks.map((chunk) => chunk.body).join(" ");
  const sentences = splitSentences(combined);

  const company = {
    name: buildField(
      findMatches(combined, [/Company Name[:\-\s]+([^\n.]+)/i, /name of the company[:\-\s]+([^\n.]+)/i])
    ),
    form: buildField(findMatches(combined, [/limited liability company|llc|private joint stock/i])),
    jurisdiction: buildField(findMatches(combined, [/United Arab Emirates|UAE|Dubai|Abu Dhabi/i])),
    registeredAddress: buildField(findMatches(combined, [/registered address[:\-\s]+([^\n.]+)/i])),
    commercialLicense: buildField(
      findMatches(combined, [/commercial license(?: no\.?| number)?[:\-\s]+([^\n.]+)/i])
    ),
  };

  const shareholders = sentences
    .filter((sentence) => /shareholder|member/i.test(sentence))
    .slice(0, 8)
    .map((sentence) => buildParty(sentence, "shareholder"))
    .filter((party) => party.name || party.nationality || party.idNumber || party.ownership);

  const directors = sentences
    .filter((sentence) => /director|manager|authorized signatory/i.test(sentence))
    .slice(0, 8)
    .map((sentence) => ({
      ...buildParty(sentence, "director"),
      appointmentMethod: /appointed by shareholders/i.test(sentence) ? "Appointed by shareholders" : null,
      signingAuthority: /sole signatory|joint signatory/i.test(sentence) ? "As specified" : null,
    }))
    .filter((party) => party.name || party.idNumber || party.appointmentMethod || party.signingAuthority);

  const quorum = {
    board: buildField(findMatches(combined, [/board quorum[:\-\s]+([^\n.]+)/i])),
    shareholder: buildField(findMatches(combined, [/shareholder quorum[:\-\s]+([^\n.]+)/i])),
    majority: buildField(findMatches(combined, [/majority threshold[:\-\s]+([^\n.]+)/i])),
    castingVote: /casting vote/i.test(combined) ? "Chairperson has casting vote" : null,
  };

  const authority = {
    boardPowers: sentences
      .filter((sentence) => /board.*(power|authority|approve)/i.test(sentence))
      .slice(0, 8),
    shareholderMatters: sentences
      .filter((sentence) => /shareholders.*(reserved|approval|authority)/i.test(sentence))
      .slice(0, 8),
    financialThresholds: buildField(findMatches(combined, [/threshold[:\-\s]+([^\n.]+)/i])),
    prohibitedActions: sentences.filter((sentence) => /prohibited|shall not/i.test(sentence)).slice(0, 6),
  };

  const formalities = {
    noticePeriod: buildField(findMatches(combined, [/notice period[:\-\s]+([^\n.]+)/i])),
    meetingLocation: buildField(findMatches(combined, [/meeting location[:\-\s]+([^\n.]+)/i])),
    chairperson: buildField(findMatches(combined, [/chairperson[:\-\s]+([^\n.]+)/i])),
    language: buildField(findMatches(combined, [/language[:\-\s]+([^\n.]+)/i])),
  };

  const warnings = [];
  if (!company.name) warnings.push("Company name not detected in the documents.");
  if (!company.registeredAddress) warnings.push("Registered address not detected in the documents.");
  if (!company.commercialLicense) warnings.push("Commercial license number not detected in the documents.");
  if (!shareholders.length) warnings.push("No shareholders identified in the documents.");
  if (!directors.length) warnings.push("No directors/managers identified in the documents.");

  return {
    company,
    shareholders,
    directors,
    quorum,
    authority,
    formalities,
    warnings,
    citations: chunks.map((chunk) => ({
      heading: chunk.heading,
      source: chunk.source,
    })),
  };
};
