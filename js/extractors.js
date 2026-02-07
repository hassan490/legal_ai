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

export const extractLegalData = (chunks) => {
  const combined = chunks.map((chunk) => chunk.body).join(" ");
  const sentences = splitSentences(combined);

  const company = {
    name: findMatches(combined, [/Company Name[:\-\s]+([^\n.]+)/i, /name of the company[:\-\s]+([^\n.]+)/i]) ||
      "[Company Name]",
    form: findMatches(combined, [/limited liability company|llc|private joint stock/i]) || "Limited Liability Company",
    jurisdiction: findMatches(combined, [/United Arab Emirates|UAE|Dubai|Abu Dhabi/i]) || "United Arab Emirates",
    registeredAddress:
      findMatches(combined, [/registered address[:\-\s]+([^\n.]+)/i]) || "[Registered Address]",
    commercialLicense:
      findMatches(combined, [/commercial license(?: no\.?| number)?[:\-\s]+([^\n.]+)/i]) || "[License No.]",
  };

  const shareholders = sentences
    .filter((sentence) => /shareholder|member/i.test(sentence))
    .slice(0, 5)
    .map((sentence, index) => ({
      name: findMatches(sentence, [/Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+[A-Za-z\s]+/]) || `Shareholder ${index + 1}`,
      nationality: findMatches(sentence, [/nationality[:\-\s]+([^,]+)/i]) || "[Nationality]",
      idNumber: findMatches(sentence, [/passport|emirates id[:\-\s]+([^,]+)/i]) || "[ID Number]",
      ownership: findMatches(sentence, [/([0-9]{1,3}%)/]) || "[Ownership %]",
      powerOfAttorney: /power of attorney|poa/i.test(sentence) ? "On file" : "Not specified",
    }));

  const directors = sentences
    .filter((sentence) => /director|manager|authorized signatory/i.test(sentence))
    .slice(0, 5)
    .map((sentence, index) => ({
      name: findMatches(sentence, [/Mr\.?|Ms\.?|Mrs\.?|Dr\.?\s+[A-Za-z\s]+/]) || `Director ${index + 1}`,
      idNumber: findMatches(sentence, [/passport|emirates id[:\-\s]+([^,]+)/i]) || "[ID Number]",
      appointmentMethod: /appointed by shareholders/i.test(sentence)
        ? "Appointed by shareholders"
        : "Board appointment",
      signingAuthority: /sole signatory|joint signatory/i.test(sentence)
        ? "As specified"
        : "To be determined",
    }));

  const quorum = {
    board: findMatches(combined, [/board quorum[:\-\s]+([^\n.]+)/i]) || "Majority of directors",
    shareholder: findMatches(combined, [/shareholder quorum[:\-\s]+([^\n.]+)/i]) || "Shareholders holding >50%",
    majority: findMatches(combined, [/majority threshold[:\-\s]+([^\n.]+)/i]) || "Simple majority",
    castingVote: /casting vote/i.test(combined) ? "Chairperson has casting vote" : "No casting vote stated",
  };

  const authority = {
    boardPowers: sentences
      .filter((sentence) => /board.*(power|authority|approve)/i.test(sentence))
      .slice(0, 6),
    shareholderMatters: sentences
      .filter((sentence) => /shareholders.*(reserved|approval|authority)/i.test(sentence))
      .slice(0, 6),
    financialThresholds:
      findMatches(combined, [/threshold[:\-\s]+([^\n.]+)/i]) || "No explicit thresholds located",
    prohibitedActions: sentences.filter((sentence) => /prohibited|shall not/i.test(sentence)).slice(0, 4),
  };

  const formalities = {
    noticePeriod: findMatches(combined, [/notice period[:\-\s]+([^\n.]+)/i]) || "[Notice period]",
    meetingLocation: findMatches(combined, [/meeting location[:\-\s]+([^\n.]+)/i]) || "UAE",
    chairperson: findMatches(combined, [/chairperson[:\-\s]+([^\n.]+)/i]) || "[Chairperson]",
    language: findMatches(combined, [/language[:\-\s]+([^\n.]+)/i]) || "English/Arabic",
  };

  return {
    company,
    shareholders,
    directors,
    quorum,
    authority,
    formalities,
    citations: chunks.map((chunk) => ({
      heading: chunk.heading,
      source: chunk.source,
    })),
  };
};
