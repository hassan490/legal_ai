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

  const capture = (label, value) => {
    if (!value) {
      missingFields.push(label);
      return null;
    }
    return value;
  };

  const company = {
    name: capture(
      "Company name",
      findMatches(combined, [/Company Name[:\-\s]+([^\n.]+)/i, /name of the company[:\-\s]+([^\n.]+)/i])
    ),
    form: capture(
      "Legal form",
      findMatches(combined, [/limited liability company|llc|private joint stock/i])
    ),
    jurisdiction: capture(
      "Jurisdiction",
      findMatches(combined, [/United Arab Emirates|UAE|Dubai|Abu Dhabi/i])
    ),
    registeredAddress: capture(
      "Registered address",
      findMatches(combined, [/registered address[:\-\s]+([^\n.]+)/i])
    ),
    commercialLicense: capture(
      "Commercial license number",
      findMatches(combined, [/commercial license(?: no\.?| number)?[:\-\s]+([^\n.]+)/i])
    ),
  };

  const shareholders = sentences
    .filter((sentence) => /shareholder|member/i.test(sentence))
    .slice(0, 5)
    .map((sentence) => {
      const name = findMatches(sentence, [/Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+[A-Za-z\s]+/]);
      if (!name) {
        return null;
      }
      return {
        name,
        nationality: findMatches(sentence, [/nationality[:\-\s]+([^,]+)/i]) || null,
        idNumber: findMatches(sentence, [/passport|emirates id[:\-\s]+([^,]+)/i]) || null,
        ownership: findMatches(sentence, [/([0-9]{1,3}%)/]) || null,
        powerOfAttorney: /power of attorney|poa/i.test(sentence) ? "On file" : null,
      };
    })
    .filter(Boolean);

  if (!shareholders.length) {
    missingFields.push("Shareholder names and ownership");
  }

  const directors = sentences
    .filter((sentence) => /director|manager|authorized signatory/i.test(sentence))
    .slice(0, 5)
    .map((sentence) => {
      const name = findMatches(sentence, [/Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+[A-Za-z\s]+/]);
      if (!name) {
        return null;
      }
      return {
        name,
        idNumber: findMatches(sentence, [/passport|emirates id[:\-\s]+([^,]+)/i]) || null,
        appointmentMethod: /appointed by shareholders/i.test(sentence)
          ? "Appointed by shareholders"
          : null,
        signingAuthority: /sole signatory|joint signatory/i.test(sentence) ? "As specified" : null,
      };
    })
    .filter(Boolean);

  if (!directors.length) {
    missingFields.push("Director/manager names");
  }

  const quorum = {
    board: findMatches(combined, [/board quorum[:\-\s]+([^\n.]+)/i]) || null,
    shareholder: findMatches(combined, [/shareholder quorum[:\-\s]+([^\n.]+)/i]) || null,
    majority: findMatches(combined, [/majority threshold[:\-\s]+([^\n.]+)/i]) || null,
    castingVote: /casting vote/i.test(combined) ? "Chairperson has casting vote" : null,
  };

  const authority = {
    boardPowers: sentences
      .filter((sentence) => /board.*(power|authority|approve|authorize)/i.test(sentence))
      .slice(0, 6),
    shareholderMatters: sentences
      .filter((sentence) => /shareholder.*(reserved|approval|authority)/i.test(sentence))
      .slice(0, 6),
    financialThresholds: findMatches(combined, [/threshold[:\-\s]+([^\n.]+)/i]),
    prohibitedActions: sentences.filter((sentence) => /prohibited|shall not/i.test(sentence)).slice(0, 4),
  };

  const formalities = {
    noticePeriod: findMatches(combined, [/notice period[:\-\s]+([^\n.]+)/i]) || null,
    meetingLocation: findMatches(combined, [/meeting location[:\-\s]+([^\n.]+)/i]) || null,
    chairperson: findMatches(combined, [/chairperson[:\-\s]+([^\n.]+)/i]) || null,
    language: findMatches(combined, [/language[:\-\s]+([^\n.]+)/i]) || null,
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
