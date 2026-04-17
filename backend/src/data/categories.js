const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

export const complaintStatuses = [
  "Submitted",
  "Under Review",
  "Field Assigned",
  "Resolved"
];

export const complaintCategories = [
  {
    slug: "water",
    label: "Water Supply & Leakage",
    department: "Water Board",
    description: "Water shortage, leakage, low pressure, broken pipelines.",
    keywords: [
      "water",
      "leak",
      "leakage",
      "pipeline",
      "pipe",
      "tank",
      "tap",
      "paani",
      "jal",
      "पानी",
      "जल",
      "नल",
      "लीकेज",
      "पाइप"
    ]
  },
  {
    slug: "sanitation",
    label: "Garbage & Sanitation",
    department: "Sanitation Department",
    description: "Garbage pickup issues, dirty streets, waste overflow.",
    keywords: [
      "garbage",
      "waste",
      "trash",
      "dirty",
      "cleaning",
      "sanitation",
      "kachra",
      "safai",
      "कचरा",
      "सफाई",
      "गंदगी",
      "dump"
    ]
  },
  {
    slug: "roads",
    label: "Roads & Potholes",
    department: "Public Works Department",
    description: "Broken roads, potholes, unsafe streets.",
    keywords: [
      "road",
      "roads",
      "pothole",
      "street",
      "gadda",
      "repair road",
      "सड़क",
      "रोड",
      "गड्ढा",
      "टूटी सड़क"
    ]
  },
  {
    slug: "electricity",
    label: "Electricity",
    department: "Electricity Board",
    description: "Power cuts, damaged poles, exposed wires, transformers.",
    keywords: [
      "electricity",
      "power",
      "light gone",
      "transformer",
      "wire",
      "current",
      "bijli",
      "बिजली",
      "करंट",
      "ट्रांसफॉर्मर",
      "लाइन"
    ]
  },
  {
    slug: "drainage",
    label: "Drainage & Sewage",
    department: "Drainage Department",
    description: "Blocked drains, sewage overflow, flooding due to drainage.",
    keywords: [
      "drain",
      "drainage",
      "sewage",
      "gutter",
      "sewer",
      "nala",
      "नाला",
      "सीवर",
      "गटर",
      "जलभराव",
      "overflow"
    ]
  },
  {
    slug: "streetlights",
    label: "Streetlights",
    department: "Electrical Maintenance",
    description: "Broken streetlights or dark public zones.",
    keywords: [
      "streetlight",
      "street light",
      "pole light",
      "dark road",
      "lamp",
      "बत्ती",
      "स्ट्रीट लाइट",
      "लाइट नहीं",
      "अंधेरा"
    ]
  },
  {
    slug: "safety",
    label: "Safety & Security",
    department: "Police / Safety Cell",
    description: "Harassment, unsafe zone, theft, public safety concerns.",
    keywords: [
      "unsafe",
      "safety",
      "security",
      "theft",
      "harassment",
      "fight",
      "police",
      "चोरी",
      "सुरक्षा",
      "परेशान",
      "मारपीट"
    ]
  },
  {
    slug: "public-health",
    label: "Public Health",
    department: "Health Department",
    description: "Mosquitoes, contamination, health camp, public hygiene risks.",
    keywords: [
      "mosquito",
      "dengue",
      "contamination",
      "hospital",
      "clinic",
      "infection",
      "machhar",
      "मच्छर",
      "डेंगू",
      "स्वास्थ्य",
      "बीमारी"
    ]
  },
  {
    slug: "other",
    label: "Other",
    department: "Citizen Facilitation Desk",
    description: "Anything that does not fit a known category yet.",
    keywords: []
  }
];

export function findCategory(input) {
  const key = normalizeText(input);
  if (!key) {
    return null;
  }

  return (
    complaintCategories.find(
      (category) =>
        normalizeText(category.slug) === key ||
        normalizeText(category.label) === key
    ) || null
  );
}

export function toClientCategory(category) {
  return {
    slug: category.slug,
    label: category.label,
    department: category.department,
    description: category.description
  };
}
