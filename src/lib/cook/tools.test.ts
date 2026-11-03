import { describe, expect, it, vi } from "vitest";

import { N } from "@/lib/nutrition/catalog";

import { executeTool, type ToolContext, type ToolDeps } from "./tools";

const CREAM = 1;
const YOGURT = 2;
const ctx: ToolContext = {
  ingredients: [
    {
      id: 11,
      foodId: CREAM,
      quantityG: 100,
      displayText: "100 ml heavy cream",
    },
  ],
  recipeServings: 4,
  stepCount: 6,
  substitutions: [],
  excluded: ["shellfish"],
};
function deps(): ToolDeps {
  return {
    resolve: vi.fn(async (q: string) =>
      q.includes("yogurt")
        ? {
            foodId: YOGURT,
            name: "Yogurt, Greek, plain, nonfat",
            confidence: 1,
          }
        : null,
    ),
    foodMaps: async () =>
      new Map([
        [
          CREAM,
          { [N.energy]: 340, [N.protein]: 2.8, [N.carbs]: 2.7, [N.fat]: 36 },
        ],
        [
          YOGURT,
          { [N.energy]: 59, [N.protein]: 10.2, [N.carbs]: 3.6, [N.fat]: 0.4 },
        ],
      ]),
    density: async () => null,
    saveProposal: vi.fn(async () => 42),
    setServings: vi.fn(async () => {}),
    setStep: vi.fn(async () => {}),
  };
}

describe("executeTool", () => {
  it("proposes a swap with a server-computed macro diff (Flow B)", async () => {
    const d = deps();
    const out = await executeTool(
      "propose_substitution",
      {
        ingredient_id: 11,
        new_food_query: "yogurt, greek, plain",
        quantity_g: 120,
        reason: "Lighter, still creamy",
      },
      ctx,
      d,
    );
    expect(out.isError).toBeUndefined();
    expect(out.event?.type).toBe("proposal");
    if (out.event?.type !== "proposal") return;
    expect(out.event.proposal.id).toBe(42);
    expect(out.event.proposal.diff.delta.fatG).toBeCloseTo(
      (0.4 * 1.2 - 36) / 4,
      9,
    );
    // The model is told not to state numbers.
    expect(out.result).toMatch(/Do not state any numbers/);
  });

  it("refuses swaps that break a never-suggest rule", async () => {
    const d = deps();
    const out = await executeTool(
      "propose_substitution",
      {
        ingredient_id: 11,
        new_food_query: "shrimp, raw",
        quantity_g: 100,
        reason: "x",
      },
      ctx,
      d,
    );
    expect(out.isError).toBe(true);
    expect(d.saveProposal).not.toHaveBeenCalled();
  });

  it("reports unknown foods and ingredients as errors", async () => {
    const d = deps();
    expect(
      (
        await executeTool(
          "propose_substitution",
          {
            ingredient_id: 11,
            new_food_query: "unicorn",
            quantity_g: 1,
            reason: "x",
          },
          ctx,
          d,
        )
      ).isError,
    ).toBe(true);
    expect(
      (
        await executeTool(
          "propose_substitution",
          {
            ingredient_id: 99,
            new_food_query: "yogurt",
            quantity_g: 1,
            reason: "x",
          },
          ctx,
          d,
        )
      ).isError,
    ).toBe(true);
  });

  it("validates inputs with Zod", async () => {
    const out = await executeTool(
      "start_timer",
      { seconds: -5, label: "x" },
      ctx,
      deps(),
    );
    expect(out.isError).toBe(true);
    expect((await executeTool("bake_cake", {}, ctx, deps())).isError).toBe(
      true,
    );
  });

  it("starts timers, scales and moves steps", async () => {
    const d = deps();
    expect(
      (
        await executeTool(
          "start_timer",
          { seconds: 600, label: "Simmer" },
          ctx,
          d,
        )
      ).event,
    ).toEqual({
      type: "timer",
      seconds: 600,
      label: "Simmer",
    });
    await executeTool("scale_recipe", { servings: 2 }, ctx, d);
    expect(d.setServings).toHaveBeenCalledWith(2);
    expect((await executeTool("go_to_step", { step: 9 }, ctx, d)).isError).toBe(
      true,
    );
    await executeTool("go_to_step", { step: 3 }, ctx, d);
    expect(d.setStep).toHaveBeenCalledWith(3);
  });

  it("converts units", async () => {
    const out = await executeTool(
      "convert_units",
      { quantity: 1, from_unit: "cup", to_unit: "ml" },
      ctx,
      deps(),
    );
    expect(out.result).toMatch(/237 ml/);
  });
});
