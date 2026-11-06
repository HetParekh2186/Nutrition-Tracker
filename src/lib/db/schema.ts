// Drizzle schema for the data model in SPEC.md. Column names are camelCase
// here and snake_case in Postgres (see `casing` in drizzle.config.ts).
//
// The app connects as `postgres` and scopes every query by user id itself.
// RLS policies are defence in depth for the Supabase Data API.

import { sql, type SQL } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";

import {
  ACTIVITY_LEVELS,
  ANIMAL_FOODS,
  DIET_TYPES,
  FOOD_SOURCES,
  GOALS,
  INTERACTION_EVENTS,
  LOGGED_VIA,
  MEAL_SLOTS,
  NUTRIENT_CATEGORIES,
  RECIPE_SOURCES,
} from "./enums";

export * from "./enums";

export const EMBEDDING_DIMENSIONS = 1024;

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

const num = () => numeric({ mode: "number" });

const uid = sql`(select auth.uid())`;

/** One policy covering every command for rows the signed-in user owns. */
function ownRows(name: string, ownerColumn: SQL) {
  return pgPolicy(name, {
    as: "permissive",
    for: "all",
    to: authenticatedRole,
    using: sql`${ownerColumn} = ${uid}`,
    withCheck: sql`${ownerColumn} = ${uid}`,
  });
}

// ========== People ==========

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey(), // = auth.users.id
    email: text().unique().notNull(),
    displayName: text(),
    isDemo: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [ownRows("users_own", sql`${t.id}`)],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    sex: text({ enum: ["male", "female"] }),
    birthDate: date(),
    heightCm: numeric({ precision: 5, scale: 1, mode: "number" }),
    activityLevel: text({ enum: ACTIVITY_LEVELS }),
    goal: text({ enum: GOALS }),
    proteinGPerKg: numeric({ precision: 3, scale: 1, mode: "number" })
      .notNull()
      .default(1.8),
    fatPctOfKcal: numeric({ precision: 3, scale: 2, mode: "number" })
      .notNull()
      .default(0.25),
    unitSystem: text({ enum: ["metric", "imperial"] })
      .notNull()
      .default("metric"),
    timezone: text().notNull().default("America/Chicago"),
    onboardedAt: timestamp({ withTimezone: true }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("user_profiles_sex", sql`${t.sex} in ('male','female')`),
    check(
      "user_profiles_activity",
      sql`${t.activityLevel} in ('sedentary','light','moderate','active','very_active')`,
    ),
    check(
      "user_profiles_goal",
      sql`${t.goal} in ('lose','maintain','gain','recomp')`,
    ),
    check("user_profiles_units", sql`${t.unitSystem} in ('metric','imperial')`),
    ownRows("user_profiles_own", sql`${t.userId}`),
  ],
);

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    measuredOn: date().notNull(),
    weightKg: numeric({ precision: 5, scale: 2, mode: "number" }),
    bodyFatPct: numeric({ precision: 4, scale: 1, mode: "number" }),
  },
  (t) => [
    unique().on(t.userId, t.measuredOn),
    ownRows("body_metrics_own", sql`${t.userId}`),
  ],
);

export const dietaryPreferences = pgTable(
  "dietary_preferences",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    dietType: text({ enum: DIET_TYPES }), // the preset eats matches, if any
    // Animal foods the user eats; the hard diet rule. Defaults to all.
    eats: text({ enum: ANIMAL_FOODS })
      .array()
      .notNull()
      .default(
        sql`'{beef,pork,lamb,chicken,poultry,fish,shellfish,eggs,dairy,honey}'`,
      ),
    excludedIngredients: text()
      .array()
      .notNull()
      .default(sql`'{}'`), // hard rule
    dislikedIngredients: text()
      .array()
      .notNull()
      .default(sql`'{}'`), // soft penalty
    likedCuisines: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    maxCookMinutes: integer(),
    equipment: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    spiceLevel: smallint(),
    notes: text(), // free text passed to the LLM
    // Ingredients they have without logging them ("tahini"); recipes count
    // these as familiar and never ask about them.
    pantry: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "dietary_preferences_diet",
      sql`${t.dietType} in ('omnivore','vegetarian','eggetarian','vegan','pescatarian')`,
    ),
    check("dietary_preferences_spice", sql`${t.spiceLevel} between 0 and 3`),
    ownRows("dietary_preferences_own", sql`${t.userId}`),
  ],
);

