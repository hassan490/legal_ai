const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadTxt = (content, filename = "resolution.txt") => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
};

export const downloadDocx = async (content, filename = "resolution.docx") => {
  if (!window.docx) {
    throw new Error("DOCX library not available.");
  }
  const { Document, Packer, Paragraph, TextRun } = window.docx;
  const lines = content.split("\n");
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: lines.map((line) =>
          new Paragraph({
            children: [new TextRun(line || " ")],
          })
        ),
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
};
