"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Sparkles, ThumbsDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { MacroChip } from "@/components/nutrition/macro-chip";
import { RecipeCard, totalMinutes } from "@/components/recipes/recipe-card";
import { WhyChips } from "@/components/recipes/why-chips";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { MEAL_SLOTS } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { formatAmount } from "@/lib/nutrition/format";
import type { RecommendationsDTO } from "@/lib/recommend/types";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ForYouView({ initial }: { initial: RecommendationsDTO }) {
  const qc = useQueryClient();
  const [items, setItems] = useState(initial.items);
  const [quickOnly, setQuickOnly] = useState(false);
  const { slot, budget } = initial;

  const interact = useMutation({
    mutationFn: ({
      id,
      event,
    }: {
      id: string;
      event: "save" | "unsave" | "skip";
    }) => api.interact(id, { event }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recipe"] }),
    onError: (err) => toast.error(err.message),
  });

  const visible = items.filter(
    (i) => !quickOnly || totalMinutes(i.recipe) <= 30,
  );
  const spent = budget.kcal <= 0;

  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl">For You</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Ranked by how well one serving fits what is left of your day, your
              taste and your food rules.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/recipes/generate?slot=${slot}`}>
              <Sparkles aria-hidden />
              Generate one instead
            </Link>
          </Button>
        </div>
        <nav aria-label="Meal" className="flex flex-wrap gap-1.5">
          {MEAL_SLOTS.map((s) => (
            <Link
              key={s}
              href={`/for-you?slot=${s}`}
              scroll={false}
              aria-current={s === slot ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                s === slot
                  ? "border-ink bg-surface text-ink"
                  : "border-border text-ink-muted hover:text-ink",
              )}
            >
              {SLOT_LABELS[s]}
            </Link>
          ))}
        </nav>
      </header>

      <section
        aria-label="What is left"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface px-5 py-4"
      >
        {spent ? (
          <p className="text-sm text-ink-muted">
            You have used today&apos;s calories, so these lean on taste over
            macros.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Left for {SLOT_LABELS[slot].toLowerCase()}
            </p>
            <p>
              <span className="num text-xl">
                {formatAmount(budget.kcal, "kcal")}
              </span>
              <span className="text-sm text-ink-muted"> kcal</span>
            </p>
            <MacroChip
              macro="protein"
              grams={Math.max(0, budget.proteinG)}
              className="text-sm"
            />
            <MacroChip
              macro="carbs"
              grams={Math.max(0, budget.carbsG)}
              className="text-sm"
            />
            <MacroChip
              macro="fat"
              grams={Math.max(0, budget.fatG)}
              className="text-sm"
            />
          </>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={quickOnly}
            onChange={(e) => setQuickOnly(e.target.checked)}
            className="size-4 accent-[var(--ink)]"
          />
          30 minutes or less
        </label>
      </section>

      {!initial.personalized ? (
        <p className="text-sm text-ink-muted">
          Save, cook and rate a few recipes and these suggestions will start to
          learn your taste.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-ink-muted">
          Nothing in the library fits your rules for{" "}
          {SLOT_LABELS[slot].toLowerCase()}
          {quickOnly ? " in 30 minutes" : ""}. Try generating a recipe instead.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {visible.map((item, rank) => (
              <motion.li
                key={item.recipe.id}
                layout
                exit={{ opacity: 0, scale: 0.97 }}
                transition={SPRING}
              >
                <RecipeCard
                  recipe={item.recipe}
                  footer={
                    <div className="grid gap-3 pt-1">
                      <WhyChips reasons={item.reasons} />
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="num text-xs text-ink-muted"
                          title="Match score"
                        >
                          #{rank + 1} · {item.score.toFixed(2)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-pressed={item.saved}
                            onClick={() => {
                              const next = !item.saved;
                              setItems((list) =>
                                list.map((i) =>
                                  i.recipe.id === item.recipe.id
                                    ? { ...i, saved: next }
                                    : i,
                                ),
                              );
                              interact.mutate({
                                id: item.recipe.id,
                                event: next ? "save" : "unsave",
                              });
                            }}
                          >
                            {item.saved ? (
                              <BookmarkCheck aria-hidden />
                            ) : (
                              <Bookmark aria-hidden />
                            )}
                            {item.saved ? "Saved" : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItems((list) =>
                                list.filter(
                                  (i) => i.recipe.id !== item.recipe.id,
                                ),
                              );
                              interact.mutate({
                                id: item.recipe.id,
                                event: "skip",
                              });
                            }}
                          >
                            <ThumbsDown aria-hidden />
                            Not for me
                          </Button>
                        </div>
                      </div>
                    </div>
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
