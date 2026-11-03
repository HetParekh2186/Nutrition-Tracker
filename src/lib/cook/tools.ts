// The Cook Mode assistant's five tools (SPEC.md "Cook Mode assistant").
// Claude asks; the server validates every input with Zod and decides what
// happens. Dependencies are injected so the executor is unit-testable.

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type { NutrientMap } from "@/lib/nutrition/math";
import { expandExclusion, wordStartPattern } from "@/lib/recipes/allergens";

import {
  substitutionDiff,
  type CookIngredient,
  type Substitution,
} from "./substitute";
import type { ProposalDTO } from "./types";
import { convertUnits } from "./units";

export const ToolInputs = {
  start_timer: z.object({
    seconds: z.number().int().min(1).max(86_400),
    label: z.string().trim().min(1).max(60),
  }),
  propose_substitution: z.object({
    ingredient_id: z.number().int(),
    new_food_query: z.string().trim().min(2).max(100),
    quantity_g: z.number().positive().max(20_000),
    reason: z.string().trim().min(1).max(200),
  }),
  scale_recipe: z.object({ servings: z.number().positive().max(24) }),
  convert_units: z.object({
    quantity: z.number().positive().max(100_000),
    from_unit: z.string().trim().min(1).max(20),
    to_unit: z.string().trim().min(1).max(20),
    food_id: z.number().int().optional(),
  }),
  go_to_step: z.object({ step: z.number().int().min(1) }),
};

export type ToolName = keyof typeof ToolInputs;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "start_timer",
    description:
      "Start a kitchen timer the cook can see, for waiting steps like simmering or resting.",
    input_schema: {
      type: "object",
      properties: {
        seconds: { type: "integer", description: "Length in seconds" },
        label: {
          type: "string",
          description: "Short label, e.g. 'Simmer rice'",
        },
      },
      required: ["seconds", "label"],
    },
  },
  {
    name: "propose_substitution",
    description:
      "Propose swapping one recipe ingredient for another food. The app matches the food in USDA data, works out the macro change and shows the cook a card to accept or reject. Use this for every swap; never state macro numbers yourself.",
    input_schema: {
      type: "object",
      properties: {
        ingredient_id: {
          type: "integer",
          description:
            "id of the ingredient to replace, from the ingredient list",
        },
        new_food_query: {
          type: "string",
          description:
            "The replacement as a USDA-style name, e.g. 'yogurt, greek, plain, nonfat'",
        },
        quantity_g: {
          type: "number",
          description:
            "Raw grams of the replacement for the whole recipe at its original serving count",
        },
        reason: {
          type: "string",
          description: "One short sentence on why it works",
        },
      },
      required: ["ingredient_id", "new_food_query", "quantity_g", "reason"],
    },
  },
  {
    name: "scale_recipe",
    description:
      "Change how many servings the cook is making; ingredient amounts update.",
    input_schema: {
      type: "object",
      properties: { servings: { type: "number" } },
      required: ["servings"],
    },
  },
  {
    name: "convert_units",
    description:
      "Convert an amount between units (g, kg, oz, lb, ml, l, tsp, tbsp, fl oz, cup). Give food_id to convert between weight and volume accurately.",
    input_schema: {
      type: "object",
      properties: {
        quantity: { type: "number" },
        from_unit: { type: "string" },
        to_unit: { type: "string" },
        food_id: {
          type: "integer",
          description:
            "Food id from the ingredient list, for weight-volume conversions",
        },
      },
      required: ["quantity", "from_unit", "to_unit"],
    },
  },
  {
    name: "go_to_step",
    description: "Move the cook's step view to a step number.",
    input_schema: {
      type: "object",
      properties: { step: { type: "integer" } },
      required: ["step"],
    },
  },
];

/** What the client is told to do as a result of a tool call. */
export type ToolEvent =
  | { type: "timer"; seconds: number; label: string }
  | { type: "proposal"; proposal: ProposalDTO }
  | { type: "servings"; servings: number }
  | { type: "step"; step: number };

export type ToolContext = {
  ingredients: CookIngredient[];
  recipeServings: number;
  stepCount: number;
  substitutions: Substitution[];
  excluded: string[];
};

export type ToolDeps = {
  resolve: (
    query: string,
  ) => Promise<{ foodId: number; name: string; confidence: number } | null>;
  foodMaps: (ids: number[]) => Promise<Map<number, NutrientMap>>;
  density: (foodId: number) => Promise<number | null>;
  saveProposal: (p: Omit<ProposalDTO, "id">) => Promise<number>;
  setServings: (servings: number) => Promise<void>;
  setStep: (step: number) => Promise<void>;
};

