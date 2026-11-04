// Phase 3 "done when": an AI recipe's displayed macros equal the sum of
// its matched ingredients. Uses a recorded Claude response, so tests never
// call the API (SPEC.md "LLM contracts").

import { describe, expect, it, vi } from "vitest";

import type { RecipeInput } from "@/lib/api/schemas";
import { ANIMAL_FOODS } from "@/lib/db/enums";
import fixture from "@/lib/llm/fixtures/recipe-chipotle-bowl.json";
import { GeneratedRecipe } from "@/lib/llm/schemas";
import { N } from "@/lib/nutrition/catalog";
import {
  scaleNutrients,
  sumNutrients,
  type NutrientMap,
} from "@/lib/nutrition/math";

import { recipeNutrition } from "./compute";
import {
  excludedHits,
  runGeneration,
  type DraftContext,
  type GenerateDeps,
} from "./generate";

const recorded = GeneratedRecipe.parse(fixture);

// Illustrative per-100 g values for the foods the queries resolve to.
const FOODS: Record<
  string,
  { id: number; per100g: NutrientMap; confidence: number }
> = {
  "chicken, breast, raw": {
    id: 1,
    confidence: 1,
    per100g: { [N.energy]: 120, [N.protein]: 22.5, [N.carbs]: 0, [N.fat]: 2.6 },
  },
  "quinoa, uncooked": {
    id: 2,
    confidence: 1,
    per100g: {
      [N.energy]: 368,
      [N.protein]: 14.1,
      [N.carbs]: 64.2,
      [N.fat]: 6.1,
    },
  },
  "beans, black, canned": {
    id: 3,
    confidence: 0.8,
    per100g: { [N.energy]: 91, [N.protein]: 6, [N.carbs]: 16.6, [N.fat]: 0.3 },
  },
  "corn, sweet, yellow, raw": {
    id: 4,
    confidence: 0.9,
    per100g: {
      [N.energy]: 86,
      [N.protein]: 3.3,
      [N.carbs]: 18.7,
      [N.fat]: 1.4,
    },
  },
  "oil, olive": {
    id: 5,
    confidence: 1,
    per100g: { [N.energy]: 884, [N.protein]: 0, [N.carbs]: 0, [N.fat]: 100 },
  },
  // "chipotle powder" is not in USDA: resolves weakly and stays unmatched.
  "chipotle powder": {
    id: 6,
    confidence: 0.3,
    per100g: { [N.energy]: 282, [N.protein]: 13.5 },
  },
  "yogurt, greek, plain, nonfat": {
    id: 7,
    confidence: 1,
    per100g: {
      [N.energy]: 59,
      [N.protein]: 10.2,
      [N.carbs]: 3.6,
      [N.fat]: 0.4,
    },
  },
  "lime juice, raw": {
    id: 8,
    confidence: 0.9,
    per100g: { [N.energy]: 25, [N.protein]: 0.4, [N.carbs]: 8.4, [N.fat]: 0.1 },
  },
};
const BY_ID = new Map(Object.values(FOODS).map((f) => [f.id, f.per100g]));

const CTX: DraftContext = {
  request: "high protein mexican dinner",
  servings: 2,
  preferences: {
    eats: [...ANIMAL_FOODS],
    excluded: [],
    disliked: [],
    likedCuisines: ["mexican"],
    maxCookMinutes: 45,
    equipment: [],
    spiceLevel: 2,
    notes: null,
  },
};

function makeDeps(drafts: GeneratedRecipe[]) {
  const saved: RecipeInput[] = [];
  let call = 0;
  const deps: GenerateDeps = {
    draft: vi.fn(async () => drafts[Math.min(call++, drafts.length - 1)]!),
    resolve: async (q) => {
      const f = FOODS[q];
      return f ? { foodId: f.id, name: q, confidence: f.confidence } : null;
    },
    foodMaps: async (ids) =>
      new Map(
        ids.flatMap((id) =>
          BY_ID.has(id) ? [[id, BY_ID.get(id)!] as const] : [],
        ),
      ),
    save: async (input) => {
      saved.push(input);
      return "recipe-1";
    },
  };
  return { deps, saved };
}

describe("recorded Claude response", () => {
  it("satisfies the GeneratedRecipe schema", () => {
    expect(GeneratedRecipe.safeParse(fixture).success).toBe(true);
  });
});

