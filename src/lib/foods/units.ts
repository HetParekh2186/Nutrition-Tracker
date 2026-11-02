// Portion and unit conversion for the portion picker. Pure, so tested.

import type { MealSlot } from "@/lib/db/enums";

export const GRAMS_PER_OZ = 28.349523125;

/** A way to measure an amount: a food portion or a mass unit. */
export type PortionOption = {
  key: string;
  label: string;
  grams: number;
};

/** Mass units offered for every food, after the food's own portions. */
export const MASS_UNITS: PortionOption[] = [
  { key: "g", label: "g", grams: 1 },
  { key: "oz", label: "oz", grams: GRAMS_PER_OZ },
];

/** Stable key for a portion, so a preview portion matches the loaded one. */
export function portionKey(p: { label: string; grams: number }): string {
  return `portion:${p.label}:${p.grams}`;
}

export function portionOptions(
  portions: { label: string; grams: number }[],
): PortionOption[] {
  return [
    ...portions.map((p) => ({
      key: portionKey(p),
      label: p.label,
      grams: p.grams,
    })),
    ...MASS_UNITS,
  ];
}

/** Grams for a quantity of an option, e.g. 2 x "1 large" (50 g) = 100 g. */
export function gramsFor(quantity: number, option: PortionOption): number {
  return quantity * option.grams;
}

/**
 * What to store as portion_label: "2 x 1 large" style for food portions,
 * nothing for plain mass units (the grams already say it).
 */
export function portionLabelFor(
  quantity: number,
  option: PortionOption,
): string | null {
  if (option.key === "g") return null;
  const qty = Number(quantity.toFixed(2));
  if (option.key === "oz") return `${qty} oz`;
  return qty === 1 ? option.label : `${qty} × ${option.label}`;
}

/** Meal slot to preselect from the local hour. */
export function defaultSlotForHour(hour: number): MealSlot {
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
