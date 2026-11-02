// Food queries. Every query is scoped to foods the user may see: USDA foods
// (owner_id is null) plus the user's own custom foods.

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { foodNutrients, foodPortions, foods } from "@/lib/db/schema";
import { N } from "@/lib/nutrition/catalog";
import { withEstimatedEnergy, type NutrientMap } from "@/lib/nutrition/math";

import { prefixTsQuery } from "./query";
import type { FoodDetail, FoodHit } from "./types";

const PREVIEW_NUTRIENTS = [N.energy, N.protein, N.carbs, N.fat, N.fiber];

type HitRow = {
  id: string | number;
  name: string;
  brand: string | null;
  source: FoodHit["source"];
  nutrients: Record<string, number> | null;
  portion_label: string | null;
  portion_grams: string | number | null;
  uses: number | null;
  last_quantity_g: string | number | null;
  last_portion_label: string | null;
};

function toHit(row: HitRow): FoodHit {
  const raw: NutrientMap = {};
  for (const [id, amount] of Object.entries(row.nutrients ?? {})) {
    raw[Number(id)] = Number(amount);
  }
  return {
    id: Number(row.id),
    name: row.name,
    brand: row.brand,
    source: row.source,
    per100g: withEstimatedEnergy(raw).map,
    defaultPortion:
      row.portion_label && row.portion_grams
        ? { label: row.portion_label, grams: Number(row.portion_grams) }
        : null,
    lastUsed:
      row.last_quantity_g !== null
        ? {
            quantityG: Number(row.last_quantity_g),
            portionLabel: row.last_portion_label,
          }
        : null,
    uses: row.uses ?? 0,
  };
}

// Shared tail of the hit queries: preview macros, first portion, last use.
const hitColumns = sql`
  f.id, f.name, f.brand, f.source,
  (select jsonb_object_agg(fn.nutrient_id, fn.amount_per_100g)
     from food_nutrients fn
    where fn.food_id = f.id
      and fn.nutrient_id in (${sql.join(PREVIEW_NUTRIENTS, sql`, `)})) as nutrients,
  p.label as portion_label, p.grams as portion_grams,
  last.quantity_g as last_quantity_g, last.portion_label as last_portion_label
`;

const hitJoins = (userId: string) => sql`
  left join lateral (
    select label, grams from food_portions fp
     where fp.food_id = f.id order by fp.id limit 1
  ) p on true
  left join lateral (
    select quantity_g, portion_label from diary_entries d
     where d.user_id = ${userId} and d.food_id = f.id
     order by d.created_at desc limit 1
  ) last on true
`;

/**
 * Fuzzy search: prefix full-text match or trigram word similarity, ranked
 * by text relevance, with foods you have logged before ranked first.
 */
export async function searchFoods(
  userId: string,
  text: string,
  limit: number,
): Promise<FoodHit[]> {
  const tsq = prefixTsQuery(text);
  if (!tsq) return [];
  const q = text.trim().toLowerCase();
  const first = q.split(/\s+/)[0] ?? q;

  const rows = await getDb().execute<HitRow & { score: number }>(sql`
    with uses as (
      select food_id, count(*)::int as uses
        from diary_entries
       where user_id = ${userId} and food_id is not null
       group by food_id
    ),
    matches as (
      select f.id,
             ts_rank_cd(f.search_tsv, to_tsquery('english', ${tsq}))
             + word_similarity(${q}, f.name)
             + case when lower(f.name) like ${`${first}%`} then 0.3 else 0 end
             + case when f.owner_id is not null then 0.2 else 0 end
             - length(f.name) * 0.002 as text_score
        from foods f
       where (f.owner_id is null or f.owner_id = ${userId})
         and (f.search_tsv @@ to_tsquery('english', ${tsq})
              or ${q} <% f.name)
       order by text_score desc
       limit 200
    )
    select ${hitColumns},
           u.uses,
           m.text_score + case when u.uses is null then 0
                               else 1 + least(u.uses, 20) * 0.05 end as score
      from matches m
      join foods f on f.id = m.id
      left join uses u on u.food_id = f.id
      ${hitJoins(userId)}
     order by score desc
     limit ${limit}
  `);
  return rows.map(toHit);
}

