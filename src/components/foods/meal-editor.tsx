"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FoodPicker } from "@/components/recipes/food-picker";
import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys } from "@/hooks/use-diary";
import type { MealInputDraft } from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { defaultAmount, macrosForGrams } from "@/lib/foods/preview";
import type { FoodHit } from "@/lib/foods/types";
import {
  amountFromEntry,
  formatQuantity,
  gramsFor,
  portionLabelFor,
  portionOptions,
} from "@/lib/foods/units";
import type { MealDTO } from "@/lib/meals/types";
import {
  addMacros,
  scaleMacros,
  ZERO_MACROS,
  type Macros,
} from "@/lib/nutrition/macros";
import type { RecipeSummaryDTO } from "@/lib/recipes/types";

import { RecipePicker } from "./recipe-picker";

/**
 * One line of the meal being edited. Macros are kept per gram (foods) or
 * per serving (recipes) so totals follow the amounts as they are typed.
 * An amount that does not parse is NaN, which blocks saving.
 */
type Draft =
  | {
      key: number;
      kind: "food";
      foodId: number;
      name: string;
      quantityG: number;
      portionLabel: string | null;
      perGram: Macros;
    }
  | {
      key: number;
      kind: "recipe";
      recipeId: string;
      name: string;
      servings: number;
      perServing: Macros;
    };

type Source = {
  kind: "food" | "recipe";
  foodId: number | null;
  recipeId: string | null;
  name: string;
  quantityG: number | null;
  portionLabel: string | null;
  servings: number | null;
  macros: Macros;
};

let nextKey = 1;

/** Items from a saved meal or a logged slot, both of which carry totals. */
function draftsFrom(items: Source[]): Draft[] {
  return items.flatMap((item): Draft[] => {
    if (item.kind === "food" && item.foodId !== null && item.quantityG) {
      return [
        {
          key: nextKey++,
          kind: "food",
          foodId: item.foodId,
          name: item.name,
          quantityG: item.quantityG,
          portionLabel: item.portionLabel,
          perGram: scaleMacros(item.macros, 1 / item.quantityG),
        },
      ];
    }
    if (item.kind === "recipe" && item.recipeId !== null && item.servings) {
      return [
        {
          key: nextKey++,
          kind: "recipe",
          recipeId: item.recipeId,
          name: item.name,
          servings: item.servings,
          perServing: scaleMacros(item.macros, 1 / item.servings),
        },
      ];
    }
    return [];
  });
}

function totalOf(d: Draft): Macros {
  return d.kind === "food"
    ? scaleMacros(d.perGram, Number.isFinite(d.quantityG) ? d.quantityG : 0)
    : scaleMacros(d.perServing, Number.isFinite(d.servings) ? d.servings : 0);
}

