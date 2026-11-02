// Why-this chips (SPEC.md step 4): turn the two or three largest score
// terms into short reasons. No LLM needed.

import type { MealSlot } from "@/lib/db/enums";
import { formatAmount } from "@/lib/nutrition/format";

import type { Budget } from "./budget";
import { macroErrors, weightedTerms, type Terms } from "./score";

export type ExplainContext = {
  slot: MealSlot;
  budget: Budget;
  serving: Budget;
  cuisine: string | null;
  likedCuisine: boolean;
  daysSinceCooked: number | null;
  rating: number | null;
  /** The most similar recipe you have cooked more than once, if any. */
  similarCooked: { title: string; count: number } | null;
};

const MIN_CONTRIBUTION = 0.05;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function reasonFor(
  term: keyof Terms,
  t: Terms,
  ctx: ExplainContext,
): string | null {
  switch (term) {
    case "M": {
      if (t.M < 0.6) return null;
      // Name protein when it is the best-fitting macro and a real amount.
      const errors = macroErrors(ctx.serving, ctx.budget);
      const best = (["proteinG", "carbsG", "fatG", "kcal"] as const).reduce(
        (a, b) => (errors[b] < errors[a] ? b : a),
      );
      if (
        best === "proteinG" &&
        ctx.budget.proteinG >= 15 &&
        errors.proteinG < 0.15
      ) {
        return `Fits your remaining ${formatAmount(ctx.budget.proteinG, "g")} g protein`;
      }
      return `Fits your remaining ${ctx.slot} macros`;
    }
    case "T":
      if (t.T < 0.6) return null;
      return ctx.similarCooked && ctx.similarCooked.count >= 2
        ? `Like the ${ctx.similarCooked.title.toLowerCase()} you cooked ${
            ctx.similarCooked.count === 2
              ? "twice"
              : `${ctx.similarCooked.count} times`
          }`
        : "Similar to meals you cook often";
    case "C":
      if (!ctx.cuisine || t.C < 0.3) return null;
      return ctx.likedCuisine
        ? `You love ${titleCase(ctx.cuisine)} food`
        : `You often eat ${titleCase(ctx.cuisine)}`;
    case "N":
      if (ctx.daysSinceCooked === null) return "Something new to try";
      return ctx.daysSinceCooked >= 14
        ? `Last made ${ctx.daysSinceCooked} days ago`
        : null;
    case "R":
      return ctx.rating !== null && ctx.rating >= 4
        ? `You rated it ${ctx.rating} stars`
        : null;
    case "D":
      return null;
  }
}

/** One to three reasons, largest weighted term first. */
export function explain(t: Terms, ctx: ExplainContext, max = 3): string[] {
  const contributions = Object.entries(weightedTerms(t)) as [
    keyof Terms,
    number,
  ][];
  const reasons: string[] = [];
  for (const [term, value] of contributions.sort((a, b) => b[1] - a[1])) {
    if (reasons.length >= max) break;
    if (value < MIN_CONTRIBUTION && reasons.length > 0) continue;
    const reason = reasonFor(term, t, ctx);
    if (reason) reasons.push(reason);
  }
  return reasons.length ? reasons : [`Good for ${ctx.slot}`];
}
