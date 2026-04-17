const elements = {
  trackingForm: document.querySelector("#trackingForm"),
  trackingIdInput: document.querySelector("#trackingIdInput"),
  trackingMessage: document.querySelector("#trackingMessage"),
  trackingResult: document.querySelector("#trackingResult"),
  trackingTitle: document.querySelector("#trackingTitle"),
  trackingOverview: document.querySelector("#trackingOverview"),
  trackingDetails: document.querySelector("#trackingDetails"),
  trackingTimeline: document.querySelector("#trackingTimeline")
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character] || character;
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function requestJson(url) {
  const response = await fetch(url);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : {};

  if (!response.ok) {
    const error = new Error(payload.error || "Unable to load complaint.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function getStatusHistory(complaint) {
  if (Array.isArray(complaint.statusHistory) && complaint.statusHistory.length) {
    return complaint.statusHistory;
  }

  return [
    {
      status: complaint.status || "Submitted",
      changedAt: complaint.updatedAt || complaint.createdAt,
      note: "Latest complaint status."
    }
  ];
}

function renderComplaint(complaint) {
  const history = getStatusHistory(complaint);
  const latestUpdate = history[history.length - 1];

  elements.trackingTitle.innerHTML = `
    Tracking ID
    <span class="tracking-chip">${escapeHtml(complaint.trackingId)}</span>
  `;
  elements.trackingOverview.innerHTML = `
    <article class="status-hero">
      <div>
        <span class="status-label">Current status</span>
        <strong>${escapeHtml(complaint.status || "Submitted")}</strong>
      </div>
      <div>
        <span class="status-label">Last updated</span>
        <strong>${escapeHtml(formatDate(latestUpdate?.changedAt || complaint.updatedAt))}</strong>
      </div>
      <div>
        <span class="status-label">Department</span>
        <strong>${escapeHtml(complaint.category?.department || "Citizen Facilitation Desk")}</strong>
      </div>
    </article>
  `;

  const cards = [
    {
      title: "Citizen details",
      content: `
        <p><strong>Name:</strong> ${escapeHtml(complaint.citizenName || "Anonymous")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(complaint.phoneNumber || "-")}</p>
        <p><strong>Area:</strong> ${escapeHtml(complaint.area || "-")}</p>
      `
    },
    {
      title: "Complaint details",
      content: `
        <p><strong>Category:</strong> ${escapeHtml(complaint.category?.label || "Other")}</p>
        <p><strong>Description:</strong> ${escapeHtml(
          complaint.description || complaint.transcript || "-"
        )}</p>
      `
    },
    {
      title: "Location",
      content: `
        <p><strong>Address note:</strong> ${escapeHtml(complaint.location?.address || "-")}</p>
        <p><strong>Coordinates:</strong> ${escapeHtml(
          complaint.location?.latitude
            ? `${complaint.location.latitude.toFixed(5)}, ${complaint.location.longitude.toFixed(5)}`
            : "Coordinates unavailable"
        )}</p>
      `
    },
    {
      title: "Filed on",
      content: `
        <p><strong>Created:</strong> ${escapeHtml(formatDate(complaint.createdAt))}</p>
        <p><strong>Updated:</strong> ${escapeHtml(formatDate(complaint.updatedAt))}</p>
      `
    }
  ];

  elements.trackingDetails.innerHTML = cards
    .map(
      (card) => `
        <article class="detail-card">
          <h4>${card.title}</h4>
          ${card.content}
        </article>
      `
    )
    .join("");

  elements.trackingTimeline.innerHTML = history
    .map(
      (entry) => `
        <article class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <strong>${escapeHtml(entry.status)}</strong>
            <span>${escapeHtml(formatDate(entry.changedAt))}</span>
            <p>${escapeHtml(entry.note || "Status updated.")}</p>
          </div>
        </article>
      `
    )
    .join("");

  elements.trackingResult.classList.remove("hidden");
}

async function fetchComplaint(trackingId) {
  elements.trackingMessage.textContent = `Checking ${trackingId}...`;
  const payload = await requestJson(`/api/complaints/${encodeURIComponent(trackingId)}`);
  renderComplaint(payload.complaint);
  elements.trackingMessage.textContent = `Latest status loaded for ${trackingId}.`;
}

async function handleSubmit(event) {
  event.preventDefault();
  const trackingId = elements.trackingIdInput.value.trim();

  if (!trackingId) {
    elements.trackingMessage.textContent = "Please enter a tracking ID.";
    elements.trackingResult.classList.add("hidden");
    return;
  }

  try {
    await fetchComplaint(trackingId);
  } catch (error) {
    elements.trackingMessage.textContent = error.message;
    elements.trackingResult.classList.add("hidden");
  }
}

elements.trackingForm.addEventListener("submit", handleSubmit);

const presetTrackingId = new URLSearchParams(window.location.search).get("trackingId");

if (presetTrackingId) {
  elements.trackingIdInput.value = presetTrackingId;
  handleSubmit(new Event("submit"));
}