/** Amount and unit for a food line, in the food's own portions. */
function FoodAmount({
  item,
  onChange,
}: {
  item: Extract<Draft, { kind: "food" }>;
  onChange: (patch: { quantityG: number; portionLabel: string | null }) => void;
}) {
  const detail = useQuery({
    queryKey: keys.food(item.foodId),
    queryFn: () => api.food(item.foodId),
    staleTime: 5 * 60_000,
  });
  const options = useMemo(
    () => portionOptions(detail.data?.portions ?? []),
    [detail.data],
  );
  const start = amountFromEntry(item.quantityG, item.portionLabel, options);
  const [quantity, setQuantity] = useState(formatQuantity(start.quantity));
  const [unitKey, setUnitKey] = useState(start.option.key);
  // Portions arrive after the first render; show the saved unit once known.
  const settled = useRef(false);
  useEffect(() => {
    if (settled.current || !detail.data) return;
    settled.current = true;
    const s = amountFromEntry(item.quantityG, item.portionLabel, options);
    setQuantity(formatQuantity(s.quantity));
    setUnitKey(s.option.key);
  }, [detail.data, options, item.quantityG, item.portionLabel]);

  const unit = options.find((o) => o.key === unitKey) ?? options[0]!;
  const id = `meal-item-${item.key}`;

  function report(q: string, key: string) {
    const to = options.find((o) => o.key === key) ?? unit;
    const n = Number(q);
    const ok = Number.isFinite(n) && n > 0;
    onChange({
      quantityG: ok ? gramsFor(n, to) : Number.NaN,
      portionLabel: ok ? portionLabelFor(n, to) : null,
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)] gap-2">
      <Input
        id={id}
        aria-label={`Amount of ${item.name}`}
        inputMode="decimal"
        className="num"
        value={quantity}
        aria-invalid={!Number.isFinite(item.quantityG) || undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setQuantity(e.target.value);
          report(e.target.value, unit.key);
        }}
      />
      <select
        aria-label={`Unit for ${item.name}`}
        value={unit.key}
        onChange={(e) => {
          const to = options.find((o) => o.key === e.target.value);
          if (!to) return;
          // Keep the same amount of food when switching units.
          const q = Number.isFinite(item.quantityG)
            ? formatQuantity(item.quantityG / to.grams)
            : quantity;
          setQuantity(q);
          setUnitKey(to.key);
          report(q, to.key);
        }}
        className="h-8 min-w-0 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.key === "g" || o.key === "oz"
              ? o.label
              : `${o.label} (${formatQuantity(o.grams)} g)`}
          </option>
        ))}
      </select>
    </div>
  );
}

function RecipeAmount({
  item,
  onChange,
}: {
  item: Extract<Draft, { kind: "recipe" }>;
  onChange: (servings: number) => void;
}) {
  const [value, setValue] = useState(formatQuantity(item.servings));
  return (
    <div className="grid grid-cols-[minmax(0,5rem)_minmax(0,1fr)] items-center gap-2">
      <Input
        aria-label={`Servings of ${item.name}`}
        inputMode="decimal"
        className="num"
        value={value}
        aria-invalid={!Number.isFinite(item.servings) || undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setValue(e.target.value);
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) && n > 0 ? n : Number.NaN);
        }}
      />
      <span className="text-sm text-ink-muted">
        {Number(value) === 1 ? "serving" : "servings"}
      </span>
    </div>
  );
}

/**
 * Build or edit a saved meal. Starts from a saved meal, from what was
 * logged in one slot of a day ("Save as meal"), or empty.
 */
