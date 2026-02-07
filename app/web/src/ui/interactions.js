export const setupInteractions = ({ elements, state, sampleText, onGenerate }) => {
  elements.documentFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      elements.documentText.value = reader.result;
    };
    reader.readAsText(file);
  });

  elements.generateDraft.addEventListener("click", onGenerate);

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

  elements.includeRisk.addEventListener("change", () => {
    state.includeRisk = elements.includeRisk.checked;
  });
  elements.includeChecklist.addEventListener("change", () => {
    state.includeChecklist = elements.includeChecklist.checked;
  });
  elements.includeTimeline.addEventListener("change", () => {
    state.includeTimeline = elements.includeTimeline.checked;
  });
};