export type ToolOutcome = {
  result: string;
  isError?: boolean;
  event?: ToolEvent;
};

const MIN_CONFIDENCE = 0.5;

export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
  deps: ToolDeps,
): Promise<ToolOutcome> {
  if (!(name in ToolInputs))
    return { result: `Unknown tool ${name}`, isError: true };
  const parsed = ToolInputs[name as ToolName].safeParse(rawInput);
  if (!parsed.success) {
    return { result: `Invalid input: ${parsed.error.message}`, isError: true };
  }

  switch (name as ToolName) {
    case "start_timer": {
      const { seconds, label } = parsed.data as z.infer<
        typeof ToolInputs.start_timer
      >;
      return {
        result: `Timer "${label}" started.`,
        event: { type: "timer", seconds, label },
      };
    }
    case "go_to_step": {
      const { step } = parsed.data as z.infer<typeof ToolInputs.go_to_step>;
      if (step > ctx.stepCount) {
        return {
          result: `There are only ${ctx.stepCount} steps.`,
          isError: true,
        };
      }
      await deps.setStep(step);
      return { result: `Showing step ${step}.`, event: { type: "step", step } };
    }
    case "scale_recipe": {
      const { servings } = parsed.data as z.infer<
        typeof ToolInputs.scale_recipe
      >;
      await deps.setServings(servings);
      return {
        result: `Now making ${servings} servings; the ingredient amounts on screen updated.`,
        event: { type: "servings", servings },
      };
    }
    case "convert_units": {
      const input = parsed.data as z.infer<typeof ToolInputs.convert_units>;
      const density = input.food_id ? await deps.density(input.food_id) : null;
      const r = convertUnits(
        input.quantity,
        input.from_unit,
        input.to_unit,
        density,
      );
      if (!r)
        return { result: "Those units cannot be converted.", isError: true };
      return {
        result: `${input.quantity} ${input.from_unit} is about ${r.quantity} ${r.unit}${r.note ? ` (${r.note})` : ""}.`,
      };
    }
    case "propose_substitution": {
      const input = parsed.data as z.infer<
        typeof ToolInputs.propose_substitution
      >;
      const original = ctx.ingredients.find(
        (i) => i.id === input.ingredient_id,
      );
      if (!original)
        return { result: "No ingredient has that id.", isError: true };
      // Never-suggest rules are hard, for swaps too.
      const broken = ctx.excluded.find((rule) =>
        expandExclusion(rule).some((w) =>
          new RegExp(wordStartPattern(w, "js"), "i").test(input.new_food_query),
        ),
      );
      if (broken) {
        return {
          result: `The cook never eats ${broken}; suggest something else.`,
          isError: true,
        };
      }
      const match = await deps.resolve(input.new_food_query);
      if (!match || match.confidence < MIN_CONFIDENCE) {
        return {
          result: `Could not find "${input.new_food_query}" in the food database; try a plainer name.`,
          isError: true,
        };
      }
      const substitution: Substitution = {
        ingredientId: original.id,
        newFoodId: match.foodId,
        quantityG: input.quantity_g,
        reason: input.reason,
        newFoodName: match.name,
        displayText: `${Math.round(input.quantity_g)} g ${match.name.split(",").slice(0, 2).join(",").toLowerCase()}`,
      };
      const ids = [
        ...ctx.ingredients.flatMap((i) => (i.foodId ? [i.foodId] : [])),
        ...ctx.substitutions.map((s) => s.newFoodId),
        match.foodId,
      ];
      const diff = substitutionDiff(
        ctx.ingredients,
        ctx.substitutions,
        substitution,
        ctx.recipeServings,
        await deps.foodMaps([...new Set(ids)]),
      );
      const proposal: Omit<ProposalDTO, "id"> = {
        status: "pending",
        substitution,
        originalText: original.displayText,
        newFoodName: match.name,
        diff,
      };
      const id = await deps.saveProposal(proposal);
      return {
        result: `Shown to the cook as a card with the macro change and Accept / Reject buttons (matched "${match.name}"). Do not state any numbers; briefly say why the swap works.`,
        event: { type: "proposal", proposal: { id, ...proposal } },
      };
    }
  }
}
