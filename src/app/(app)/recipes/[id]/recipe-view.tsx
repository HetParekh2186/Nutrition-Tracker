"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChefHat,
  Clock,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SlotPicker } from "@/components/log/slot-picker";
import { useQuickLog } from "@/components/log/quick-log-provider";
import { MacroChip } from "@/components/nutrition/macro-chip";
import { NutrientBars } from "@/components/nutrition/nutrient-bars";
import { totalMinutes } from "@/components/recipes/recipe-card";
import { RatingStars } from "@/components/recipes/rating-stars";
import { TypographicCover } from "@/components/recipes/typographic-cover";
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
import { useAddEntry } from "@/hooks/use-diary";
import { readNdjson } from "@/lib/api/stream";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { defaultSlotForHour } from "@/lib/foods/units";
import { formatAmount } from "@/lib/nutrition/format";
import { scaleMacros } from "@/lib/nutrition/macros";
import { displayTags } from "@/lib/recipes/diet";
import { scaledIngredientText, shownFactor } from "@/lib/recipes/display";
import type { RecipeDetailDTO } from "@/lib/recipes/types";

function formatTimer(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 360) / 10} h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds} s`;
}

function ServingsStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Servings">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Fewer servings"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus />
      </Button>
      <output
        aria-live="polite"
        className="min-w-24 px-1 text-center num text-sm whitespace-nowrap"
      >
        {value} {value === 1 ? "serving" : "servings"}
      </output>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="More servings"
        disabled={value >= 24}
        onClick={() => onChange(Math.min(24, value + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}

function LogDialog({
  recipe,
  onClose,
}: {
  recipe: RecipeDetailDTO;
  onClose: () => void;
}) {
  const { date } = useQuickLog();
  const [servings, setServings] = useState("1");
  const [slot, setSlot] = useState<MealSlot>(
    recipe.mealTypes.includes(defaultSlotForHour(new Date().getHours()))
      ? defaultSlotForHour(new Date().getHours())
      : (recipe.mealTypes[0] ?? defaultSlotForHour(new Date().getHours())),
  );
  const add = useAddEntry();
  const n = Number(servings);
  const valid = Number.isFinite(n) && n > 0 && n <= 20;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            add.mutate({
              input: {
                date,
                mealSlot: slot,
                loggedVia: "recipe",
                item: { kind: "recipe", recipeId: recipe.id, servings: n },
              },
              preview: {
                name: recipe.title,
                brand: null,
                macros: scaleMacros(recipe.perServing, n),
              },
              notify: {
                title: `Logged to ${SLOT_LABELS[slot].toLowerCase()}`,
                description: recipe.title,
              },
            });
            onClose();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Log {recipe.title}
            </DialogTitle>
            <DialogDescription>How much did you eat?</DialogDescription>
          </DialogHeader>
          <div className="grid max-w-40 gap-1.5">
            <Label htmlFor="log-servings">Servings</Label>
            <Input
              id="log-servings"
              inputMode="decimal"
              className="num"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              autoFocus
            />
          </div>
          <SlotPicker value={slot} onChange={setSlot} name="log-slot" />
          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              Log to {SLOT_LABELS[slot].toLowerCase()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdaptDialog({
  recipe,
  servings,
  onClose,
}: {
  recipe: RecipeDetailDTO;
  servings: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [instructions, setInstructions] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (instructions.trim().length < 3) return;
    setRunning(true);
    setError(null);
    setStatus([]);
    try {
      const res = await api.adaptRecipe(recipe.id, {
        instructions: instructions.trim(),
        servings,
      });
      let doneId: string | null = null;
      await readNdjson(res, (event) => {
        if (event.type === "status") setStatus((s) => [...s, event.message]);
        if (event.type === "error") setError(event.message);
        if (event.type === "done") doneId = String(event.recipeId);
      });
      if (doneId) {
        toast.success("Adapted recipe saved", {
          description: "Macros were recomputed from USDA data.",
        });
        router.push(`/recipes/${doneId}`);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={run}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Adapt with AI
            </DialogTitle>
            <DialogDescription>
              Describe the change. The new version is saved alongside this one
              and its macros are recomputed from USDA data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="adapt-text">What should change?</Label>
            <textarea
              id="adapt-text"
              rows={3}
              maxLength={500}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Make it spicier and swap rice for quinoa"
              disabled={running}
              autoFocus
              className="rounded-lg border border-input bg-surface-2 px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>
          {status.length ? (
            <ol
              aria-live="polite"
              className="grid gap-1 text-sm text-ink-muted"
            >
              {status.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={
                      i === status.length - 1 && running ? "animate-pulse" : ""
                    }
                  >
                    •
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-over">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={running || instructions.trim().length < 3}
            >
              <Sparkles aria-hidden />
              {running ? "Adapting" : "Adapt recipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecipeView({
  initial,
  aiEnabled,
}: {
  initial: RecipeDetailDTO;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [servings, setServings] = useState(initial.servings);
  const [dialog, setDialog] = useState<"log" | "adapt" | null>(null);
  const { data } = useQuery({
    queryKey: ["recipe", initial.id, servings],
    queryFn: () => api.recipe(initial.id, servings),
    placeholderData: (prev) => prev,
    initialData: servings === initial.servings ? initial : undefined,
  });
  const recipe = data ?? initial;
  const remove = useMutation({
    mutationFn: () => api.deleteRecipe(initial.id),
    onSuccess: () => {
      toast.success("Recipe deleted");
      router.push("/recipes");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const cook = useMutation({
    mutationFn: () => api.startCook(initial.id, servings),
    onSuccess: ({ id }) => router.push(`/cook/${id}`),
    onError: (err) => toast.error(err.message),
  });
  const [saved, setSaved] = useState(initial.saved);
  const [rating, setRating] = useState(initial.myRating);
  const interact = useMutation({
    mutationFn: (input: Parameters<typeof api.interact>[1]) =>
      api.interact(initial.id, input),
    onError: (err) => toast.error(err.message),
  });
  // A view is a weak signal, recorded once per visit.
  const { mutate: recordView } = interact;
  useEffect(() => {
    recordView({ event: "view" });
  }, [recordView]);

  const minutes = totalMinutes(recipe);
  const groups = [
    ...new Set(recipe.ingredients.map((i) => i.groupLabel ?? "")),
  ];
  const targetsById = new Map(initial.nutrients.map((n) => [n.id, n.target]));
  const nutrients = recipe.nutrients.map((n) => ({
    ...n,
    target: targetsById.get(n.id) ?? null,
  }));

  return (
    <article className="grid grid-cols-1 gap-8">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/recipes">
            <ArrowLeft aria-hidden />
            Recipes
          </Link>
        </Button>
      </div>

      <TypographicCover
        title={recipe.title}
        cuisine={recipe.cuisine}
        seed={recipe.coverSeed}
        size="hero"
        className="rounded-xl border border-border"
      />

      <header className="grid gap-4">
        {recipe.parentTitle ? (
          <p className="text-sm text-ink-muted">
            Adapted from{" "}
            <Link
              href={`/recipes/${recipe.parentRecipeId}`}
              className="underline underline-offset-4 hover:text-ink"
            >
              {recipe.parentTitle}
            </Link>
          </p>
        ) : null}
        {recipe.description ? (
          <p className="max-w-2xl text-lg text-ink-muted">
            {recipe.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          {minutes > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="size-4" />
              <span className="num">{recipe.prepMinutes ?? 0}</span> min prep,{" "}
              <span className="num">{recipe.cookMinutes ?? 0}</span> min cook
            </span>
          ) : null}
          {displayTags(recipe.tags).length ? (
            <span>{displayTags(recipe.tags).join(" · ")}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => cook.mutate()}
            disabled={cook.isPending || recipe.steps.length === 0}
          >
            <ChefHat aria-hidden />
            {cook.isPending ? "Starting" : "Start cooking"}
          </Button>
          <Button variant="outline" onClick={() => setDialog("log")}>
            <Utensils aria-hidden />
            Log as eaten
          </Button>
          <Button
            variant="outline"
            aria-pressed={saved}
            onClick={() => {
              setSaved(!saved);
              interact.mutate({ event: saved ? "unsave" : "save" });
            }}
          >
            {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
            {saved ? "Saved" : "Save"}
          </Button>
          {aiEnabled ? (
            <Button variant="outline" onClick={() => setDialog("adapt")}>
              <Sparkles aria-hidden />
              Adapt with AI
            </Button>
          ) : null}
          {recipe.isOwn ? (
            <>
              <Button asChild variant="ghost">
                <Link href={`/recipes/${recipe.id}/edit`}>
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete "${recipe.title}"?`))
                    remove.mutate();
                }}
              >
                <Trash2 aria-hidden />
                Delete
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <RatingStars
            value={rating}
            onChange={(n) => {
              setRating(n);
              interact.mutate(
                { event: "rate", rating: n },
                {
                  onSuccess: () =>
                    toast.success("Thanks, suggestions will use this"),
                },
              );
            }}
          />
          {recipe.cookCount > 0 ? (
            <span className="text-sm text-ink-muted">
              You have made this{" "}
              {recipe.cookCount === 1 ? "once" : `${recipe.cookCount} times`}
            </span>
          ) : null}
        </div>
      </header>

      <section
        aria-labelledby="per-serving-heading"
        className="grid gap-4 rounded-xl border border-border bg-surface p-5"
      >
        <h2 id="per-serving-heading" className="text-lg">
          Per serving
        </h2>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <p>
            <span className="num text-2xl">
              {formatAmount(recipe.perServing.kcal, "kcal")}
            </span>
            <span className="text-sm text-ink-muted"> kcal</span>
          </p>
          <MacroChip
            macro="protein"
            grams={recipe.perServing.proteinG}
            className="text-sm"
          />
          <MacroChip
            macro="carbs"
            grams={recipe.perServing.carbsG}
            className="text-sm"
          />
          <MacroChip
            macro="fat"
            grams={recipe.perServing.fatG}
            className="text-sm"
          />
          <MacroChip
            macro="fiber"
            grams={recipe.perServing.fiberG}
            className="text-sm"
          />
        </div>
        {recipe.unmatched > 0 ? (
          <p className="text-sm text-warn">
            {recipe.unmatched} ingredient
            {recipe.unmatched === 1 ? " is" : "s are"} not matched to a food, so
            these numbers leave {recipe.unmatched === 1 ? "it" : "them"} out.
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section
          aria-labelledby="ingredients-heading"
          className="grid content-start gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ingredients-heading" className="text-xl">
              Ingredients
            </h2>
            <ServingsStepper value={servings} onChange={setServings} />
          </div>
          {groups.map((group) => (
            <div key={group} className="grid gap-2">
              {group ? (
                <h3 className="text-xs tracking-widest text-ink-muted uppercase">
                  {group}
                </h3>
              ) : null}
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {recipe.ingredients
                  .filter((i) => (i.groupLabel ?? "") === group)
                  .map((ing) => (
                    <li
                      key={ing.id}
                      className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm">
                          {scaledIngredientText(
                            ing.displayText,
                            shownFactor(ing),
                          )}
                        </span>
                        {ing.foodName ? (
                          <span className="block truncate text-xs text-ink-muted">
                            {ing.foodName}
                          </span>
                        ) : (
                          <span className="block text-xs text-warn">
                            Not matched to a food
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 num text-sm">
                        {formatAmount(ing.scaledG, "g")} g
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {servings !== recipe.servings ? (
            <p className="text-xs text-ink-muted">
              Weights scaled from {recipe.servings} to {servings} servings.
              Per-serving numbers stay the same.
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="steps-heading"
          className="grid content-start gap-4"
        >
          <h2 id="steps-heading" className="text-xl">
            Method
          </h2>
          <ol className="grid gap-4">
            {recipe.steps.map((step) => (
              <li
                key={step.id}
                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"
              >
                <span className="pt-0.5 num text-lg text-ink-muted">
                  {step.position}
                </span>
                <div className="grid gap-1.5">
                  <p className="leading-relaxed">{step.instruction}</p>
                  {step.timerSeconds ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-muted">
                      <Timer aria-hidden className="size-3.5" />
                      <span className="num">
                        {formatTimer(step.timerSeconds)}
                      </span>
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="nutrients-heading" className="grid gap-4">
        <div>
          <h2 id="nutrients-heading" className="text-xl">
            Nutrients per serving
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Bars show one serving against your daily targets.
          </p>
        </div>
        <NutrientBars nutrients={nutrients} />
      </section>

      {dialog === "log" ? (
        <LogDialog recipe={recipe} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "adapt" ? (
        <AdaptDialog
          recipe={recipe}
          servings={servings}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </article>
  );
}
