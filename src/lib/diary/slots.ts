import { MEAL_SLOTS, type MealSlot } from "@/lib/db/enums";

export { MEAL_SLOTS };

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};