// ========== Nutrient catalog ==========

export const nutrients = pgTable(
  "nutrients",
  {
    id: integer().primaryKey(), // USDA FDC nutrient id
    name: text().notNull(),
    unit: text().notNull(), // 'g','mg','µg','kcal'
    category: text({ enum: NUTRIENT_CATEGORIES }).notNull(),
    displayOrder: integer().notNull().default(0),
  },
  (t) => [
    check(
      "nutrients_category",
      sql`${t.category} in ('energy','macro','vitamin','mineral','lipid','amino_acid','other')`,
    ),
    pgPolicy("nutrients_read", {
      for: "select",
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
  ],
);

export const nutrientTargets = pgTable(
  "nutrient_targets",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nutrientId: integer()
      .notNull()
      .references(() => nutrients.id),
    minAmount: num(), // RDA / AI or computed macro target
    maxAmount: num(), // upper limit, if any
    source: text({ enum: ["default", "computed", "user"] })
      .notNull()
      .default("default"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.nutrientId] }),
    check(
      "nutrient_targets_source",
      sql`${t.source} in ('default','computed','user')`,
    ),
    ownRows("nutrient_targets_own", sql`${t.userId}`),
  ],
);

// ========== Foods ==========

export const foods = pgTable(
  "foods",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    source: text({ enum: FOOD_SOURCES }).notNull(),
    sourceId: text(), // FDC id or barcode
    name: text().notNull(),
    brand: text(),
    ownerId: uuid().references(() => users.id, { onDelete: "cascade" }), // custom foods only
    searchTsv: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,''))`,
    ),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    // Mise score inputs from Open Food Facts; null is unknown.
    nutriscorePoints: smallint(),
    additives: text().array(),
    organic: boolean(),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.source, t.sourceId),
    check(
      "foods_source",
      sql`${t.source} in ('usda_foundation','usda_sr_legacy','usda_branded','off','custom')`,
    ),
    index("foods_name_trgm").using("gin", t.name.op("gin_trgm_ops")),
    index("foods_tsv").using("gin", t.searchTsv),
    index("foods_owner").on(t.ownerId),
    pgPolicy("foods_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null or ${t.ownerId} = ${uid}`,
    }),
    pgPolicy("foods_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${uid}`,
      withCheck: sql`${t.ownerId} = ${uid}`,
    }),
  ],
);

const foodVisible = (foodId: SQL) =>
  sql`exists (select 1 from foods f where f.id = ${foodId} and (f.owner_id is null or f.owner_id = ${uid}))`;
const foodOwned = (foodId: SQL) =>
  sql`exists (select 1 from foods f where f.id = ${foodId} and f.owner_id = ${uid})`;

export const foodNutrients = pgTable(
  "food_nutrients",
  {
    foodId: bigint({ mode: "number" })
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    nutrientId: integer()
      .notNull()
      .references(() => nutrients.id),
    amountPer100g: numeric("amount_per_100g", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.foodId, t.nutrientId] }),
    pgPolicy("food_nutrients_read", {
      for: "select",
      to: authenticatedRole,
      using: foodVisible(sql`${t.foodId}`),
    }),
    pgPolicy("food_nutrients_write_own", {
      for: "all",
      to: authenticatedRole,
      using: foodOwned(sql`${t.foodId}`),
      withCheck: foodOwned(sql`${t.foodId}`),
    }),
  ],
);

export const foodPortions = pgTable(
  "food_portions",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    foodId: bigint({ mode: "number" })
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    label: text().notNull(), // '1 large egg', '1 cup, chopped'
    grams: num().notNull(),
  },
  (t) => [
    check("food_portions_grams", sql`${t.grams} > 0`),
    index("food_portions_food").on(t.foodId),
    pgPolicy("food_portions_read", {
      for: "select",
      to: authenticatedRole,
      using: foodVisible(sql`${t.foodId}`),
    }),
    pgPolicy("food_portions_write_own", {
      for: "all",
      to: authenticatedRole,
      using: foodOwned(sql`${t.foodId}`),
      withCheck: foodOwned(sql`${t.foodId}`),
    }),
  ],
);

// ========== Recipes ==========

