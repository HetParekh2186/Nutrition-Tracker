"use client";

import { useMutation } from "@tanstack/react-query";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecipeInputSchema, type RecipeInputDraft } from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import { MEAL_SLOTS } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { cn } from "@/lib/utils";

import { FoodPicker } from "./food-picker";
import {
  emptyIngredient,
  emptyStep,
  type IngredientDraft,
  type RecipeDraft,
  type StepDraft,
} from "./recipe-draft";

const optionalInt = (s: string) =>
  s.trim() === "" || !Number.isFinite(Number(s)) ? null : Math.round(Number(s));

/** Turn the form state into the API input, dropping blank rows. */
function toInput(d: RecipeDraft): RecipeInputDraft {
  const kept = d.ingredients
    .map((ing, index) => ({ ing, index }))
    .filter(({ ing }) => ing.displayText.trim());
  const newIndex = new Map(kept.map(({ index }, i) => [index, i]));
  return {
    title: d.title,
    description: d.description || null,
    cuisine: d.cuisine || null,
    mealTypes: d.mealTypes,
    tags: [],
    servings: Number(d.servings),
    prepMinutes: optionalInt(d.prepMinutes),
    cookMinutes: optionalInt(d.cookMinutes),
    ingredients: kept.map(({ ing }) => ({
      displayText: ing.displayText,
      foodId: ing.foodId,
      quantityG: Number(ing.grams) || 0,
      groupLabel: ing.groupLabel,
    })),
    steps: d.steps
      .filter((s) => s.instruction.trim())
      .map((s) => {
        const minutes = optionalInt(s.timerMinutes);
        return {
          instruction: s.instruction,
          timerSeconds: minutes ? minutes * 60 : null,
          ingredientIndexes: s.ingredientIndexes.flatMap((i) =>
            newIndex.has(i) ? [newIndex.get(i)!] : [],
          ),
        };
      }),
  };
}

