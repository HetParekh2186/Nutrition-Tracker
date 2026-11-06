// The foods a user eats: what they log, and the ingredients of recipes they
// log, most frequent first. Feeds the familiar check and the recipe writer.

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getPreferences } from "@/lib/profile/repo";

import { knownSet, type Known } from "./familiar";

/** Long enough to cover a rotation, short enough to drop old habits. */
const HISTORY_DAYS = 180;

export async function loggedFoodNames(
  userId: string,
  limit = 300,
): Promise<string[]> {
  const rows = await getDb().execute<{ name: string }>(sql`
    with eaten as (
      select f.name
        from diary_entries d
        join foods f on f.id = d.food_id
       where d.user_id = ${userId}
         and d.entry_date > current_date - ${HISTORY_DAYS}::int
      union all
      select f.name
        from diary_entries d
        join recipe_ingredients ri on ri.recipe_id = d.recipe_id
        join foods f on f.id = ri.food_id
       where d.user_id = ${userId}
         and d.entry_date > current_date - ${HISTORY_DAYS}::int
    )
    select name from eaten group by name order by count(*) desc, name
     limit ${limit}
  `);
  return rows.map((r) => r.name);
}

/** What the user has, plus the names behind it for the recipe writer. */
export async function knownFoods(
  userId: string,
): Promise<{ known: Known; logged: string[]; pantry: string[] }> {
  const [logged, prefs] = await Promise.all([
    loggedFoodNames(userId),
    getPreferences(userId),
  ]);
  return {
    known: knownSet(logged, prefs.pantry),
    logged,
    pantry: prefs.pantry,
  };
}

/** Add ingredients to the kitchen list, keeping what is there. */
export async function addToPantry(
  userId: string,
  items: string[],
): Promise<string[]> {
  const clean = items.map((i) => i.trim().toLowerCase()).filter(Boolean);
  const rows = await getDb().execute<{ pantry: string[] }>(sql`
    insert into dietary_preferences (user_id, pantry)
    values (${userId}, ${sql`array[${sql.join(
      clean.map((c) => sql`${c}`),
      sql`, `,
    )}]::text[]`})
    on conflict (user_id) do update
      set pantry = (
            select array_agg(distinct p order by p)
              from unnest(dietary_preferences.pantry || excluded.pantry) p
          ),
          updated_at = now()
    returning pantry
  `);
  return rows[0]?.pantry ?? clean;
}
