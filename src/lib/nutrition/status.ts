// How an amount compares with its target, for rings and bars.

import type { Macros } from "./macros";

export type TargetStatus = "none" | "low" | "good" | "over";

export type Range = { min: number | null; max: number | null };

/**
 * - over: above the upper limit, or above a limit-only target
 * - good: at or above the minimum
 * - low: below the minimum
 * - none: no target to compare with
 */
export function targetStatus(
  amount: number,
  target: Range | null,
): TargetStatus {
  if (!target || (target.min === null && target.max === null)) return "none";
  if (target.max !== null && amount > target.max) return "over";
  if (target.min === null) return "good";
  return amount >= target.min ? "good" : "low";
}

/** The value a bar measures against: the minimum, else the limit. */
export function referenceAmount(target: Range | null): number | null {
  const ref = target?.min ?? target?.max ?? null;
  return ref !== null && ref > 0 ? ref : null;
}

/** Fraction of a reference, never negative. Not capped: 1.4 means 140%. */
export function fractionOf(amount: number, reference: number | null): number {
  if (reference === null || reference <= 0) return 0;
  return Math.max(0, amount / reference);
}

/** Sum the macros of several items, e.g. the entries in one meal slot. */
export function sumMacros(items: { macros: Macros }[]): Macros {
  return items.reduce<Macros>(
    (acc, { macros }) => ({
      kcal: acc.kcal + macros.kcal,
      proteinG: acc.proteinG + macros.proteinG,
      carbsG: acc.carbsG + macros.carbsG,
      fatG: acc.fatG + macros.fatG,
      fiberG: acc.fiberG + macros.fiberG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}
