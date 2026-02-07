import { splitSentences } from "./utils.js";

const findMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
};

const pickFirst = (values) => values.find((value) => value && value.trim());

export const extractLegalData = (chunks) => {
  const combined = chunks.map((chunk) => chunk.body).join(" ");
  const sentences = splitSentences(combined);
  const missingFields = [];

  const company = {
    name: pickFirst([
      findMatch(combined, [/Company Name[:\-\s]+([^\n.]+)/i, /name of the company[:\-\s]+([^\n.]+)/i]),
    ]),
    form: pickFirst([findMatch(combined, [/limited liability company|llc|private joint stock|pjsc/i])]),
    jurisdiction: pickFirst([
      findMatch(combined, [/United Arab Emirates|UAE|Dubai|Abu Dhabi|Sharjah|Ajman|RAK/i]),
    ]),
    registeredAddress: pickFirst([
      findMatch(combined, [/registered address[:\-\s]+([^\n.]+)/i, /address[:\-\s]+([^\n.]+)/i]),
    ]),
    commercialLicense: pickFirst([
      findMatch(combined, [/commercial license(?: no\.?| number)?[:\-\s]+([^\n.]+)/i]),
    ]),
  };

  const directors = sentences
    .filter((sentence) => /director|manager|authorized signatory/i.test(sentence))
    .slice(0, 6)
    .map((sentence) => {
      const name = findMatch(sentence, [/Mr\.?\s+[A-Za-z\s]+/, /Ms\.?\s+[A-Za-z\s]+/, /Mrs\.?\s+[A-Za-z\s]+/]);
      if (!name) {
        return null;
      }
      return {
        name: name.trim(),
        appointmentMethod: findMatch(sentence, [/appointed by shareholders|appointed by the shareholders/i]),
        signingAuthority: findMatch(sentence, [/sole signatory|joint signatory|authorized signatory/i]),
        idNumber: findMatch(sentence, [/passport\s*([A-Z0-9-]+)/i, /emirates id\s*([0-9-]+)/i]),
      };
    })
    .filter(Boolean);

  const shareholders = sentences
    .filter((sentence) => /shareholder|member/i.test(sentence))
    .slice(0, 6)
    .map((sentence) => {
      const name = findMatch(sentence, [/Mr\.?\s+[A-Za-z\s]+/, /Ms\.?\s+[A-Za-z\s]+/, /Mrs\.?\s+[A-Za-z\s]+/]);
      if (!name) {
        return null;
      }
      return {
        name: name.trim(),
        nationality: findMatch(sentence, [/nationality[:\-\s]+([^,]+)/i]),
        ownership: findMatch(sentence, [/([0-9]{1,3}%)/]),
        idNumber: findMatch(sentence, [/passport\s*([A-Z0-9-]+)/i, /emirates id\s*([0-9-]+)/i]),
        powerOfAttorney: /power of attorney|poa/i.test(sentence) ? "On file" : null,
      };
    })
    .filter(Boolean);

  const quorum = {
    board: findMatch(combined, [/board quorum[:\-\s]+([^\n.]+)/i]),
    shareholder: findMatch(combined, [/shareholder quorum[:\-\s]+([^\n.]+)/i]),
    majority: findMatch(combined, [/majority threshold[:\-\s]+([^\n.]+)/i]),
  };

  const authority = {
    boardPowers: sentences
      .filter((sentence) => /board.*(power|authority|approve|authorize)/i.test(sentence))
      .slice(0, 6),
    shareholderMatters: sentences
      .filter((sentence) => /shareholder.*(reserved|approval|authority)/i.test(sentence))
      .slice(0, 6),
    financialThresholds: findMatch(combined, [/threshold[:\-\s]+([^\n.]+)/i, /up to\s+AED\s+([0-9,]+)/i]),
    prohibitedActions: sentences.filter((sentence) => /prohibited|shall not/i.test(sentence)).slice(0, 4),
  };

  const formalities = {
    noticePeriod: findMatch(combined, [/notice period[:\-\s]+([^\n.]+)/i]),
    meetingLocation: findMatch(combined, [/meeting location[:\-\s]+([^\n.]+)/i]),
    language: findMatch(combined, [/language[:\-\s]+([^\n.]+)/i]),
  };

  if (!company.name) missingFields.push("Company name");
  if (!company.registeredAddress) missingFields.push("Registered address");
  if (!company.commercialLicense) missingFields.push("Commercial license number");
  if (!directors.length) missingFields.push("Director/manager names");
  if (!shareholders.length) missingFields.push("Shareholder names and ownership");

  return {
    company,
    directors,
    shareholders,
    quorum,
    authority,
    formalities,
    missingFields,
    citations: chunks.map((chunk) => ({
      heading: chunk.heading,
      source: chunk.source,
    })),
  };
};
