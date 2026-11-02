import { Plus, Search, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserId } from "@/lib/auth/session";
import { MEAL_SLOTS, type MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { listRecipes } from "@/lib/recipes/repo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Recipes" };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; slot?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/recipes");
  const { q, slot: rawSlot } = await searchParams;
  const slot = MEAL_SLOTS.find((s) => s === rawSlot) as MealSlot | undefined;
  const recipes = await listRecipes(userId, { query: q, slot });
  const own = recipes.filter((r) => r.isOwn);
  const library = recipes.filter((r) => !r.isOwn);

  const slotHref = (s?: MealSlot) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (s) params.set("slot", s);
    const qs = params.toString();
    return qs ? `/recipes?${qs}` : "/recipes";
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Recipes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every number is computed from USDA data for the ingredients, never
            taken from the AI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/recipes/new">
              <Plus aria-hidden />
              New recipe
            </Link>
          </Button>
          <Button asChild>
            <Link href="/recipes/generate">
              <Sparkles aria-hidden />
              Generate with AI
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <form action="/recipes" className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name or cuisine"
            aria-label="Search recipes"
            className="pl-8"
          />
          {slot ? <input type="hidden" name="slot" value={slot} /> : null}
        </form>
        <nav aria-label="Meal" className="flex flex-wrap gap-1.5">
          {[undefined, ...MEAL_SLOTS].map((s) => (
            <Link
              key={s ?? "all"}
              href={slotHref(s)}
              aria-current={s === slot ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                s === slot
                  ? "border-ink bg-surface text-ink"
                  : "border-border text-ink-muted hover:text-ink",
              )}
            >
              {s ? SLOT_LABELS[s] : "All"}
            </Link>
          ))}
        </nav>
      </div>

      {own.length ? (
        <section aria-labelledby="own-heading" className="grid gap-4">
          <h2 id="own-heading" className="text-xl">
            Yours
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {own.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="library-heading" className="grid gap-4">
        <h2 id="library-heading" className="text-xl">
          Starter library
        </h2>
        {library.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No recipes match.</p>
        )}
      </section>
    </div>
  );
}
