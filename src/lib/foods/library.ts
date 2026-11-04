// Counts for the Foods hub: how much the user has built up in each place.

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";

export type LibraryCounts = {
  myFoods: number;
  customFoods: number;
  meals: number;
  recipes: number;
};

export async function libraryCounts(userId: string): Promise<LibraryCounts> {
  const [row] = await getDb().execute<{
    my_foods: number;
    custom_foods: number;
    meals: number;
    recipes: number;
  }>(sql`
    select
      (select count(*)::int from (
         select id from foods where owner_id = ${userId}
         union
         select food_id from diary_entries
          where user_id = ${userId} and food_id is not null
       ) mine) as my_foods,
      (select count(*)::int from foods where owner_id = ${userId}) as custom_foods,
      (select count(*)::int from meals where owner_id = ${userId}) as meals,
      (select count(*)::int from recipes where owner_id = ${userId}) as recipes
  `);
  return {
    myFoods: row?.my_foods ?? 0,
    customFoods: row?.custom_foods ?? 0,
    meals: row?.meals ?? 0,
    recipes: row?.recipes ?? 0,
  };
}
