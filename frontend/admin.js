const statusValues = ["Submitted", "Under Review", "Field Assigned", "Resolved"];

const elements = {
  adminLoginSection: document.querySelector("#adminLoginSection"),
  dashboardSection: document.querySelector("#dashboardSection"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminPassword: document.querySelector("#adminPassword"),
  loginMessage: document.querySelector("#loginMessage"),
  logoutBtn: document.querySelector("#logoutBtn"),
  statsGrid: document.querySelector("#statsGrid"),
  statusBreakdown: document.querySelector("#statusBreakdown"),
  categoryBreakdown: document.querySelector("#categoryBreakdown"),
  complaintsBody: document.querySelector("#complaintsBody"),
  tableMessage: document.querySelector("#tableMessage")
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
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function requestJson(url, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    ...options,
    headers
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : {};

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function setLoginMessage(message, isError = false) {
  elements.loginMessage.textContent = message;
  elements.loginMessage.classList.toggle("status-error", Boolean(isError));
}

function showLogin(message, isError = false) {
  elements.adminLoginSection.classList.remove("hidden");
  elements.dashboardSection.classList.add("hidden");

  if (message) {
    setLoginMessage(message, isError);
  }
}

function showDashboard() {
  elements.adminLoginSection.classList.add("hidden");
  elements.dashboardSection.classList.remove("hidden");
  setLoginMessage("Admin session active.");
}

function renderStats(summary) {
  const cards = [
    { label: "Total complaints", value: summary.totalComplaints ?? 0 },
    { label: "Open complaints", value: summary.openComplaints ?? 0 },
    { label: "Submitted today", value: summary.submittedToday ?? 0 },
    { label: "Resolved today", value: summary.resolvedToday ?? 0 }
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderBreakdown(container, items) {
  if (!items?.length) {
    container.innerHTML = `<div class="status-strip">No complaint data available yet.</div>`;
    return;
  }

  const maxValue = Math.max(1, ...items.map((item) => item.count));

  container.innerHTML = items
    .map(
      (item) => `
        <article class="breakdown-item">
          <header>
            <span>${escapeHtml(item.label)}</span>
            <span>${item.count}</span>
          </header>
          <div class="bar">
            <div class="bar-fill" style="width: ${(item.count / maxValue) * 100}%"></div>
          </div>
        </article>
      `
    )
    .join("");
}

async function updateStatus(trackingId, status) {
  const payload = await requestJson(`/api/admin/complaints/${trackingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  return payload.complaint;
}

function renderComplaints(complaints) {
  if (!complaints.length) {
    elements.tableMessage.textContent = "No complaints filed yet.";
    elements.complaintsBody.innerHTML = "";
    return;
  }

  elements.tableMessage.textContent = `${complaints.length} complaints loaded.`;
  elements.complaintsBody.innerHTML = complaints
    .map(
      (complaint) => `
        <tr>
          <td><span class="tracking-chip">${escapeHtml(complaint.trackingId)}</span></td>
          <td>
            <strong>${escapeHtml(complaint.citizenName || "Anonymous")}</strong><br />
            <span>${escapeHtml(complaint.phoneNumber || "-")}</span>
          </td>
          <td>
            <strong>${escapeHtml(complaint.category?.label || "Other")}</strong><br />
            <span>${escapeHtml(complaint.category?.department || "-")}</span>
          </td>
          <td>
            <strong>${escapeHtml(complaint.area || complaint.location?.address || "-")}</strong><br />
            <span>${
              complaint.location?.latitude
                ? `${complaint.location.latitude.toFixed(4)}, ${complaint.location.longitude.toFixed(4)}`
                : "Coordinates unavailable"
            }</span>
          </td>
          <td>${escapeHtml(complaint.description || complaint.transcript || "-")}</td>
          <td>
            <select class="status-select" data-tracking-id="${complaint.trackingId}">
              ${statusValues
                .map(
                  (status) =>
                    `<option value="${status}" ${
                      complaint.status === status ? "selected" : ""
                    }>${status}</option>`
                )
                .join("")}
            </select>
          </td>
          <td>${formatDate(complaint.createdAt)}</td>
        </tr>
      `
    )
    .join("");

  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const trackingId = event.target.dataset.trackingId;
      const nextStatus = event.target.value;
      elements.tableMessage.textContent = `Updating ${trackingId}...`;

      try {
        await updateStatus(trackingId, nextStatus);
        elements.tableMessage.textContent = `${trackingId} updated to ${nextStatus}.`;
        await boot();
      } catch (error) {
        if (error.status === 401) {
          showLogin("Admin session expired. Please sign in again.", true);
          return;
        }

        elements.tableMessage.textContent = error.message;
      }
    });
  });
}

async function boot() {
  const [summary, complaintsPayload] = await Promise.all([
    requestJson("/api/admin/summary"),
    requestJson("/api/admin/complaints")
  ]);

  renderStats(summary);
  renderBreakdown(elements.statusBreakdown, summary.byStatus || []);
  renderBreakdown(elements.categoryBreakdown, summary.byCategory || []);
  renderComplaints(complaintsPayload.complaints || []);
}

async function checkSession() {
  const payload = await requestJson("/api/admin/session");
  return Boolean(payload.authenticated);
}

async function handleLogin(event) {
  event.preventDefault();
  const password = elements.adminPassword.value.trim();

  if (!password) {
    setLoginMessage("Admin password is required.", true);
    return;
  }

  setLoginMessage("Checking admin credentials...");

  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });

    elements.adminPassword.value = "";
    showDashboard();
    elements.tableMessage.textContent = "Loading dashboard...";
    await boot();
  } catch (error) {
    setLoginMessage(error.message, true);
  }
}

async function handleLogout() {
  await requestJson("/api/admin/logout", {
    method: "POST"
  });
  showLogin("Logged out successfully.");
}

async function initializePage() {
  try {
    const authenticated = await checkSession();

    if (!authenticated) {
      showLogin();
      return;
    }

    showDashboard();
    elements.tableMessage.textContent = "Loading dashboard...";
    await boot();
  } catch (error) {
    showLogin(error.message || "Unable to verify admin session.", true);
  }
}

elements.adminLoginForm.addEventListener("submit", handleLogin);
elements.logoutBtn.addEventListener("click", () => {
  handleLogout().catch((error) => {
    setLoginMessage(error.message || "Unable to log out.", true);
  });
});

initializePage().catch((error) => {
  showLogin(error.message || "Dashboard failed to load.", true);
});
