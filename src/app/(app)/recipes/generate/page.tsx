import type { Metadata } from "next";

import { llmConfigured } from "@/lib/llm/client";
import { MEAL_SLOTS, type MealSlot } from "@/lib/db/enums";

import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Generate a recipe" };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; q?: string }>;
}) {
  const { slot, q } = await searchParams;
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8">
      <div>
        <h1 className="text-2xl">Generate a recipe</h1>
        <p className="mt-2 text-ink-muted">
          Claude writes the recipe from the foods you already log, and your food
          rules are applied. Then Mise matches every ingredient to USDA data and
          computes the nutrition itself. If it misses your targets by more than
          10%, or needs more than 2 new ingredients, Claude gets one chance to
          revise.
        </p>
      </div>
      {llmConfigured() ? (
        <GenerateForm
          initialSlot={
            (MEAL_SLOTS.find((s) => s === slot) as MealSlot) ?? "dinner"
          }
          initialRequest={q ?? ""}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-ink-muted">
          AI recipes are not set up on this server yet. Add an ANTHROPIC_API_KEY
          to enable them. You can still create recipes by hand.
        </p>
      )}
    </div>
  );
}
