// Display rules (SPEC.md rule 7). Values are stored at full precision and
// rounded only here.

import type { NutrientUnit } from "./catalog";

/** Decimal places to show for an amount in a unit. */
export function decimalsFor(amount: number, unit: NutrientUnit): number {
  if (unit === "g") return Math.abs(amount) < 10 ? 1 : 0;
  return 0;
}

/** Round for display, avoiding "-0". */
export function roundForDisplay(amount: number, unit: NutrientUnit): number {
  const d = decimalsFor(amount, unit);
  const rounded = Number(amount.toFixed(d));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** "55.8", "1,284", "62". Unit not included. */
export function formatAmount(amount: number, unit: NutrientUnit): string {
  const d = decimalsFor(amount, unit);
  return roundForDisplay(amount, unit).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/** "55.8 g", "1,284 kcal". */
export function formatWithUnit(amount: number, unit: NutrientUnit): string {
  return `${formatAmount(amount, unit)} ${unit}`;
}

/** "320 kcal left" or "over by 120 kcal" for a remaining value. */
export function formatRemaining(value: number, unit: NutrientUnit): string {
  return value < 0
    ? `over by ${formatWithUnit(-value, unit)}`
    : `${formatWithUnit(value, unit)} left`;
}
