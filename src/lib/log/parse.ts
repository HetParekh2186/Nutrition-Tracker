// Plain-English logging (SPEC.md Flow A): Claude splits the text into
// items, the server resolves each to a food and turns the amount into
// grams. Claude never supplies a nutrient value. Dependencies are passed
// in so this runs in tests against a recorded response.

import { CONFIDENT } from "@/lib/foods/confidence";
import type { Resolution } from "@/lib/foods/resolve";
import type { FoodHit } from "@/lib/foods/types";
import type { ParseResult } from "@/lib/llm/schemas";

import { estimateGrams, type GramsEstimate } from "./grams";
import type { ParsedLogItem } from "./types";

export type ParseDeps = {
  parse: (text: string) => Promise<ParseResult>;
  resolve: (query: string) => Promise<Resolution>;
  portions: (
    foodIds: number[],
  ) => Promise<Map<number, { label: string; grams: number }[]>>;
};

export async function parseLog(
  deps: ParseDeps,
  text: string,
): Promise<ParsedLogItem[]> {
  const { items } = await deps.parse(text);
  const resolutions = await Promise.all(
    items.map((item) => deps.resolve(item.food_query)),
  );
  const ids = new Set<number>();
  for (const r of resolutions) {
    for (const hit of [r.best, ...r.alternatives]) if (hit) ids.add(hit.id);
  }
  const portions = await deps.portions([...ids]);

  return items.map((item, i) => {
    const r = resolutions[i]!;
    const candidate = (food: FoodHit) => {
      const est: GramsEstimate = estimateGrams(
        item.quantity,
        item.unit,
        portions.get(food.id) ?? [],
      );
      return { food, ...est };
    };
    const candidates = [r.best, ...r.alternatives]
      .filter((f): f is FoodHit => f !== null)
      .map(candidate);
    return {
      text: item.text,
      query: item.food_query,
      quantity: item.quantity,
      unit: item.unit,
      confidence: Number(r.confidence.toFixed(2)),
      needsReview: r.confidence < CONFIDENT || candidates.length === 0,
      candidates,
    };
  });
}