export const recipes = pgTable(
  "recipes",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid().references(() => users.id, { onDelete: "cascade" }),
    parentRecipeId: uuid().references((): AnyPgColumn => recipes.id, {
      onDelete: "set null",
    }),
    source: text({ enum: RECIPE_SOURCES }).notNull(),
    title: text().notNull(),
    description: text(),
    cuisine: text(),
    mealTypes: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    servings: num().notNull(),
    prepMinutes: integer(),
    cookMinutes: integer(),
    coverSeed: integer()
      .notNull()
      .default(sql`floor(random()*1e6)`),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "recipes_source",
      sql`${t.source} in ('user','ai_generated','ai_adapted','imported')`,
    ),
    check("recipes_servings", sql`${t.servings} > 0`),
    index("recipes_embedding").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("recipes_owner").on(t.ownerId),
    pgPolicy("recipes_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.ownerId} is null or ${t.ownerId} = ${uid}`,
    }),
    pgPolicy("recipes_write_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.ownerId} = ${uid}`,
      withCheck: sql`${t.ownerId} = ${uid}`,
    }),
  ],
);

const recipeVisible = (recipeId: SQL) =>
  sql`exists (select 1 from recipes r where r.id = ${recipeId} and (r.owner_id is null or r.owner_id = ${uid}))`;
const recipeOwned = (recipeId: SQL) =>
  sql`exists (select 1 from recipes r where r.id = ${recipeId} and r.owner_id = ${uid})`;

function recipeChildPolicies(prefix: string, recipeId: SQL) {
  return [
    pgPolicy(`${prefix}_read`, {
      for: "select",
      to: authenticatedRole,
      using: recipeVisible(recipeId),
    }),
    pgPolicy(`${prefix}_write_own`, {
      for: "all",
      to: authenticatedRole,
      using: recipeOwned(recipeId),
      withCheck: recipeOwned(recipeId),
    }),
  ];
}

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    foodId: bigint({ mode: "number" }).references(() => foods.id), // null until matched
    quantityG: num().notNull(),
    displayText: text().notNull(), // '2 cloves garlic, minced'
    isOptional: boolean().notNull().default(false),
    groupLabel: text(), // 'For the sauce'
  },
  (t) => [
    check("recipe_ingredients_qty", sql`${t.quantityG} >= 0`),
    index("recipe_ingredients_recipe").on(t.recipeId),
    ...recipeChildPolicies("recipe_ingredients", sql`${t.recipeId}`),
  ],
);

export const recipeSteps = pgTable(
  "recipe_steps",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    instruction: text().notNull(),
    timerSeconds: integer(),
    ingredientIds: bigint({ mode: "number" })
      .array()
      .notNull()
      .default(sql`'{}'`),
  },
  (t) => [
    unique().on(t.recipeId, t.position),
    ...recipeChildPolicies("recipe_steps", sql`${t.recipeId}`),
  ],
);

/** Cache; rebuilt whenever ingredients change. */
export const recipeNutrition = pgTable(
  "recipe_nutrition",
  {
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    nutrientId: integer()
      .notNull()
      .references(() => nutrients.id),
    amountPerServing: num().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.recipeId, t.nutrientId] }),
    ...recipeChildPolicies("recipe_nutrition", sql`${t.recipeId}`),
  ],
);

// ========== Saved meals ==========

/** A named group of foods and recipes logged together, e.g. "Usual breakfast". */
export const meals = pgTable(
  "meals",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("meals_owner").on(t.ownerId),
    ownRows("meals_own", sql`${t.ownerId}`),
  ],
);

const mealOwned = (mealId: SQL) =>
  sql`exists (select 1 from meals m where m.id = ${mealId} and m.owner_id = ${uid})`;

export const mealItems = pgTable(
  "meal_items",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    mealId: uuid()
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    foodId: bigint({ mode: "number" }).references(() => foods.id, {
      onDelete: "cascade",
    }),
    recipeId: uuid().references(() => recipes.id, { onDelete: "cascade" }),
    quantityG: num(),
    portionLabel: text(),
    servings: num(),
  },
  (t) => [
    check(
      "meal_items_food_or_recipe",
      sql`(${t.foodId} is not null and ${t.quantityG} > 0 and ${t.recipeId} is null) or (${t.recipeId} is not null and ${t.servings} > 0 and ${t.foodId} is null)`,
    ),
    index("meal_items_meal").on(t.mealId),
    pgPolicy("meal_items_own", {
      for: "all",
      to: authenticatedRole,
      using: mealOwned(sql`${t.mealId}`),
      withCheck: mealOwned(sql`${t.mealId}`),
    }),
  ],
);

// ========== Activity ==========

