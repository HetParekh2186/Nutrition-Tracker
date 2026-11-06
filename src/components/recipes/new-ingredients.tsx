"use client";

import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { readNdjson } from "@/lib/api/stream";
import { api } from "@/lib/client/api";

export type NewIngredient = { id: number; name: string };
export type Answer = "have" | "missing";

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * Ingredients the user has not logged: ask whether they have each one.
 * "I have it" adds it to their kitchen so it is not asked again; anything
 * they lack can be swapped for foods they already eat.
 */
export function NewIngredients({
  recipeId,
  items,
  answers,
  onAnswer,
  servings,
  aiEnabled,
}: {
  recipeId: string;
  items: NewIngredient[];
  answers: Record<number, Answer>;
  onAnswer: (id: number, answer: Answer) => void;
  servings: number;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const missing = items.filter((i) => answers[i.id] === "missing");
  const allHave = items.every((i) => answers[i.id] === "have");

  async function have(item: NewIngredient) {
    onAnswer(item.id, "have");
    try {
      await api.addToPantry([item.name]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that.");
    }
  }

  async function swap() {
    const names = missing.map((m) => m.name);
    setRunning(true);
    setError(null);
    try {
      const res = await api.adaptRecipe(recipeId, {
        instructions: `Replace ${list(names)}: they do not have ${names.length === 1 ? "it" : "them"}. Use foods they already eat instead, or leave ${names.length === 1 ? "it" : "them"} out if the dish works without.`,
        servings,
        missing: names,
      });
      let doneId: string | null = null;
      await readNdjson(res, (event) => {
        if (event.type === "status") setStatus(String(event.message));
        if (event.type === "error") setError(String(event.message));
        if (event.type === "done") doneId = String(event.recipeId);
      });
      if (doneId) {
        toast.success("Swapped for foods you eat", {
          description: "Macros were recomputed from USDA data.",
        });
        router.push(`/recipes/${doneId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  if (allHave) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
      >
        <Check aria-hidden className="size-4 text-good" />
        You have everything for this recipe.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="new-ingredients-heading"
      className="grid gap-3 rounded-xl border border-accent/40 bg-surface p-4"
    >
      <div>
        <h2 id="new-ingredients-heading" className="text-lg">
          New to you
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {items.length === 1
            ? "You have not logged this ingredient. Do you have it?"
            : `You have not logged these ${items.length} ingredients. Do you have them?`}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const answer = answers[item.id];
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="text-sm first-letter:uppercase">
                {item.name}
              </span>
              <div
                role="group"
                aria-label={`Do you have ${item.name}?`}
                className="flex gap-1"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={answer === "have" ? "default" : "outline"}
                  aria-pressed={answer === "have"}
                  disabled={running}
                  onClick={() => void have(item)}
                >
                  I have it
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={answer === "missing" ? "default" : "outline"}
                  aria-pressed={answer === "missing"}
                  disabled={running}
                  onClick={() => onAnswer(item.id, "missing")}
                >
                  I don&apos;t
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length ? (
        aiEnabled ? (
          <div className="grid gap-2">
            <Button
              type="button"
              className="w-fit"
              disabled={running}
              onClick={() => void swap()}
            >
              <Sparkles aria-hidden />
              {running
                ? "Swapping"
                : `Swap ${missing.length === 1 ? missing[0]!.name : `these ${missing.length}`} for foods I eat`}
            </Button>
            <p aria-live="polite" className="text-xs text-ink-muted">
              {running
                ? status
                : "A new version is saved alongside this one, with macros recomputed."}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Leave {missing.length === 1 ? "it" : "them"} out, or use something
            similar you have.
          </p>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-over">
          {error}
        </p>
      ) : null}
    </section>
  );
}
