import type { Metadata } from "next";

import { BackLink } from "@/components/foods/back-link";
import { MealEditor } from "@/components/foods/meal-editor";
import { MEAL_SLOTS, type MealSlot } from "@/lib/db/enums";
import { isIsoDate } from "@/lib/nutrition/dates";

export const metadata: Metadata = { title: "New meal" };

export default async function NewMealPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; slot?: string }>;
}) {
  const { date, slot } = await searchParams;
  // "Save as meal" on Today links here with the day and slot to copy.
  const fromSlot = MEAL_SLOTS.find((s) => s === slot) as MealSlot | undefined;
  const from =
    date && isIsoDate(date) && fromSlot ? { date, slot: fromSlot } : undefined;

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-2">
        <BackLink href="/foods/meals" label="Saved meals" />
        <h1 className="text-2xl">New meal</h1>
        <p className="text-sm text-ink-muted">
          {from
            ? "Starts with what you logged. Change anything, then save it to log it again in one go."
            : "Combine foods and recipes you eat together, then log them in one go."}
        </p>
      </header>
      <MealEditor {...(from ? { from } : {})} />
    </div>
  );
}
