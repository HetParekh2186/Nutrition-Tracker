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

/** "2", "0.5", "1.33": a quantity rounded for display, no trailing zeros. */
export function formatQuantity(quantity: number): string {
  return String(Number(quantity.toFixed(2)));
}

/**
 * The unit an entry was logged in, read back from its portion_label ("2 ×
 * 1 serving", "1 large", "3 oz"), with the quantity that gives its grams.
 * Falls back to grams when the label names no option.
 */
export function amountFromEntry(
  quantityG: number,
  portionLabel: string | null,
  options: PortionOption[],
): { quantity: number; option: PortionOption } {
  const grams = options.find((o) => o.key === "g")!;
  const label = portionLabel?.trim();
  const named = label
    ? /^[\d.]+ oz$/.test(label)
      ? options.find((o) => o.key === "oz")
      : options.find(
          (o) =>
            o.key !== "g" &&
            o.key !== "oz" &&
            (label === o.label || label.endsWith(` × ${o.label}`)),
        )
    : undefined;
  const option = named ?? grams;
  return { quantity: quantityG / option.grams, option };
}

/**
 * The same weight in the other units, for "= 2 × 1 serving · 17.6 oz".
 * Grams always come first, since every other unit is defined by them.
 */
export function equivalents(
  grams: number,
  options: PortionOption[],
  currentKey: string,
  limit = 3,
): string[] {
  return options
    .filter((o) => o.key !== currentKey)
    .sort((a, b) => Number(b.key === "g") - Number(a.key === "g"))
    .slice(0, limit)
    .map((o) => {
      const q = formatQuantity(grams / o.grams);
      if (o.key === "g" || o.key === "oz") return `${q} ${o.label}`;
      return `${q} × ${o.label}`;
    });
}
