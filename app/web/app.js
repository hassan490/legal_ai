const sampleText = `Email 1
From: Laura Whitfield laura.whitfield@bluecrescent.ae
To: Ahmed Al Mansoori ahmed.mansoori@alnoortech.ae
Date: 18 July 2025
Subject: Proposal to Change Registered Office Address
Ahmed,
As discussed informally, Blue Crescent recommends relocating the Company’s registered office to a more cost-effective business center.
Proposed new address:
Unit 903, Aurora Business Centre,
Al Quoz 3, Dubai, UAE.
Please confirm if you agree so we can formalize this by board approval and proceed with DET filings.
Best regards,
Laura`;

const state = {
  format: "resolution",
};

const elements = {
  documentText: document.getElementById("documentText"),
  documentFile: document.getElementById("documentFile"),
  instructions: document.getElementById("instructions"),
  generateDraft: document.getElementById("generateDraft"),
  loadSample: document.getElementById("loadSample"),
  summaryGrid: document.getElementById("summaryGrid"),
  authorityList: document.getElementById("authorityList"),
  draftOutput: document.getElementById("draftOutput"),
  jsonOutput: document.getElementById("jsonOutput"),
  chipGroup: document.getElementById("outputFormat"),
};

const DATE_PATTERN =
  /\b(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g;

const COMPANY_PATTERN =
  /\b([A-Z][A-Za-z0-9&,\.\s]{2,}?\s+(Private Limited|Limited|Ltd\.|LLP|Inc\.|Corporation|Company))\b/;

const ARTICLE_PATTERN = /^(article|clause|section)\s+\d+/i;

function chunkByArticles(text) {
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
}

function extractRegisteredOffice(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^(email|from|to|subject|date)\b/i.test(line)) {
      continue;
    }
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
        if (/^(email|from|to|subject|date)\b/i.test(next)) break;
        if (/^(please|authorize|best|regards|noted|for the record)\b/i.test(next))
          break;
        addressLines.push(next);
      }
      const address = addressLines.join(" ").replace(/,\s*$/, "").trim();
      if (address) return address;
    }
  }
  const fallback = text.match(
    /(registered office|registered address|principal office)[:\-]?\s*(.+)/i
  );
  return fallback ? fallback[2].trim() : "";
}

function extractParties(text) {
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
}

function extractResolutionData(text) {
  const lower = text.toLowerCase();
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

  const companyMatch = text.match(COMPANY_PATTERN);
  const companyName = companyMatch ? companyMatch[1].trim() : "";

  const registeredOffice = extractRegisteredOffice(text);
  const keyDates = [...new Set(text.match(DATE_PATTERN) || [])].sort();

  const keyClauses = text
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
    parties: extractParties(text),
    warnings,
  };
}

function suggestAuthorities(documentType) {
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
}

function draftResolution(result, instructions, format) {
  const header = `Draft ${format === "memo" ? "Memo" : "Resolution"}\\nDate: ${
    new Date().toISOString().split("T")[0]
  }\\nDocument Type: ${result.documentType}\\nCompany: ${
    result.companyName || "TBD"
  }`;

  const sections = [
    ["Registered Office", result.registeredOffice || "Not provided"],
    ["Key Dates", result.keyDates.join(", ") || "Not provided"],
    ["Key Clauses", result.keyClauses.join("; ") || "Not provided"],
    ["Governance Notes", result.governanceNotes.join("; ") || "Not provided"],
    ["Parties", result.parties.map((p) => `${p.name} (${p.role})`).join("; ")],
    ["Warnings", result.warnings.join("; ") || "None"],
  ];

  return [
    header,
    "",
    "Instructions:",
    instructions || "None provided.",
    "",
    ...sections.map(([title, body]) => `${title}\\n- ${body}`),
    "",
    "Prepared by the Legal AI Drafting Studio.",
  ].join("\\n");
}

function renderSummary(result, authorities) {
  const summaryItems = [
    ["Document Type", result.documentType || "Unknown"],
    ["Company", result.companyName || "TBD"],
    ["Registered Office", result.registeredOffice || "Not detected"],
    ["Key Dates", result.keyDates.join(", ") || "Not detected"],
  ];

  elements.summaryGrid.innerHTML = summaryItems
    .map(
      ([title, value]) => `
      <div class="summary-card">
        <h4>${title}</h4>
        <p>${value}</p>
      </div>
    `
    )
    .join("");

  elements.authorityList.innerHTML = authorities
    .map((authority) => `<span class="authority-pill">${authority}</span>`)
    .join("");
}

function handleGenerate() {
  const documentText = elements.documentText.value.trim();
  if (!documentText) {
    elements.draftOutput.textContent = "Please paste or upload a document.";
    return;
  }

  const chunks = chunkByArticles(documentText);
  const result = extractResolutionData(chunks.join("\n"));
  const authorities = suggestAuthorities(result.documentType);
  const draft = draftResolution(result, elements.instructions.value.trim(), state.format);

  renderSummary(result, authorities);
  elements.draftOutput.textContent = draft;
  elements.jsonOutput.textContent = JSON.stringify(
    { ...result, authorities },
    null,
    2
  );
}

elements.documentFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    elements.documentText.value = reader.result;
  };
  reader.readAsText(file);
});

elements.generateDraft.addEventListener("click", handleGenerate);
elements.loadSample.addEventListener("click", () => {
  elements.documentText.value = sampleText;
});

elements.chipGroup.addEventListener("click", (event) => {
  const button = event.target.closest(".chip");
  if (!button) return;
  document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
  button.classList.add("active");
  state.format = button.dataset.format;
});

renderSummary(
  {
    documentType: "AOA/MOA",
    companyName: "",
    registeredOffice: "",
    keyDates: [],
  },
  []
);
