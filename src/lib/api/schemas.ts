// Zod schemas for API inputs. Shared by route handlers and client forms.

import { z } from "zod";

import { MEAL_SLOTS } from "@/lib/db/schema";
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
  equipment: z
    .array(
      z.enum([
        "oven",
        "air_fryer",
        "instant_pot",
        "grill",
        "microwave",
        "blender",
      ]),
    )
    .max(10)
    .optional(),
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
