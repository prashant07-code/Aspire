export function createStatusHistoryEntry(status, changedAt, note = "") {
  return {
    status: String(status || "").trim() || "Submitted",
    changedAt: changedAt || new Date().toISOString(),
    note: String(note || "").trim()
  };
}

export function ensureStatusHistory(record) {
  if (!record) {
    return record;
  }

  const normalizedHistory = Array.isArray(record.statusHistory)
    ? record.statusHistory
        .map((entry) =>
          createStatusHistoryEntry(
            entry?.status || record.status || "Submitted",
            entry?.changedAt || record.updatedAt || record.createdAt,
            entry?.note || ""
          )
        )
        .filter(Boolean)
    : [];

  if (normalizedHistory.length) {
    return {
      ...record,
      statusHistory: normalizedHistory
    };
  }

  return {
    ...record,
    statusHistory: [
      createStatusHistoryEntry(
        record.status || "Submitted",
        record.updatedAt || record.createdAt,
        record.status === "Submitted"
          ? "Complaint submitted successfully."
          : "Latest complaint status."
      )
    ]
  };
}
