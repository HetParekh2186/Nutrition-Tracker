"use client";

import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { SlotPicker } from "@/components/log/slot-picker";
import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys, useDeleteEntry, useUpdateEntry } from "@/hooks/use-diary";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import type { DiaryEntryDTO } from "@/lib/diary/types";
import {
  amountFromEntry,
  equivalents,
  formatQuantity,
  gramsFor,
  MASS_UNITS,
  portionLabelFor,
  portionOptions,
  type PortionOption,
} from "@/lib/foods/units";
import { scaleMacros } from "@/lib/nutrition/macros";

const SERVING_KEY = "serving";

/**
 * The units an entry can be measured in. Foods: their USDA or label
 * portions, then g and oz. Recipes: a serving, then g and oz, where a
 * serving weighs its share of the raw ingredients.
 */
function useUnitOptions(entry: DiaryEntryDTO) {
  const food = useQuery({
    queryKey: keys.food(entry.foodId ?? 0),
    queryFn: () => api.food(entry.foodId!),
    enabled: entry.kind === "food" && entry.foodId !== null,
    staleTime: 5 * 60_000,
  });
  const recipe = useQuery({
    queryKey: ["recipe", entry.recipeId],
    queryFn: () => api.recipe(entry.recipeId!),
    enabled: entry.kind === "recipe" && entry.recipeId !== null,
    staleTime: 5 * 60_000,
  });

  return useMemo((): { options: PortionOption[]; ready: boolean } => {
    if (entry.kind === "food") {
      return {
        options: portionOptions(food.data?.portions ?? []),
        ready: !food.isLoading,
      };
    }
    const r = recipe.data;
    const totalG = r?.ingredients.reduce((sum, i) => sum + i.quantityG, 0);
    const serving: PortionOption = {
      key: SERVING_KEY,
      label: "1 serving",
      // Grams are unknown until the recipe loads; servings still work.
      grams: r && totalG ? totalG / r.servings : 1,
    };
    return {
      options: r && totalG ? [serving, ...MASS_UNITS] : [serving],
      ready: !recipe.isLoading,
    };
  }, [entry.kind, food.data, food.isLoading, recipe.data, recipe.isLoading]);
}

/** Edit the amount, unit or slot of a diary entry, or delete it. */
export function EntryDialog({
  entry,
  date,
  onClose,
}: {
  entry: DiaryEntryDTO;
  date: string;
  onClose: () => void;
}) {
  const { options, ready } = useUnitOptions(entry);
  // Wait for the units so the starting unit is the one it was logged in.
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {ready ? (
          <EntryForm
            entry={entry}
            date={date}
            options={options}
            onClose={onClose}
          />
        ) : (
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {entry.name}
            </DialogTitle>
            <DialogDescription>Loading units</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({
  entry,
  date,
  options,
  onClose,
}: {
  entry: DiaryEntryDTO;
  date: string;
  options: PortionOption[];
  onClose: () => void;
}) {
  const isFood = entry.kind === "food";
  // What the entry is now, in grams (foods) or servings (recipes).
  const base = (isFood ? entry.quantityG : entry.servings) ?? 0;

  const start = isFood
    ? amountFromEntry(base, entry.portionLabel, options)
    : { quantity: base, option: options[0]! };
  const [quantity, setQuantity] = useState(formatQuantity(start.quantity));
  const [unitKey, setUnitKey] = useState(start.option.key);
  const [slot, setSlot] = useState<MealSlot>(entry.mealSlot);
  const update = useUpdateEntry(date);
  const remove = useDeleteEntry(date);

  const unit = options.find((o) => o.key === unitKey) ?? options[0]!;
  const qty = Number(quantity);
  const valid = Number.isFinite(qty) && qty > 0;
  const grams = valid ? gramsFor(qty, unit) : 0;
  // Recipes are stored in servings; a serving weighs options[0].grams.
  const next = isFood ? grams : grams / options[0]!.grams;
  const macros = scaleMacros(entry.macros, base > 0 ? next / base : 0);
  const others = valid ? equivalents(grams, options, unit.key) : [];
  const servingGrams = isFood
    ? null
    : options.length > 1
      ? options[0]!.grams
      : null;

  function changeUnit(key: string) {
    const to = options.find((o) => o.key === key);
    if (!to) return;
    // Keep the same amount of food when switching units.
    if (valid) setQuantity(formatQuantity(grams / to.grams));
    setUnitKey(key);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const label = isFood ? portionLabelFor(qty, unit) : null;
    const changedAmount =
      Math.abs(next - base) > 1e-6 || (isFood && label !== entry.portionLabel);
    update.mutate(
      {
        id: entry.id,
        patch: {
          ...(slot !== entry.mealSlot ? { mealSlot: slot } : {}),
          ...(changedAmount
            ? isFood
              ? { quantityG: next, portionLabel: label }
              : { servings: next }
            : {}),
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-lg">{entry.name}</DialogTitle>
        <DialogDescription>
          {entry.portionLabel ?? (isFood ? "Weighed in grams" : "Recipe")}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="entry-amount">Amount</Label>
            <Input
              id="entry-amount"
              inputMode="decimal"
              className="num"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              aria-invalid={!valid || undefined}
              aria-describedby="entry-equivalent"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="entry-unit">Unit</Label>
            <select
              id="entry-unit"
              value={unit.key}
              onChange={(e) => changeUnit(e.target.value)}
              disabled={options.length < 2}
              className="h-8 min-w-0 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70 md:text-sm"
            >
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.key === "g" || o.key === "oz"
                    ? o.label
                    : servingGrams === null && !isFood
                      ? o.label
                      : `${o.label} (${formatQuantity(o.grams)} g)`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p
          id="entry-equivalent"
          aria-live="polite"
          className="min-h-4 num text-xs text-ink-muted"
        >
          {others.length ? `= ${others.join(" · ")}` : null}
        </p>
        {servingGrams !== null ? (
          <p className="text-xs text-ink-muted">
            Weights are of the raw ingredients, so a cooked serving may weigh
            less.
          </p>
        ) : null}
      </div>

      <SlotPicker value={slot} onChange={setSlot} name="entry-slot" />

      <div className="rounded-lg bg-surface-2 px-3 py-2.5">
        <MacroLine macros={macros} />
      </div>

      <DialogFooter className="flex-row justify-between sm:justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            remove.mutate(entry);
            onClose();
          }}
        >
          <Trash2 aria-hidden />
          Delete
        </Button>
        <Button type="submit" disabled={!valid || update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