export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date().notNull(), // in the user's timezone
    mealSlot: text({ enum: MEAL_SLOTS }).notNull(),
    foodId: bigint({ mode: "number" }).references(() => foods.id),
    recipeId: uuid().references(() => recipes.id),
    quantityG: num(), // when logging a food
    servings: num(), // when logging a recipe
    portionLabel: text(),
    cookSessionId: uuid(), // set when logged from Cook Mode
    loggedVia: text({ enum: LOGGED_VIA }).notNull().default("search"),
    logMs: integer(), // time from opening Quick Log to logging, for Impact
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "diary_entries_slot",
      sql`${t.mealSlot} in ('breakfast','lunch','dinner','snack')`,
    ),
    check(
      "diary_entries_via",
      sql`${t.loggedVia} in ('search','natural_language','recent','copy','recipe','cook_mode','meal')`,
    ),
    check(
      "diary_entries_food_or_recipe",
      sql`(${t.foodId} is not null and ${t.quantityG} is not null and ${t.recipeId} is null) or (${t.recipeId} is not null and ${t.servings} is not null and ${t.foodId} is null)`,
    ),
    index("diary_user_date").on(t.userId, t.entryDate),
    index("diary_user_food").on(t.userId, t.foodId),
    ownRows("diary_entries_own", sql`${t.userId}`),
  ],
);

export const recipeInteractions = pgTable(
  "recipe_interactions",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    event: text({ enum: INTERACTION_EVENTS }).notNull(),
    rating: smallint(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "recipe_interactions_event",
      sql`${t.event} in ('impression','view','save','unsave','skip','cook_start','cook_complete','log','rate')`,
    ),
    check("recipe_interactions_rating", sql`${t.rating} between 1 and 5`),
    index("interactions_user").on(t.userId, t.createdAt.desc()),
    ownRows("recipe_interactions_own", sql`${t.userId}`),
  ],
);

export type TopIngredient = { foodId: number; name: string; count: number };

/** Derived; rebuilt nightly and after each cook. */
export const tasteProfiles = pgTable(
  "taste_profiles",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    tasteEmbedding: vector({ dimensions: EMBEDDING_DIMENSIONS }),
    topIngredients: jsonb()
      .$type<TopIngredient[]>()
      .notNull()
      .default(sql`'[]'`),
    cuisineWeights: jsonb()
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'`),
    mealTimePatterns: jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    rebuiltAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [ownRows("taste_profiles_own", sql`${t.userId}`)],
);

export type Substitution = {
  ingredientId: number;
  newFoodId: number;
  quantityG: number;
  reason: string;
  newFoodName?: string | undefined;
  displayText?: string | undefined;
};

export const cookSessions = pgTable(
  "cook_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid()
      .notNull()
      .references(() => recipes.id),
    servings: num().notNull(),
    currentStep: integer().notNull().default(1),
    substitutions: jsonb()
      .$type<Substitution[]>()
      .notNull()
      .default(sql`'[]'`),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [ownRows("cook_sessions_own", sql`${t.userId}`)],
);

const sessionOwned = (sessionId: SQL) =>
  sql`exists (select 1 from cook_sessions s where s.id = ${sessionId} and s.user_id = ${uid})`;

export const cookMessages = pgTable(
  "cook_messages",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => cookSessions.id, { onDelete: "cascade" }),
    role: text({ enum: ["user", "assistant", "tool"] }).notNull(),
    content: jsonb().$type<unknown>().notNull(),
    stepAtTime: integer(),
    createdAt: createdAt(),
  },
  (t) => [
    check("cook_messages_role", sql`${t.role} in ('user','assistant','tool')`),
    index("cook_messages_session").on(t.sessionId, t.createdAt),
    pgPolicy("cook_messages_own", {
      for: "all",
      to: authenticatedRole,
      using: sessionOwned(sql`${t.sessionId}`),
      withCheck: sessionOwned(sql`${t.sessionId}`),
    }),
  ],
);

// ========== LLM usage (not in the spec's 18 tables) ==========
// Backs the per-user rate limit and per-feature token logging that SPEC.md
// "LLM features" asks for. Written by the server only.

export const llmUsage = pgTable(
  "llm_usage",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text().notNull(), // 'recipe_generate', 'log_parse', ...
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    ok: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("llm_usage_user_time").on(t.userId, t.createdAt.desc()),
    pgPolicy("llm_usage_read_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.userId} = ${uid}`,
    }),
  ],
);
