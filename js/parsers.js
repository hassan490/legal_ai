import { normalizeText } from "./utils.js";

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const parsePdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `${pageText}\n`;
  }
  return text;
};

const parseDocx = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
};

const runOcr = async (file) => {
  const { data } = await window.Tesseract.recognize(file, "eng", {
    logger: () => {},
  });
  return data.text || "";
};

export const parseDocuments = async (files, textInput) => {
  const parsed = [];
  if (textInput) {
    parsed.push({
      source: "manual input",
      text: normalizeText(textInput),
    });
  }

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    let text = "";

    try {
      if (extension === "pdf") {
        text = await parsePdf(file);
        if (!text.trim()) {
          text = await runOcr(file);
        }
      } else if (extension === "docx") {
        text = await parseDocx(file);
      } else {
        text = await readFileAsText(file);
      }
    } catch (error) {
      text = `Error parsing ${file.name}: ${error.message}`;
    }

    parsed.push({
      source: file.name,
      text: normalizeText(text),
    });
  }

  return parsed;
};

export const chunkArticles = (documents) => {
  const chunks = [];
  documents.forEach((doc) => {
    const lines = doc.text.split(/\n|\r/).filter(Boolean);
    let current = { heading: "", body: "", source: doc.source };

    lines.forEach((line) => {
      const headingMatch = line.match(/^(Article|Clause|Section)\s+([\dIVX]+)[:.\-\s]*(.*)/i);
      if (headingMatch) {
        if (current.body) {
          chunks.push({ ...current });
        }
        current = {
          heading: `${headingMatch[1]} ${headingMatch[2]} ${headingMatch[3]}`.trim(),
          body: "",
          source: doc.source,
        };
      } else {
        current.body += `${line} `;
      }
    });

    if (current.body) {
      chunks.push({ ...current });
    }
  });

  return chunks.map((chunk) => ({
    ...chunk,
    body: normalizeText(chunk.body),
  }));
};