/** Foods the user logged most recently, or most often. */
export async function usedFoods(
  userId: string,
  order: "recent" | "frequent",
  limit: number,
): Promise<FoodHit[]> {
  const orderBy =
    order === "recent"
      ? sql`u.last_used desc`
      : sql`u.uses desc, u.last_used desc`;
  const rows = await getDb().execute<HitRow>(sql`
    with u as (
      select food_id, count(*)::int as uses, max(created_at) as last_used
        from diary_entries
       where user_id = ${userId} and food_id is not null
       group by food_id
    )
    select ${hitColumns}, u.uses
      from u
      join foods f on f.id = u.food_id
      ${hitJoins(userId)}
     order by ${orderBy}
     limit ${limit}
  `);
  return rows.map(toHit);
}

const visibleTo = (userId: string) =>
  or(isNull(foods.ownerId), eq(foods.ownerId, userId));

/** Per-100 g nutrients for several foods, with Atwater energy filled in. */
export async function nutrientMapsFor(
  foodIds: number[],
): Promise<Map<number, { map: NutrientMap; energyEstimated: boolean }>> {
  const out = new Map<number, { map: NutrientMap; energyEstimated: boolean }>();
  if (foodIds.length === 0) return out;
  const rows = await getDb()
    .select()
    .from(foodNutrients)
    .where(inArray(foodNutrients.foodId, foodIds));
  const raw = new Map<number, NutrientMap>();
  for (const r of rows) {
    const map = raw.get(r.foodId) ?? {};
    map[r.nutrientId] = r.amountPer100g;
    raw.set(r.foodId, map);
  }
  for (const id of foodIds) out.set(id, withEstimatedEnergy(raw.get(id) ?? {}));
  return out;
}

export async function getFood(
  userId: string,
  foodId: number,
): Promise<FoodDetail | null> {
  const db = getDb();
  const [food] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), visibleTo(userId)))
    .limit(1);
  if (!food) return null;
  const [nutrientMaps, portions] = await Promise.all([
    nutrientMapsFor([food.id]),
    db
      .select({
        id: foodPortions.id,
        label: foodPortions.label,
        grams: foodPortions.grams,
      })
      .from(foodPortions)
      .where(eq(foodPortions.foodId, food.id))
      .orderBy(asc(foodPortions.id)),
  ]);
  const nutrients = nutrientMaps.get(food.id);
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    source: food.source,
    sourceId: food.sourceId,
    isCustom: food.ownerId !== null,
    per100g: nutrients?.map ?? {},
    energyEstimated: nutrients?.energyEstimated ?? false,
    portions,
  };
}

export type CustomFoodInput = {
  name: string;
  brand?: string | undefined;
  servingLabel: string;
  servingGrams: number;
  /** Amounts in one serving, by nutrient id. */
  perServing: NutrientMap;
};

/** Store a custom food. Nutrients are converted to per 100 g. */
export async function createCustomFood(
  userId: string,
  input: CustomFoodInput,
): Promise<number> {
  return getDb().transaction(async (tx) => {
    const [food] = await tx
      .insert(foods)
      .values({
        source: "custom",
        name: input.name,
        brand: input.brand ?? null,
        ownerId: userId,
      })
      .returning({ id: foods.id });
    if (!food) throw new Error("Insert failed");
    const rows = Object.entries(input.perServing).map(([id, amount]) => ({
      foodId: food.id,
      nutrientId: Number(id),
      amountPer100g: (amount * 100) / input.servingGrams,
    }));
    if (rows.length) await tx.insert(foodNutrients).values(rows);
    await tx.insert(foodPortions).values({
      foodId: food.id,
      label: input.servingLabel,
      grams: input.servingGrams,
    });
    return food.id;
  });
}
