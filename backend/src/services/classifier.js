import {
  complaintCategories,
  findCategory,
  toClientCategory
} from "../data/categories.js";

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function fallbackCategory(text) {
  const other = findCategory("other");

  return {
    recommendedCategory: toClientCategory(other),
    confidence: text ? 0.28 : 0,
    requiresValidation: true,
    matchedKeywords: [],
    alternatives: []
  };
}

export function classifyComplaint(text) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return fallbackCategory("");
  }

  const scored = complaintCategories
    .filter((category) => category.slug !== "other")
    .map((category) => {
      const matchedKeywords = [];
      let score = 0;

      for (const keyword of category.keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword) {
          continue;
        }

        if (normalizedText.includes(normalizedKeyword)) {
          matchedKeywords.push(keyword);
          score += normalizedKeyword.includes(" ") || normalizedKeyword.length > 6 ? 2 : 1;
        }
      }

      return {
        category,
        score,
        matchedKeywords
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best || best.score === 0) {
    return fallbackCategory(normalizedText);
  }

  const confidence = Math.min(
    0.96,
    0.32 + (best.score / Math.max(4, best.category.keywords.length)) * 2.1
  );

  return {
    recommendedCategory: toClientCategory(best.category),
    confidence: Number(confidence.toFixed(2)),
    requiresValidation: confidence < 0.6,
    matchedKeywords: best.matchedKeywords,
    alternatives: scored
      .slice(1, 4)
      .filter((entry) => entry.score > 0)
      .map((entry) => ({
        ...toClientCategory(entry.category),
        confidence: Number(
          Math.min(
            0.9,
            0.2 + (entry.score / Math.max(4, entry.category.keywords.length)) * 1.8
          ).toFixed(2)
        )
      }))
  };
}
