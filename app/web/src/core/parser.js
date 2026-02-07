import {
  ARTICLE_PATTERN,
  COMPANY_PATTERN,
  DATE_PATTERN,
  REGISTERED_OFFICE_PATTERN,
  EMAIL_HEADER_PATTERN,
  ADDRESS_BREAK_PATTERN,
} from "./patterns.js";

const chunkByArticles = (text) => {
  const lines = text.split("\n");
  const chunks = [];
  let current = [];
  for (const line of lines) {
    if (ARTICLE_PATTERN.test(line.trim())) {
      if (current.length) {
        chunks.push(current.join("\n").trim());
        current = [];
      }
    }
    current.push(line);
  }
  if (current.length) {
    chunks.push(current.join("\n").trim());
  }
  return chunks.filter(Boolean);
};

const extractRegisteredOffice = (text) => {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (EMAIL_HEADER_PATTERN.test(line)) continue;
    const lower = line.toLowerCase();
    if (lower.includes("registered office") || lower.includes("registered address")) {
      const hasDigits = /\d/.test(line);
      if (!(line.endsWith(":") || lower.includes("address") || hasDigits)) {
        continue;
      }
      let cleaned = line.replace(
        /.*registered (office|address)( is| to|:)?/i,
        ""
      );
      cleaned = cleaned.trim().replace(/^[-:]+/, "").trim();
      const addressLines = cleaned ? [cleaned] : [];
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
        const next = lines[j].trim();
        if (!next) break;
        if (EMAIL_HEADER_PATTERN.test(next)) break;
        if (ADDRESS_BREAK_PATTERN.test(next)) break;
        addressLines.push(next);
      }
      const address = addressLines.join(" ").replace(/,\s*$/, "").trim();
      if (address) return address;
    }
  }
  const fallback = text.match(REGISTERED_OFFICE_PATTERN);
  return fallback ? fallback[2].trim() : "";
};

const extractParties = (text) => {
  const parties = [];
  const seen = new Set();
  text.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (/member|shareholder/i.test(trimmed)) {
      const key = `${trimmed}|member`;
      if (!seen.has(key)) {
        parties.push({ name: trimmed, role: "Member/Shareholder" });
        seen.add(key);
      }
    }
    const emailMatch = trimmed.match(/^(from|to):\s*(.+)$/i);
    if (emailMatch) {
      const role = emailMatch[1].toLowerCase() === "from" ? "Sender" : "Recipient";
      const name = emailMatch[2].trim();
      const key = `${name}|${role}`;
      if (!seen.has(key)) {
        parties.push({ name, role });
        seen.add(key);
      }
    }
  });
  return parties;
};

const extractActionItems = (text) => {
  const actions = [];
  text.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (/authorize|approve|resolve|confirm|agree/i.test(trimmed)) {
      actions.push(trimmed);
    }
  });
  return actions.slice(0, 6);
};

const buildTimeline = (text) => {
  const dates = [...new Set(text.match(DATE_PATTERN) || [])].sort();
  return dates.map((date, index) => ({
    id: `${date}-${index}`,
    date,
    summary: "Referenced date in correspondence.",
  }));
};

const suggestAuthorities = (documentType) => {
  const authorities = [];
  const lower = documentType.toLowerCase();
  if (lower.includes("memorandum")) {
    authorities.push("Companies Act - Memorandum clauses (objects, liability, capital).");
  }
  if (lower.includes("articles")) {
    authorities.push("Companies Act - Articles provisions (governance and internal rules).");
  }
  if (!authorities.length) {
    authorities.push("Companies Act - General corporate governance provisions.");
  }
  return authorities;
};

export const parseDocument = (text) => {
  const chunks = chunkByArticles(text);
  const fullText = chunks.join("\n");
  const lower = fullText.toLowerCase();

  let documentType = "AOA/MOA";
  if (lower.includes("articles of association") || lower.includes("articles")) {
    documentType = "Articles of Association";
  }
  if (lower.includes("memorandum of association") || lower.includes("memorandum")) {
    documentType =
      documentType === "Articles of Association"
        ? "Articles + Memorandum of Association"
        : "Memorandum of Association";
  }

  const companyMatch = fullText.match(COMPANY_PATTERN);
  const companyName = companyMatch ? companyMatch[1].trim() : "";

  const registeredOffice = extractRegisteredOffice(fullText);
  const keyDates = [...new Set(fullText.match(DATE_PATTERN) || [])].sort();

  const keyClauses = fullText
    .split("\n")
    .filter((line) => ARTICLE_PATTERN.test(line.trim()))
    .map((line) => line.trim());

  const governanceNotes = [];
  if (lower.includes("quorum")) governanceNotes.push("Quorum requirements mentioned.");
  if (lower.includes("director"))
    governanceNotes.push("Director appointment/removal provisions present.");
  if (lower.includes("meeting"))
    governanceNotes.push("Meeting procedures referenced.");

  const warnings = [];
  if (!companyName) warnings.push("Company name not detected; confirm manually.");
  if (!registeredOffice)
    warnings.push("Registered office not detected; confirm address manually.");

  const timeline = buildTimeline(fullText);

  return {
    documentType,
    companyName,
    registeredOffice,
    keyDates,
    directors: [],
    shareholders: [],
    shareCapital: "",
    objectives: [],
    keyClauses,
    governanceNotes,
    parties: extractParties(fullText),
    actionItems: extractActionItems(fullText),
    timeline,
    authorities: suggestAuthorities(documentType),
    warnings,
  };
};
