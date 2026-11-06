"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CUISINE_SUGGESTIONS,
  EQUIPMENT_CHOICES,
  EXCLUSION_SUGGESTIONS,
  SPICE_LABELS,
} from "@/lib/profile/options";
import type { PreferencesDTO } from "@/lib/profile/types";
import { presetFor } from "@/lib/recipes/diet";
import { cn } from "@/lib/utils";

import { ChipInput } from "./chip-input";
import { DietPicker } from "./diet-picker";

/** Diet type, hard and soft ingredient rules, cuisines, time and kit. */
export function PreferencesFields({
  value,
  onChange,
  compact = false,
}: {
  value: PreferencesDTO;
  onChange: (next: PreferencesDTO) => void;
  /** Onboarding shows the essentials only. */
  compact?: boolean;
}) {
  const set = <K extends keyof PreferencesDTO>(key: K, v: PreferencesDTO[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-7">
      <DietPicker
        eats={value.eats}
        onChange={(eats) =>
          onChange({ ...value, eats, dietType: presetFor(eats) })
        }
      />

      <ChipInput
        label="Never suggest"
        hint="Allergies and hard rules. Recipes with these are never shown."
        values={value.excludedIngredients}
        onChange={(v) => set("excludedIngredients", v)}
        placeholder="Type an ingredient and press Enter"
        suggestions={EXCLUSION_SUGGESTIONS}
      />

      {compact ? null : (
        <ChipInput
          label="Rather not"
          hint="Dislikes. Recipes with these rank lower but can still appear."
          values={value.dislikedIngredients}
          onChange={(v) => set("dislikedIngredients", v)}
          placeholder="cilantro, olives"
        />
      )}

      <ChipInput
        label="Cuisines you love"
        values={value.likedCuisines}
        onChange={(v) => set("likedCuisines", v)}
        placeholder="indian, italian"
        suggestions={CUISINE_SUGGESTIONS}
      />

      {compact ? null : (
        <>
          <ChipInput
            label="In your kitchen"
            hint="Ingredients you have but do not log, like spices and oils. Recipes count these as foods you have and never ask about them."
            values={value.pantry}
            onChange={(v) => set("pantry", v)}
            placeholder="tahini, cumin, soy sauce"
          />

          <div className="grid max-w-xs gap-1.5">
            <Label htmlFor="max-cook">Longest you want to cook (minutes)</Label>
            <Input
              id="max-cook"
              inputMode="numeric"
              className="num"
              placeholder="No limit"
              value={value.maxCookMinutes ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value);
                set(
                  "maxCookMinutes",
                  e.target.value.trim() && Number.isFinite(n) ? n : null,
                );
              }}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Equipment you have
            </legend>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_CHOICES.map((e) => {
                const on = value.equipment.includes(e.value);
                return (
                  <label
                    key={e.value}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      on
                        ? "border-ink bg-surface"
                        : "border-border text-ink-muted",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() =>
                        set(
                          "equipment",
                          on
                            ? value.equipment.filter((x) => x !== e.value)
                            : [...value.equipment, e.value],
                        )
                      }
                    />
                    {e.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Spice level</legend>
            <div className="grid max-w-md grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1">
              {SPICE_LABELS.map((label, level) => (
                <label
                  key={label}
                  className={cn(
                    "cursor-pointer rounded-md py-1.5 text-center text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                    value.spiceLevel === level
                      ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border)]"
                      : "text-ink-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="spice"
                    className="sr-only"
                    checked={value.spiceLevel === level}
                    onChange={() => set("spiceLevel", level)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="pref-notes">
              Anything else the recipe writer should know
            </Label>
            <textarea
              id="pref-notes"
              rows={3}
              maxLength={500}
              value={value.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              placeholder="I meal prep on Sundays and like leftovers for lunch."
              className="rounded-lg border border-input bg-surface-2 px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
