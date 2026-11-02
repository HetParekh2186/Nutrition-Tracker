// Pure helpers for reading USDA FoodData Central CSV rows. Kept separate
// from the import script so they can be unit-tested.

import {
  IMPORT_FALLBACKS,
  type NutrientUnit,
} from "../../src/lib/nutrition/catalog";

const FDC_UNITS: Record<string, NutrientUnit> = {
  KCAL: "kcal",
  G: "g",
  MG: "mg",
  UG: "µg",
};

export function fdcUnit(unitName: string): NutrientUnit | undefined {
  return FDC_UNITS[unitName.trim().toUpperCase()];
}

/**
 * Collapse the raw FDC nutrient rows for one food into our ids: keep the
 * primary id when present, otherwise the first available fallback id
 * (for example Atwater energy 2048 for Energy 1008).
 */
export function resolveNutrients(
  raw: Map<number, number>,
  wanted: Iterable<number>,
): Map<number, number> {
  const out = new Map<number, number>();
  for (const id of wanted) {
    const direct = raw.get(id);
    if (direct !== undefined) {
      out.set(id, direct);
      continue;
    }
    for (const fallback of IMPORT_FALLBACKS[id] ?? []) {
      const value = raw.get(fallback);
      if (value !== undefined) {
        out.set(id, value);
        break;
      }
    }
  }
  return out;
}

function formatQuantity(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/**
 * Human label for a food_portion row, e.g. "1 cup, chopped" or "2 tbsp".
 * SR Legacy puts the unit text in `modifier` with measure unit 9999
 * ("undetermined"); Foundation uses a real measure unit.
 */
export function portionLabel(row: {
  amount: string;
  unitName?: string;
  modifier: string;
  portionDescription: string;
}): string {
  const qty = formatQuantity(row.amount);
  const unit =
    row.unitName && row.unitName !== "undetermined" ? row.unitName : "";
  const detail = (row.modifier || row.portionDescription || "").trim();
  const parts = [qty, unit, detail].filter(Boolean);
  // "Quantity not specified" style descriptions read better on their own.
  if (!qty && detail) return detail;
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
