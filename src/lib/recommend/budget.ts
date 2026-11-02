// Slot budget (SPEC.md "Macro fit"): remaining today times the slot's
// share. Dinner takes everything left.

import type { MealSlot } from "@/lib/db/enums";
import type { Macros } from "@/lib/nutrition/macros";

export const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.3,
  lunch: 0.45,
  snack: 0.25,
  dinner: 1,
};

export type Budget = Pick<Macros, "kcal" | "proteinG" | "carbsG" | "fatG">;

export function slotBudget(remaining: Macros, slot: MealSlot): Budget {
  const share = SLOT_SHARE[slot];
  return {
    kcal: remaining.kcal * share,
    proteinG: remaining.proteinG * share,
    carbsG: remaining.carbsG * share,
    fatG: remaining.fatG * share,
  };
}
