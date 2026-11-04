"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { mealItemAmount } from "@/components/log/meal-step";
import { useQuickLog } from "@/components/log/quick-log-provider";
import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { useMeals } from "@/hooks/use-meals";

const SHOWN = 4;

/** Saved meals as cards: what is in each, its totals, Log and Edit. */
export function MealsView() {
  const { data: meals, isPending, error } = useMeals();
  const { open } = useQuickLog();

  if (isPending) {
    return (
      <p role="status" className="text-sm text-ink-muted">
        Loading meals
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    );
  }
  if (meals.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="max-w-sm text-sm text-ink-muted">
          No saved meals yet. Build one from foods and recipes, or use
          &ldquo;Save as meal&rdquo; on a meal you logged on Today.
        </p>
        <Button asChild size="sm">
          <Link href="/foods/meals/new">
            <Plus aria-hidden />
            Create meal
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className="grid content-between gap-4 rounded-xl border border-border bg-surface p-4"
        >
          <div className="grid gap-2">
            <h2 className="text-lg leading-tight">{meal.name}</h2>
            <ul className="grid gap-1 text-sm">
              {meal.items.slice(0, SHOWN).map((item, i) => (
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
              {meal.items.length > SHOWN ? (
                <li className="text-xs text-ink-muted">
                  and {meal.items.length - SHOWN} more
                </li>
              ) : null}
            </ul>
          </div>
          <div className="grid gap-3">
            <MacroLine macros={meal.macros} />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => open({ step: { kind: "meal", meal } })}
                aria-label={`Log ${meal.name}`}
              >
                Log
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/foods/meals/${meal.id}`}
                  aria-label={`Edit ${meal.name}`}
                >
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