export function MealEditor({
  meal,
  from,
}: {
  meal?: MealDTO;
  from?: { date: string; slot: MealSlot };
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(
    meal?.name ?? (from ? `My ${SLOT_LABELS[from.slot].toLowerCase()}` : ""),
  );
  const [items, setItems] = useState<Draft[]>(() =>
    meal ? draftsFrom(meal.items) : [],
  );
  const [picking, setPicking] = useState<"food" | "recipe" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // "Save as meal": copy what was logged in that slot, once.
  const day = useQuery({
    queryKey: keys.diary(from?.date ?? ""),
    queryFn: () => api.diary(from!.date),
    enabled: Boolean(from),
  });
  const copied = useRef(false);
  useEffect(() => {
    if (!from || !day.data || copied.current) return;
    copied.current = true;
    setItems(draftsFrom(day.data.slots[from.slot]));
  }, [from, day.data]);

  const total = items.reduce(
    (sum, d) => addMacros(sum, totalOf(d)),
    ZERO_MACROS,
  );
  const amountsValid = items.every((d) =>
    d.kind === "food"
      ? Number.isFinite(d.quantityG)
      : Number.isFinite(d.servings),
  );

  const save = useMutation({
    mutationFn: (input: MealInputDraft) =>
      meal ? api.updateMeal(meal.id, input) : api.createMeal(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.meals });
      toast.success(meal ? "Meal saved" : "Meal created", {
        description: name.trim(),
      });
      router.push("/foods/meals");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteMeal(meal!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.meals });
      toast.success("Meal deleted", { description: meal!.name });
      router.push("/foods/meals");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function update(key: number, patch: Partial<Draft>) {
    setItems((list) =>
      list.map((d) => (d.key === key ? ({ ...d, ...patch } as Draft) : d)),
    );
  }

  function addFood(hit: FoodHit) {
    const start = defaultAmount(hit);
    const { energyEstimated: _estimated, ...perGram } = macrosForGrams(
      hit.per100g,
      1,
    );
    setItems((list) => [
      ...list,
      {
        key: nextKey++,
        kind: "food",
        foodId: hit.id,
        name: hit.name,
        quantityG: start.grams,
        portionLabel: start.label.endsWith(" g") ? null : start.label,
        perGram,
      },
    ]);
    setPicking(null);
  }

  function addRecipe(recipe: RecipeSummaryDTO) {
    setItems((list) => [
      ...list,
      {
        key: nextKey++,
        kind: "recipe",
        recipeId: recipe.id,
        name: recipe.title,
        servings: 1,
        perServing: recipe.perServing,
      },
    ]);
    setPicking(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the meal a name.");
    if (items.length === 0) return setError("Add at least one food.");
    if (!amountsValid) return setError("Check the highlighted amounts.");
    setError(null);
    save.mutate({
      name: name.trim(),
      items: items.map((d) =>
        d.kind === "food"
          ? {
              kind: "food",
              foodId: d.foodId,
              quantityG: d.quantityG,
              portionLabel: d.portionLabel,
            }
          : { kind: "recipe", recipeId: d.recipeId, servings: d.servings },
      ),
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-6">
      <div className="grid gap-1.5">
        <Label htmlFor="meal-name">Name</Label>
        <Input
          id="meal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Usual breakfast"
          maxLength={80}
          autoFocus={!meal}
        />
      </div>

      <section aria-labelledby="meal-items-heading" className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="meal-items-heading" className="text-lg">
            In this meal
          </h2>
          <span className="num text-xs text-ink-muted">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {from && day.isPending ? (
          <p role="status" className="text-sm text-ink-muted">
            Copying what you logged
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            Add the foods and recipes you eat together.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((d) => (
              <li
                key={d.key}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_16rem_auto] sm:items-center sm:gap-4"
              >
                <div className="grid min-w-0 gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm">
                    {d.kind === "recipe" ? (
                      <BookOpen
                        aria-label="Recipe"
                        className="size-3.5 shrink-0 text-ink-muted"
                      />
                    ) : null}
                    <span className="truncate">{d.name}</span>
                  </span>
                  <MacroLine macros={totalOf(d)} />
                </div>
                <div className="flex items-center gap-2 sm:contents">
                  <div className="min-w-0 flex-1">
                    {d.kind === "food" ? (
                      <FoodAmount
                        item={d}
                        onChange={(patch) => update(d.key, patch)}
                      />
                    ) : (
                      <RecipeAmount
                        item={d}
                        onChange={(servings) => update(d.key, { servings })}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${d.name}`}
                    onClick={() =>
                      setItems((list) => list.filter((x) => x.key !== d.key))
                    }
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPicking("food")}
          >
            <Plus aria-hidden />
            Add food
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPicking("recipe")}
          >
            <BookOpen aria-hidden />
            Add recipe
          </Button>
        </div>
      </section>

      <div className="grid gap-1.5 rounded-lg bg-surface-2 px-3 py-2.5">
        <span className="text-xs text-ink-muted">Meal total</span>
        <MacroLine macros={total} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" disabled={save.isPending}>
          {meal ? "Save meal" : "Create meal"}
        </Button>
        {meal ? (
          confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">Delete this meal?</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Keep
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
              Delete meal
            </Button>
          )
        ) : null}
      </div>

      {picking === "food" ? (
        <FoodPicker
          initialQuery=""
          onPick={addFood}
          onClose={() => setPicking(null)}
        />
      ) : null}
      {picking === "recipe" ? (
        <RecipePicker onPick={addRecipe} onClose={() => setPicking(null)} />
      ) : null}
    </form>
  );
}
