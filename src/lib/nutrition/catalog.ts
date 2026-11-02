// The nutrients Mise tracks, keyed by USDA FoodData Central nutrient id.
// Ids were checked against FDC nutrient.csv (Foundation 2026-04-30).

export type NutrientCategory =
  "energy" | "macro" | "vitamin" | "mineral" | "lipid" | "amino_acid" | "other";

export type NutrientUnit = "kcal" | "g" | "mg" | "µg";

export type NutrientDef = {
  id: number;
  name: string;
  unit: NutrientUnit;
  category: NutrientCategory;
};

export const N = {
  energy: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugars: 2000,
  addedSugars: 1235,
  sodium: 1093,
} as const;

// Listed in display order within each category.
export const NUTRIENTS: NutrientDef[] = [
  { id: 1008, name: "Energy", unit: "kcal", category: "energy" },

  { id: 1003, name: "Protein", unit: "g", category: "macro" },
  { id: 1005, name: "Carbohydrate", unit: "g", category: "macro" },
  { id: 1004, name: "Total fat", unit: "g", category: "macro" },
  { id: 1079, name: "Fiber", unit: "g", category: "macro" },
  { id: 2000, name: "Total sugars", unit: "g", category: "macro" },
  { id: 1235, name: "Added sugars", unit: "g", category: "macro" },

  { id: 1106, name: "Vitamin A", unit: "µg", category: "vitamin" },
  { id: 1162, name: "Vitamin C", unit: "mg", category: "vitamin" },
  { id: 1114, name: "Vitamin D", unit: "µg", category: "vitamin" },
  { id: 1109, name: "Vitamin E", unit: "mg", category: "vitamin" },
  { id: 1185, name: "Vitamin K", unit: "µg", category: "vitamin" },
  { id: 1165, name: "Thiamin (B1)", unit: "mg", category: "vitamin" },
  { id: 1166, name: "Riboflavin (B2)", unit: "mg", category: "vitamin" },
  { id: 1167, name: "Niacin (B3)", unit: "mg", category: "vitamin" },
  { id: 1170, name: "Pantothenic acid (B5)", unit: "mg", category: "vitamin" },
  { id: 1175, name: "Vitamin B6", unit: "mg", category: "vitamin" },
  { id: 1178, name: "Vitamin B12", unit: "µg", category: "vitamin" },
  { id: 1190, name: "Folate", unit: "µg", category: "vitamin" },
  { id: 1180, name: "Choline", unit: "mg", category: "vitamin" },

  { id: 1087, name: "Calcium", unit: "mg", category: "mineral" },
  { id: 1089, name: "Iron", unit: "mg", category: "mineral" },
  { id: 1090, name: "Magnesium", unit: "mg", category: "mineral" },
  { id: 1091, name: "Phosphorus", unit: "mg", category: "mineral" },
  { id: 1092, name: "Potassium", unit: "mg", category: "mineral" },
  { id: 1093, name: "Sodium", unit: "mg", category: "mineral" },
  { id: 1095, name: "Zinc", unit: "mg", category: "mineral" },
  { id: 1098, name: "Copper", unit: "mg", category: "mineral" },
  { id: 1101, name: "Manganese", unit: "mg", category: "mineral" },
  { id: 1103, name: "Selenium", unit: "µg", category: "mineral" },

  { id: 1258, name: "Saturated fat", unit: "g", category: "lipid" },
  { id: 1292, name: "Monounsaturated fat", unit: "g", category: "lipid" },
  { id: 1293, name: "Polyunsaturated fat", unit: "g", category: "lipid" },
  { id: 1257, name: "Trans fat", unit: "g", category: "lipid" },
  { id: 1253, name: "Cholesterol", unit: "mg", category: "lipid" },
  { id: 1404, name: "Omega-3 ALA", unit: "g", category: "lipid" },
  { id: 1278, name: "Omega-3 EPA", unit: "g", category: "lipid" },
  { id: 1272, name: "Omega-3 DHA", unit: "g", category: "lipid" },

  { id: 1221, name: "Histidine", unit: "g", category: "amino_acid" },
  { id: 1212, name: "Isoleucine", unit: "g", category: "amino_acid" },
  { id: 1213, name: "Leucine", unit: "g", category: "amino_acid" },
  { id: 1214, name: "Lysine", unit: "g", category: "amino_acid" },
  { id: 1215, name: "Methionine", unit: "g", category: "amino_acid" },
  { id: 1217, name: "Phenylalanine", unit: "g", category: "amino_acid" },
  { id: 1211, name: "Threonine", unit: "g", category: "amino_acid" },
  { id: 1210, name: "Tryptophan", unit: "g", category: "amino_acid" },
  { id: 1219, name: "Valine", unit: "g", category: "amino_acid" },
];

export const NUTRIENT_BY_ID = new Map(NUTRIENTS.map((n) => [n.id, n]));

/**
 * FDC ids to read when the primary id is missing on a food, in priority
 * order. Foundation foods often report energy only as Atwater factors and
 * carbohydrate only "by summation".
 */
export const IMPORT_FALLBACKS: Record<number, number[]> = {
  1008: [2048, 2047],
  1005: [1050],
  2000: [1063],
};

/** Display groups for Nutrient Bars, per SPEC.md. */
export const BAR_GROUPS: { label: string; category: NutrientCategory }[] = [
  { label: "Vitamins", category: "vitamin" },
  { label: "Minerals", category: "mineral" },
  { label: "Lipids", category: "lipid" },
  { label: "Amino acids", category: "amino_acid" },
];
