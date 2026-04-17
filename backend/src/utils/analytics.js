import { complaintCategories, complaintStatuses } from "../data/categories.js";

export function buildSummary(records) {
  const ordered = [...records].sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
  const today = new Date().toISOString().slice(0, 10);

  const byStatus = complaintStatuses.map((status) => ({
    label: status,
    count: ordered.filter((record) => record.status === status).length
  }));

  const categoryMap = new Map(
    complaintCategories.map((category) => [
      category.slug,
      { slug: category.slug, label: category.label, count: 0 }
    ])
  );

  for (const record of ordered) {
    const slug = record.category?.slug || "other";
    const category = categoryMap.get(slug) || categoryMap.get("other");
    category.count += 1;
  }

  const byCategory = [...categoryMap.values()]
    .filter((entry) => entry.count > 0 || entry.slug !== "other")
    .sort((left, right) => right.count - left.count);

  return {
    totalComplaints: ordered.length,
    openComplaints: ordered.filter((record) => record.status !== "Resolved").length,
    submittedToday: ordered.filter(
      (record) => String(record.createdAt || "").slice(0, 10) === today
    ).length,
    resolvedToday: ordered.filter(
      (record) =>
        record.status === "Resolved" &&
        String(record.updatedAt || "").slice(0, 10) === today
    ).length,
    byStatus,
    byCategory,
    recentComplaints: ordered.slice(0, 5)
  };
}
