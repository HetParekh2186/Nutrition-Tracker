"use client";

import { Check } from "lucide-react";

import type { AnimalFood } from "@/lib/db/enums";
import { ANIMAL_FOOD_GROUPS, DIET_CHOICES } from "@/lib/profile/options";
import {
  DIET_PRESETS,
  describeDiet,
  normalizeEats,
  presetFor,
} from "@/lib/recipes/diet";
import { cn } from "@/lib/utils";

import { ChoiceCards } from "./choice-cards";

/**
 * A diet is the set of animal foods someone eats. Presets fill the set in
 * one click; the switches below cover everything between them, like a
 * vegetarian who eats chicken and eggs.
 */
export function DietPicker({
  eats,
  onChange,
}: {
  eats: AnimalFood[];
  onChange: (eats: AnimalFood[]) => void;
}) {
  const preset = presetFor(eats);
  const toggle = (food: AnimalFood) =>
    onChange(
      normalizeEats(
        eats.includes(food) ? eats.filter((f) => f !== food) : [...eats, food],
      ),
    );

  return (
    <div className="grid gap-5">
      <ChoiceCards
        legend="What do you eat?"
        name="diet"
        choices={DIET_CHOICES}
        value={preset}
        onChange={(p) => onChange([...DIET_PRESETS[p]])}
      />

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          Fine-tune it
          <span className="block text-xs font-normal text-ink-muted">
            Switch on each food you eat. Recipes with anything else are never
            shown.
          </span>
        </legend>
        {ANIMAL_FOOD_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-1.5">
            <span className="text-xs text-ink-muted">{group.label}</span>
            <div className="flex flex-wrap gap-2">
              {group.foods.map((f) => {
                const on = eats.includes(f.value);
                return (
                  <label
                    key={f.value}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      on
                        ? "border-ink bg-surface"
                        : "border-border text-ink-muted line-through decoration-ink-muted/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => toggle(f.value)}
                    />
                    {on ? <Check aria-hidden className="size-3.5" /> : null}
                    {f.label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-ink-muted">
          Hidden ingredients count too: fish sauce and Worcestershire are fish,
          gelatin is beef and pork, mayonnaise is eggs, ghee is dairy.
        </p>
      </fieldset>

      <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <span className="text-ink-muted">Your diet: </span>
        {describeDiet(eats)}
        {preset ? null : <span className="text-ink-muted"> (custom)</span>}
      </p>
    </div>
  );
}
