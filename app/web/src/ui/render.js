export const renderSummary = (elements, result) => {
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

  elements.authorityList.innerHTML = (result.authorities || [])
    .map((authority) => `<span class="authority-pill">${authority}</span>`)
    .join("");
};

export const renderTimeline = (elements, result) => {
  if (!elements.timeline) return;
  if (!result.timeline || result.timeline.length === 0) {
    elements.timeline.innerHTML = "<p class=\"subtitle\">No timeline events detected.</p>";
    return;
  }
  elements.timeline.innerHTML = result.timeline
    .map(
      (item) => `
        <div class="timeline-item">
          <strong>${item.date}</strong>
          <span>${item.summary}</span>
        </div>
      `
    )
    .join("");
};

export const renderOutputs = (elements, result, draft) => {
  elements.draftOutput.textContent = draft;
  elements.jsonOutput.textContent = JSON.stringify(result, null, 2);
};
