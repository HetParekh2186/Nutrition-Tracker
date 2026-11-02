import { Clock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MacroLine } from "@/components/nutrition/macro-chip";
import type { RecipeSummaryDTO } from "@/lib/recipes/types";

import { TypographicCover } from "./typographic-cover";

export function totalMinutes(
  r: Pick<RecipeSummaryDTO, "prepMinutes" | "cookMinutes">,
) {
  return (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
}

/** A recipe in a grid: cover, title, time and per-serving macros. */
export function RecipeCard({
  recipe,
  href = `/recipes/${recipe.id}`,
  footer,
}: {
  recipe: RecipeSummaryDTO;
  href?: string;
  /** Extra content under the macros, e.g. why-this chips. */
  footer?: ReactNode;
}) {
  const minutes = totalMinutes(recipe);
  return (
    <article className="group grid overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-ink-muted">
      <Link
        href={href}
        className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <TypographicCover
          title={recipe.title}
          cuisine={recipe.cuisine}
          seed={recipe.coverSeed}
        />
        <span className="sr-only">Open {recipe.title}</span>
      </Link>
      <div className="grid gap-2 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {minutes > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              <span className="num">{minutes}</span> min
            </span>
          ) : null}
          <span>
            per serving · <span className="num">{recipe.servings}</span>{" "}
            {recipe.servings === 1 ? "serving" : "servings"}
          </span>
          {recipe.source === "ai_generated" ||
          recipe.source === "ai_adapted" ? (
            <span>
              {recipe.source === "ai_adapted" ? "Adapted" : "AI recipe"}
            </span>
          ) : null}
        </div>
        <MacroLine macros={recipe.perServing} />
        {recipe.unmatched > 0 ? (
          <p className="text-xs text-warn">
            {recipe.unmatched} ingredient{recipe.unmatched === 1 ? "" : "s"} not
            matched to a food yet
          </p>
        ) : null}
        {footer}
      </div>
    </article>
  );
}
