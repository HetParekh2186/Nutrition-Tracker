"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogMeal } from "@/hooks/use-meals";
import type { MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import type { MealDTO } from "@/lib/meals/types";
import { scaleMacros } from "@/lib/nutrition/macros";

import { SlotPicker } from "./slot-picker";

/** How a saved item reads in a list: "150 g", "2 × 1 large", "1 serving". */
export function mealItemAmount(item: {
  quantityG: number | null;
  portionLabel: string | null;
  servings: number | null;
}): string {
  if (item.servings !== null) {
    const n = Number(item.servings.toFixed(2));
    return `${n} ${n === 1 ? "serving" : "servings"}`;
  }
  return item.portionLabel ?? `${Number((item.quantityG ?? 0).toFixed(1))} g`;
}

/** Log a saved meal: every item at once, optionally scaled. */
export function MealStep({
  meal,
  date,
  initialSlot,
  onBack,
  onDone,
}: {
  meal: MealDTO;
  date: string;
  initialSlot: MealSlot;
  onBack?: (() => void) | undefined;
  onDone: () => void;
}) {
  const [scale, setScale] = useState("1");
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const log = useLogMeal();
  const factor = Number(scale);
  const valid = Number.isFinite(factor) && factor > 0 && factor <= 20;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    log.mutate({ meal, input: { date, mealSlot: slot, scale: factor } });
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 p-4">
      <div className="flex items-start gap-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to search"
          >
            <ArrowLeft />
          </Button>
        ) : null}
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug">{meal.name}</p>
          <p className="text-xs text-ink-muted">
            Saved meal · {meal.items.length}{" "}
            {meal.items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <ul className="grid max-h-48 gap-1 overflow-y-auto text-sm">
        {meal.items.map((item, i) => (
          <li
            key={`${item.foodId ?? item.recipeId}-${i}`}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <span className="shrink-0 num text-xs text-ink-muted">
              {mealItemAmount(item)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid max-w-40 gap-1.5">
        <Label htmlFor="meal-scale">Portions</Label>
        <Input
          id="meal-scale"
          inputMode="decimal"
          className="num"
          value={scale}
          onChange={(e) => setScale(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          aria-invalid={!valid || undefined}
          aria-describedby="meal-scale-hint"
        />
        <p id="meal-scale-hint" className="text-xs text-ink-muted">
          2 logs a double portion of everything.
        </p>
      </div>

      <SlotPicker value={slot} onChange={setSlot} name="meal-slot" />

      <div className="rounded-lg bg-surface-2 px-3 py-2.5">
        <MacroLine macros={scaleMacros(meal.macros, valid ? factor : 0)} />
      </div>

      <Button type="submit" size="lg" disabled={!valid || log.isPending}>
        Log meal to {SLOT_LABELS[slot].toLowerCase()}
      </Button>
    </form>
  );
}
