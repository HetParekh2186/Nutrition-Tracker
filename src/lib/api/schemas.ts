// Zod schemas for API inputs. Shared by route handlers and client forms.

import { z } from "zod";

import { EQUIPMENT, MEAL_SLOTS } from "@/lib/db/enums";
import { isIsoDate } from "@/lib/nutrition/dates";

export const IsoDate = z.string().refine(isIsoDate, "Use YYYY-MM-DD");
export const MealSlotSchema = z.enum(MEAL_SLOTS);

const Grams = z.number().positive().max(10_000);
const Servings = z.number().positive().max(100);

export const FoodSearchQuery = z.object({
  q: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const DiaryQuery = z.object({ date: IsoDate.optional() });

export const NewDiaryEntry = z.object({
  date: IsoDate,
  mealSlot: MealSlotSchema,
  loggedVia: z
    .enum(["search", "natural_language", "recent", "recipe"])
    .default("search"),
  item: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("food"),
      foodId: z.number().int().positive(),
      quantityG: Grams,
      portionLabel: z.string().max(120).nullish(),
    }),
    z.object({
      kind: z.literal("recipe"),
      recipeId: z.uuid(),
      servings: Servings,
    }),
  ]),
});
export type NewDiaryEntryInput = z.input<typeof NewDiaryEntry>;

export const DiaryPatch = z
  .object({
    date: IsoDate.optional(),
    mealSlot: MealSlotSchema.optional(),
    quantityG: Grams.optional(),
    portionLabel: z.string().max(120).nullish(),
    servings: Servings.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type DiaryPatchInput = z.input<typeof DiaryPatch>;

export const CopyRequest = z
  .object({
    from: IsoDate,
    to: IsoDate,
    slot: MealSlotSchema.optional(),
    toSlot: MealSlotSchema.optional(),
  })
  .refine(
    (v) => v.from !== v.to || (v.slot && v.toSlot && v.slot !== v.toSlot),
    { message: "Pick a different day or slot to copy into" },
  );
export type CopyRequestInput = z.input<typeof CopyRequest>;

const Amount = z.number().min(0).max(100_000);

export const CustomFoodRequest = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).optional(),
  servingLabel: z.string().trim().min(1).max(60),
  servingGrams: Grams,
  kcal: Amount,
  proteinG: Amount,
  carbsG: Amount,
  fatG: Amount,
  fiberG: Amount.optional(),
  sugarsG: Amount.optional(),
  sodiumMg: Amount.optional(),
});
export type CustomFoodRequestInput = z.input<typeof CustomFoodRequest>;

// ---------- Profile, preferences, targets (Phase 2) ----------

/** Body stats always arrive in metric; the client converts imperial. */
export const ProfileUpdateSchema = z.object({
  sex: z.enum(["male", "female"]).optional(),
  birthDate: IsoDate.optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  goal: z.enum(["lose", "maintain", "gain", "recomp"]).optional(),
  proteinGPerKg: z.number().min(0.8).max(3.5).optional(),
  fatPctOfKcal: z.number().min(0.15).max(0.5).optional(),
  unitSystem: z.enum(["metric", "imperial"]).optional(),
  timezone: z
    .string()
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone")
    .optional(),
  completeOnboarding: z.boolean().optional(),
});
export type ProfileUpdateInput = z.input<typeof ProfileUpdateSchema>;

const IngredientList = z
  .array(z.string().trim().toLowerCase().min(1).max(60))
  .max(50)
  .transform((list) => [...new Set(list)]);

export const PreferencesUpdateSchema = z.object({
  dietType: z
    .enum(["omnivore", "vegetarian", "eggetarian", "vegan", "pescatarian"])
    .nullable()
    .optional(),
  excludedIngredients: IngredientList.optional(),
  dislikedIngredients: IngredientList.optional(),
  likedCuisines: IngredientList.optional(),
  maxCookMinutes: z.number().int().min(5).max(600).nullable().optional(),
  equipment: z.array(z.enum(EQUIPMENT)).max(10).optional(),
  spiceLevel: z.number().int().min(0).max(3).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type PreferencesUpdateInput = z.input<typeof PreferencesUpdateSchema>;

const TargetAmount = z.number().min(0).max(100_000).nullable();

export const TargetsUpdateSchema = z.object({
  targets: z
    .array(
      z.union([
        z.object({ nutrientId: z.number().int(), reset: z.literal(true) }),
        z
          .object({
            nutrientId: z.number().int(),
            min: TargetAmount,
            max: TargetAmount,
          })
          .refine((t) => t.min === null || t.max === null || t.min <= t.max, {
            message: "Minimum must not be above maximum",
          }),
      ]),
    )
    .min(1)
    .max(100),
});
export type TargetsUpdateInput = z.input<typeof TargetsUpdateSchema>;

// ---------- Insights (Phase 2) ----------

export const RangeQuery = z
  .object({ from: IsoDate, to: IsoDate })
  .refine((v) => v.from <= v.to, "from must be on or before to")
  .refine(
    (v) => Date.parse(v.to) - Date.parse(v.from) <= 365 * 86_400_000,
    "Ranges are limited to one year",
  );

export const SourcesQuery = z.object({
  nutrient: z.coerce.number().int().positive(),
  from: IsoDate,
  to: IsoDate,
});

// ---------- Recipes (Phase 3) ----------

export const RecipeInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).nullish(),
  cuisine: z.string().trim().toLowerCase().max(40).nullish(),
  mealTypes: z.array(MealSlotSchema).max(4).default([]),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(30))
    .max(12)
    .default([]),
  servings: z.number().positive().max(50),
  prepMinutes: z.number().int().min(0).max(1440).nullish(),
  cookMinutes: z.number().int().min(0).max(1440).nullish(),
  ingredients: z
    .array(
      z.object({
        displayText: z.string().trim().min(1).max(160),
        foodId: z.number().int().positive().nullable(),
        quantityG: z.number().min(0).max(20_000),
        isOptional: z.boolean().default(false),
        groupLabel: z.string().trim().max(60).nullish(),
      }),
    )
    .min(1)
    .max(60),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1).max(1000),
        timerSeconds: z.number().int().min(1).max(86_400).nullish(),
        ingredientIndexes: z.array(z.number().int().min(0)).default([]),
      }),
    )
    .max(40)
    .default([]),
});
export type RecipeInput = z.output<typeof RecipeInputSchema>;
export type RecipeInputDraft = z.input<typeof RecipeInputSchema>;

export const RecipeQuery = z.object({
  query: z.string().max(100).optional(),
  tags: z.string().max(200).optional(),
  slot: MealSlotSchema.optional(),
});

export const RecipeViewQuery = z.object({
  servings: z.coerce.number().positive().max(50).optional(),
});

export const GenerateRequest = z.object({
  request: z.string().trim().min(3).max(500),
  slot: MealSlotSchema.optional(),
  servings: z.number().int().min(1).max(12).default(2),
  /** Per-serving targets; defaults to the slot's remaining budget. */
  target: z
    .object({
      kcal: z.number().positive().max(3000),
      proteinG: z.number().min(0).max(300),
      carbsG: z.number().min(0).max(500),
      fatG: z.number().min(0).max(200),
    })
    .partial()
    .optional(),
});
export type GenerateRequestInput = z.input<typeof GenerateRequest>;

export const AdaptRequest = z.object({
  instructions: z.string().trim().min(3).max(500),
  servings: z.number().int().min(1).max(12).optional(),
});