/** Create or edit a recipe. Nutrition is computed on save from the matches. */
export function RecipeEditor({
  recipeId,
  initial,
}: {
  recipeId?: string;
  initial: RecipeDraft;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [picking, setPicking] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setIngredient = (i: number, patch: Partial<IngredientDraft>) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, j) =>
        j === i ? { ...ing, ...patch } : ing,
      ),
    }));
  const setStep = (i: number, patch: Partial<StepDraft>) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));

  /** Auto-match an unmatched ingredient to the top search hit. */
  async function autoMatch(i: number) {
    const ing = draft.ingredients[i];
    if (!ing || ing.foodId !== null || ing.displayText.trim().length < 3)
      return;
    const query = ing.displayText.replace(
      /^[\d\s./]+(g|kg|ml|cups?|tbsp|tsp|oz)?\b/i,
      "",
    );
    try {
      const { results } = await api.searchFoods(query.trim());
      const top = results[0];
      if (top) setIngredient(i, { foodId: top.id, foodName: top.name });
    } catch {
      // Leave it unmatched; the user can pick a food.
    }
  }

  const save = useMutation({
    mutationFn: (input: RecipeInputDraft) =>
      recipeId ? api.updateRecipe(recipeId, input) : api.createRecipe(input),
    onSuccess: ({ id }) => {
      toast.success(recipeId ? "Recipe saved" : "Recipe created");
      router.push(`/recipes/${id}`);
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = toInput(draft);
    const parsed = RecipeInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(
        parsed.error.issues.map((issue) =>
          `${issue.path.join(" ")}: ${issue.message}`.replace(
            /^ingredients/,
            "Ingredient",
          ),
        ),
      );
      return;
    }
    setErrors([]);
    save.mutate(input);
  }

  const unmatched = draft.ingredients.filter(
    (i) => i.displayText.trim() && i.foodId === null,
  ).length;

  return (
    <form onSubmit={submit} className="grid gap-10">
      <section className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="r-title">Title</Label>
          <Input
            id="r-title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            required
            maxLength={120}
            className="font-display text-lg md:text-lg"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-desc">Description</Label>
          <textarea
            id="r-desc"
            rows={2}
            maxLength={600}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            className="rounded-lg border border-input bg-surface-2 px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 grid gap-1.5 sm:col-span-1">
            <Label htmlFor="r-cuisine">Cuisine</Label>
            <Input
              id="r-cuisine"
              value={draft.cuisine}
              onChange={(e) => set("cuisine", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-servings">Servings</Label>
            <Input
              id="r-servings"
              inputMode="decimal"
              className="num"
              value={draft.servings}
              onChange={(e) => set("servings", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-prep">Prep (min)</Label>
            <Input
              id="r-prep"
              inputMode="numeric"
              className="num"
              value={draft.prepMinutes}
              onChange={(e) => set("prepMinutes", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-cook">Cook (min)</Label>
            <Input
              id="r-cook"
              inputMode="numeric"
              className="num"
              value={draft.cookMinutes}
              onChange={(e) => set("cookMinutes", e.target.value)}
            />
          </div>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Good for</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_SLOTS.map((slot) => {
              const on = draft.mealTypes.includes(slot);
              return (
                <label
                  key={slot}
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
                        "mealTypes",
                        on
                          ? draft.mealTypes.filter((s) => s !== slot)
                          : [...draft.mealTypes, slot],
                      )
                    }
                  />
                  {SLOT_LABELS[slot]}
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="ing-heading" className="grid gap-3">
        <div>
          <h2 id="ing-heading" className="text-xl">
            Ingredients
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Use raw weights in grams for the whole recipe. Each ingredient is
            matched to a USDA food; unmatched ones are left out of the
            nutrition.
          </p>
        </div>
        <ol className="grid gap-2">
          {draft.ingredients.map((ing, i) => (
            <li
              key={ing.key}
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_2rem] items-start gap-2 rounded-lg border border-border bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,14rem)_2rem]"
            >
              <Input
                aria-label={`Ingredient ${i + 1}`}
                placeholder="2 cloves garlic, minced"
                value={ing.displayText}
                onChange={(e) =>
                  setIngredient(i, { displayText: e.target.value })
                }
                onBlur={() => void autoMatch(i)}
              />
              <Input
                aria-label={`Ingredient ${i + 1} grams`}
                placeholder="g"
                inputMode="decimal"
                className="num"
                value={ing.grams}
                onChange={(e) => setIngredient(i, { grams: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setPicking(i)}
                className={cn(
                  "col-span-2 row-start-2 flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 text-left text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:col-span-1 sm:row-start-auto",
                  ing.foodId
                    ? "bg-surface-2 text-ink-muted"
                    : "border border-dashed border-warn text-warn",
                )}
              >
                <Link2 aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">
                  {ing.foodName ?? "Match a food"}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ingredient ${i + 1}`}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    ingredients: d.ingredients.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("ingredients", [...draft.ingredients, emptyIngredient()])
            }
          >
            <Plus aria-hidden />
            Add ingredient
          </Button>
          {unmatched ? (
            <span className="text-xs text-warn">
              {unmatched} not matched yet
            </span>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="grid gap-3">
        <h2 id="steps-heading" className="text-xl">
          Method
        </h2>
        <ol className="grid gap-2">
          {draft.steps.map((step, i) => (
            <li
              key={step.key}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_5rem_2rem] items-start gap-2"
            >
              <span className="pt-2 num text-sm text-ink-muted">{i + 1}</span>
              <textarea
                aria-label={`Step ${i + 1}`}
                rows={2}
                value={step.instruction}
                onChange={(e) => setStep(i, { instruction: e.target.value })}
                className="rounded-lg border border-input bg-surface-2 px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
              <Input
                aria-label={`Step ${i + 1} timer in minutes`}
                placeholder="min"
                inputMode="numeric"
                className="num"
                value={step.timerMinutes}
                onChange={(e) => setStep(i, { timerMinutes: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove step ${i + 1}`}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    steps: d.steps.filter((_, j) => j !== i),
                  }))
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("steps", [...draft.steps, emptyStep()])}
          >
            <Plus aria-hidden />
            Add step
          </Button>
        </div>
      </section>

      {errors.length ? (
        <ul
          role="alert"
          className="grid gap-1 rounded-lg border border-over/40 p-3 text-sm text-over"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="sticky bottom-20 flex justify-end gap-2 md:bottom-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving" : "Save recipe"}
        </Button>
      </div>

      {picking !== null ? (
        <FoodPicker
          initialQuery={draft.ingredients[picking]?.displayText ?? ""}
          onClose={() => setPicking(null)}
          onPick={(food) => {
            setIngredient(picking, { foodId: food.id, foodName: food.name });
            setPicking(null);
          }}
        />
      ) : null}
    </form>
  );
}