describe("runGeneration", () => {
  it("reports macros equal to the sum of its matched ingredients", async () => {
    const { deps, saved } = makeDeps([recorded]);
    const result = await runGeneration(deps, CTX);

    // Independent hand sum over matched ingredients only, per serving.
    const matched = recorded.ingredients.filter(
      (i) => (FOODS[i.food_query]?.confidence ?? 0) >= 0.5,
    );
    const total = sumNutrients(
      matched.map((i) =>
        scaleNutrients(FOODS[i.food_query]!.per100g, i.quantity_g),
      ),
    ).amounts;
    expect(result.perServing.kcal).toBeCloseTo(total[N.energy]! / 2, 9);
    expect(result.perServing.proteinG).toBeCloseTo(total[N.protein]! / 2, 9);
    expect(result.perServing.carbsG).toBeCloseTo(total[N.carbs]! / 2, 9);
    expect(result.perServing.fatG).toBeCloseTo(total[N.fat]! / 2, 9);

    // And the saved recipe recomputes to the same numbers the cache will hold.
    const recomputed = recipeNutrition(saved[0]!.ingredients, 2, BY_ID);
    expect(recomputed.macros).toEqual(result.perServing);
  });

  it("saves weak matches unmatched and lists them", async () => {
    const { deps, saved } = makeDeps([recorded]);
    const result = await runGeneration(deps, CTX);
    expect(result.unmatched).toEqual(["2 tsp chipotle chili powder"]);
    expect(saved[0]!.ingredients[5]!.foodId).toBeNull();
    expect(saved[0]!.ingredients[0]!.foodId).toBe(1);
  });

  it("scales weights to the requested servings", async () => {
    const { deps, saved } = makeDeps([recorded]);
    await runGeneration(deps, { ...CTX, servings: 4 });
    expect(saved[0]!.servings).toBe(4);
    expect(saved[0]!.ingredients[0]!.quantityG).toBe(600);
  });

  it("revises once when a macro is more than 10% off, then stops", async () => {
    const { deps } = makeDeps([recorded, recorded]);
    const result = await runGeneration(deps, {
      ...CTX,
      target: { kcal: 400, proteinG: 80 },
    });
    expect(deps.draft).toHaveBeenCalledTimes(2);
    const revision = vi.mocked(deps.draft).mock.calls[1]![1]!;
    expect(revision.problems[0]).toMatch(/within 10%/);
    expect(result.revised).toBe(true);
    expect(result.offTarget).toBe(true);
  });

  it("does not revise when on target", async () => {
    const { deps } = makeDeps([recorded]);
    const first = await runGeneration(deps, CTX);
    const { deps: deps2 } = makeDeps([recorded]);
    const result = await runGeneration(deps2, {
      ...CTX,
      target: first.perServing,
    });
    expect(deps2.draft).toHaveBeenCalledTimes(1);
    expect(result.revised).toBe(false);
    expect(result.offTarget).toBe(false);
  });

  it("asks for a revision when an excluded ingredient appears", async () => {
    const clean = {
      ...recorded,
      ingredients: recorded.ingredients.slice(0, 6),
    };
    const { deps } = makeDeps([recorded, clean]);
    await runGeneration(deps, {
      ...CTX,
      preferences: { ...CTX.preferences, excluded: ["yogurt"] },
    });
    const revision = vi.mocked(deps.draft).mock.calls[1]![1]!;
    expect(revision.problems.join(" ")).toMatch(/excluded ingredients: yogurt/);
  });

  it("refuses to save a recipe that still breaks a hard rule", async () => {
    const { deps, saved } = makeDeps([recorded, recorded]);
    await expect(
      runGeneration(deps, {
        ...CTX,
        preferences: { ...CTX.preferences, excluded: ["lime"] },
      }),
    ).rejects.toThrow(/lime/);
    expect(saved).toHaveLength(0);
  });

  it("treats the diet as a hard rule too", async () => {
    const { deps, saved } = makeDeps([recorded, recorded]);
    await expect(
      runGeneration(deps, {
        ...CTX,
        preferences: { ...CTX.preferences, eats: ["eggs", "dairy", "honey"] },
      }),
    ).rejects.toThrow(/chicken, which your diet does not include/);
    const revision = vi.mocked(deps.draft).mock.calls[1]![1]!;
    expect(revision.problems.join(" ")).toMatch(
      /uses chicken, which their diet does not allow/,
    );
    expect(saved).toHaveLength(0);
  });

  it("lets a vegetarian who eats chicken have the chicken bowl", async () => {
    const { deps, saved } = makeDeps([recorded]);
    await runGeneration(deps, {
      ...CTX,
      preferences: {
        ...CTX.preferences,
        eats: ["chicken", "eggs", "dairy", "honey"],
      },
    });
    expect(saved).toHaveLength(1);
  });
});

describe("excludedHits", () => {
  it("matches whole words in display text or the food query", () => {
    expect(excludedHits(recorded, ["beans", "pork"])).toEqual(["beans"]);
  });

  it("does not match inside other words", () => {
    expect(excludedHits(recorded, ["oil s"])).toEqual([]);
    expect(excludedHits(recorded, ["ime"])).toEqual([]);
  });
});

describe("excludedHits with categories", () => {
  it("blocks a lime-free rule only by name, but shellfish by its members", () => {
    const shrimpy = {
      ...recorded,
      ingredients: [
        ...recorded.ingredients,
        {
          display_text: "200 g prawns",
          food_query: "shrimp, raw",
          quantity_g: 200,
        },
      ],
    };
    expect(excludedHits(shrimpy, ["shellfish"])).toEqual(["shellfish"]);
    expect(excludedHits(recorded, ["shellfish"])).toEqual([]);
  });
});
