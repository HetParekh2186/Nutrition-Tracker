// Seeds the public demo account with about 60 days of realistic data:
// profile and targets, weekly weigh-ins, dietary rules and a diary built
// from real USDA foods. Deterministic (seeded random), and safe to re-run:
// it wipes the demo's activity first.
//
// Usage: pnpm seed:demo

import { updatePreferences, updateProfile } from "@/lib/profile/repo";
import { addDays, localDate } from "@/lib/nutrition/dates";
import { embedRecipes } from "@/lib/recommend/embed-repo";
import { rebuildTasteProfile } from "@/lib/recommend/taste-repo";

import { chunk, scriptSql } from "./lib/db";
import { DEFAULT_DEMO_EMAIL, ensureDemoUser } from "./lib/demo-user";
import { DEMO_MEALS, type MealTemplate } from "./lib/demo-meals";

const DAYS = 60;
const TIMEZONE = "America/Chicago";
// Template grams are modest single portions; a 75 kg lifter eating at
// maintenance (about 2,740 kcal) eats more than that.
const PORTION_SCALE = 1.35;

/** Small seeded PRNG so every run produces the same demo. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Sql = ReturnType<typeof scriptSql>;

/** Exact USDA name, else the shortest name starting with it. */
async function resolveFoods(sql: Sql, names: string[]) {
  const ids = new Map<string, number>();
  const missing: string[] = [];
  for (const name of names) {
    const [row] = await sql<{ id: string }[]>`
      select id from foods
       where owner_id is null and (name = ${name} or name ilike ${`${name} (%`})
       order by (name = ${name}) desc, length(name)
       limit 1
    `;
    if (row) ids.set(name, Number(row.id));
    else missing.push(name);
  }
  if (missing.length) {
    throw new Error(
      `Foods not found (run pnpm import:usda?):\n${missing.join("\n")}`,
    );
  }
  return ids;
}

/** Local wall-clock time in Chicago as a UTC instant (CST or CDT). */
function chicagoInstant(date: string, hour: number, minute: number): Date {
  const month = Number(date.slice(5, 7));
  const offset = month >= 4 && month <= 10 ? "-05:00" : "-06:00";
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${offset}`);
}

const SLOT_TIMES = {
  breakfast: [7, 30],
  lunch: [12, 30],
  snack: [16, 0],
  dinner: [19, 0],
} as const;

async function main() {
  const sql = scriptSql();
  try {
    const email = process.env.DEMO_EMAIL ?? DEFAULT_DEMO_EMAIL;
    const password = process.env.DEMO_PASSWORD;
    if (!password) throw new Error("Set DEMO_PASSWORD in .env.local");
    const userId = await ensureDemoUser(sql, email, password);
    const today = localDate(new Date(), TIMEZONE);
    const rand = mulberry32(20261102);

    // Wipe the demo's activity so the seed is repeatable.
    for (const table of [
      "diary_entries",
      "body_metrics",
      "nutrient_targets",
      "recipe_interactions",
      "cook_sessions",
      "taste_profiles",
    ]) {
      await sql`delete from ${sql(table)} where user_id = ${userId}`;
    }

    // Weekly weigh-ins drifting from 76.4 kg to 75.0 kg.
    const metrics = [];
    for (let d = DAYS; d >= 0; d -= 7) {
      const progress = (DAYS - d) / DAYS;
      metrics.push({
        user_id: userId,
        measured_on: addDays(today, -d),
        weight_kg: Number(
          (76.4 - 1.4 * progress + (rand() - 0.5) * 0.4).toFixed(1),
        ),
      });
    }
    await sql`insert into body_metrics ${sql(metrics)}`;

    // Profile and targets through the app's own code, so they match exactly.
    await updateProfile(userId, {
      sex: "male",
      birthDate: "2006-01-15",
      heightCm: 178,
      activityLevel: "moderate",
      goal: "maintain",
      proteinGPerKg: 1.8,
      fatPctOfKcal: 0.25,
      unitSystem: "metric",
      timezone: TIMEZONE,
      completeOnboarding: true,
    });
    await updatePreferences(userId, {
      dietType: "omnivore",
      excludedIngredients: ["shellfish"],
      dislikedIngredients: ["olives"],
      likedCuisines: ["indian", "mexican", "italian"],
      maxCookMinutes: 45,
      equipment: ["oven", "air_fryer"],
      spiceLevel: 2,
      notes: "Lifts four days a week. Likes leftovers for lunch.",
    });

    const names = [
      ...new Set(
        Object.values(DEMO_MEALS)
          .flat()
          .flatMap((m) => m.items.map((i) => i.name)),
      ),
    ];
    const foodIds = await resolveFoods(sql, names);

    const pick = (list: MealTemplate[]): MealTemplate => {
      const total = list.reduce((s, m) => s + m.weight, 0);
      let r = rand() * total;
      for (const m of list) {
        r -= m.weight;
        if (r <= 0) return m;
      }
      return list[list.length - 1]!;
    };

    // Cook history from the starter library: a few favourites made more
    // than once, ratings, saves and a skip, so suggestions have taste to
    // learn from. Needs pnpm seed:recipes first.
    const starter = await sql<{ id: string; title: string }[]>`
      select id, title from recipes where owner_id is null
    `;
    const recipeId = new Map(starter.map((r) => [r.title, r.id]));
    const COOKS: [title: string, daysAgo: number][] = [
      ["Chicken tikka masala", 52],
      ["Turkey and bean chili", 45],
      ["Chicken tikka masala", 33],
      ["Chipotle chicken burrito bowl", 27],
      ["Chana masala", 20],
      ["Turkey and bean chili", 16],
      ["Chicken tikka masala", 11],
      ["Chipotle chicken burrito bowl", 6],
      ["Chana masala", 3],
    ];
    const RATINGS: [string, number][] = [
      ["Chicken tikka masala", 5],
      ["Chana masala", 4],
      ["Turkey and bean chili", 4],
      ["Chipotle chicken burrito bowl", 4],
    ];
    const SAVES = [
      "Thai basil chicken",
      "Lemon herb chicken with roasted potatoes",
      "Dal tadka",
    ];
    const SKIPS = ["Tofu and broccoli stir-fry"];
    const cookByDate = new Map<string, { id: string; title: string }>();
    const interactions: Record<string, unknown>[] = [];
    if (starter.length === 0) {
      console.warn(
        "No starter recipes; run pnpm seed:recipes for cook history.",
      );
    } else {
      for (const [title, daysAgo] of COOKS) {
        const id = recipeId.get(title);
        if (!id) continue;
        const date = addDays(today, -daysAgo);
        cookByDate.set(date, { id, title });
        for (const event of ["cook_start", "cook_complete", "log"] as const) {
          interactions.push({
            user_id: userId,
            recipe_id: id,
            event,
            created_at: chicagoInstant(
              date,
              event === "cook_start" ? 18 : 19,
              event === "log" ? 40 : 30,
            ),
          });
        }
      }
      // For You impressions: the evening before each cook, the cooked dish
      // and four others were in the top 5.
      const others = starter.map((r) => r.id);
      for (const [title, daysAgo] of COOKS) {
        const id = recipeId.get(title);
        if (!id) continue;
        const shownAt = chicagoInstant(addDays(today, -(daysAgo + 1)), 18, 30);
        const fillers = others
          .filter((o) => o !== id)
          .sort(() => rand() - 0.5)
          .slice(0, 4);
        for (const shown of [id, ...fillers]) {
          interactions.push({
            user_id: userId,
            recipe_id: shown,
            event: "impression",
            created_at: shownAt,
          });
        }
      }
      for (const [title, rating] of RATINGS) {
        const id = recipeId.get(title);
        if (id) {
          interactions.push({
            user_id: userId,
            recipe_id: id,
            event: "rate",
            rating,
            created_at: chicagoInstant(addDays(today, -2), 21, 0),
          });
        }
      }
      SAVES.forEach((title, i) => {
        const id = recipeId.get(title);
        if (id) {
          interactions.push({
            user_id: userId,
            recipe_id: id,
            event: "save",
            created_at: chicagoInstant(addDays(today, -(8 + i * 5)), 20, 0),
          });
        }
      });
      for (const title of SKIPS) {
        const id = recipeId.get(title);
        if (id) {
          interactions.push({
            user_id: userId,
            recipe_id: id,
            event: "skip",
            created_at: chicagoInstant(addDays(today, -4), 18, 0),
          });
        }
      }
      await sql`insert into recipe_interactions ${sql(interactions)}`;
    }

    const rows: Record<string, unknown>[] = [];
    const skipDays = new Set(
      [DAYS - 9, DAYS - 23, DAYS - 41].map((d) => addDays(today, -d)),
    );
    for (let d = DAYS; d >= 0; d--) {
      const date = addDays(today, -d);
      if (skipDays.has(date)) continue;
      const isToday = d === 0;
      const slots = (["breakfast", "lunch", "snack", "dinner"] as const).filter(
        (slot) => {
          if (isToday) return slot === "breakfast" || slot === "lunch";
          if (slot === "snack") return rand() < 0.8;
          if (slot === "dinner") return rand() < 0.96;
          return true;
        },
      );
      for (const slot of slots) {
        // Cooked dinners are logged as the recipe itself.
        const cooked = slot === "dinner" ? cookByDate.get(date) : undefined;
        if (cooked) {
          rows.push({
            user_id: userId,
            entry_date: date,
            meal_slot: "dinner",
            recipe_id: cooked.id,
            servings: 1,
            logged_via: "cook_mode",
            created_at: chicagoInstant(date, 19, 40),
          });
          continue;
        }
        const meals = [pick(DEMO_MEALS[slot])];
        // Some afternoons get a second snack.
        if (slot === "snack" && rand() < 0.45)
          meals.push(pick(DEMO_MEALS.snack));
        for (const meal of meals) {
          const [hour, minute] = SLOT_TIMES[slot];
          const via = rand() < 0.55 ? "recent" : "search";
          meal.items.forEach((item, i) => {
            const jitter = item.fixed ? 1 : 0.85 + rand() * 0.3;
            const grams = Math.max(
              1,
              Math.round((item.grams * PORTION_SCALE * jitter) / 5) * 5,
            );
            rows.push({
              user_id: userId,
              entry_date: date,
              meal_slot: slot,
              food_id: foodIds.get(item.name),
              quantity_g: item.fixed ? item.grams : grams,
              portion_label: item.fixed ? (item.portion ?? null) : null,
              logged_via: via,
              // Quick Log timing: a tap on a recent food is quicker than
              // a search.
              log_ms: Math.round(
                via === "recent" ? 3500 + rand() * 5000 : 7000 + rand() * 11000,
              ),
              created_at: chicagoInstant(
                date,
                hour,
                Math.min(59, minute + Math.floor(rand() * 20) + i),
              ),
            });
          });
        }
      }
    }
    // Food and recipe rows have different columns; insert each shape apart.
    const foodRows = rows.filter((r) => r.food_id !== undefined);
    const recipeRows = rows.filter((r) => r.recipe_id !== undefined);
    for (const batch of chunk(foodRows, 500)) {
      await sql`insert into diary_entries ${sql(batch)}`;
    }
    if (recipeRows.length) {
      await sql`insert into diary_entries ${sql(recipeRows)}`;
    }

    await embedRecipes();
    await rebuildTasteProfile(userId);

    console.log(
      `Demo ${email}: ${rows.length} diary entries over ${DAYS + 1} days, ${metrics.length} weigh-ins, ${interactions.length} recipe interactions.`,
    );
  } finally {
    await sql.end();
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
