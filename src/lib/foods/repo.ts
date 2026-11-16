// Food queries. Every query is scoped to foods the user may see: USDA foods
// (owner_id is null) plus the user's own custom foods.

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { foodNutrients, foodPortions, foods } from "@/lib/db/schema";
import { N } from "@/lib/nutrition/catalog";
import { withEstimatedEnergy, type NutrientMap } from "@/lib/nutrition/math";
import { miseScore, type FoodQuality } from "@/lib/nutrition/mise-score";

import type { OffFood } from "./off";
import { planQuery, vocabulary, type Vocabulary } from "./query";
import type { FoodDetail, FoodHit, MyFoodDTO, MyFoodsSort } from "./types";

// Macros for the preview, plus what the Mise score needs.
const PREVIEW_NUTRIENTS = [
  N.energy,
  N.protein,
  N.carbs,
  N.fat,
  N.fiber,
  N.sugars,
  N.sodium,
  1258, // saturated fat
];

type QualityRow = {
  nutriscore_points: number | null;
  additives: string[] | null;
  organic: boolean | null;
};

const qualityOf = (row: QualityRow): FoodQuality => ({
  nutriscorePoints: row.nutriscore_points,
  additives: row.additives,
  organic: row.organic,
});

type HitRow = QualityRow & {
  id: string | number;
  name: string;
  full_name?: string | null;
  brand: string | null;
  source: FoodHit["source"];
  nutrients: Record<string, number> | null;
  portion_label: string | null;
  portion_grams: string | number | null;
  uses: number | null;
  last_quantity_g: string | number | null;
  last_portion_label: string | null;
  sim?: number | string | null;
  full_text?: boolean | null;
};

function toHit(row: HitRow): FoodHit {
  const raw: NutrientMap = {};
  for (const [id, amount] of Object.entries(row.nutrients ?? {})) {
    raw[Number(id)] = Number(amount);
  }
  const per100g = withEstimatedEnergy(raw).map;
  return {
    id: Number(row.id),
    name: row.name,
    ...(row.full_name && row.full_name !== row.name
      ? { fullName: row.full_name }
      : {}),
    brand: row.brand,
    source: row.source,
    per100g,
    score: miseScore(per100g, qualityOf(row)),
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
    ...(row.sim !== undefined && row.sim !== null
      ? {
          match: {
            similarity: Number(row.sim),
            fullText: Boolean(row.full_text),
          },
        }
      : {}),
  };
}

// Shared tail of the hit queries: preview macros, first portion, last use.
const hitColumns = sql`
  f.id, coalesce(f.common_name, f.name) as name, f.name as full_name,
  f.brand, f.source,
  f.nutriscore_points, f.additives, f.organic,
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

// Words in food names, for correcting typos. Food names change only on
// import, so an hour-old copy per server is fine.
const VOCAB_TTL_MS = 60 * 60_000;
let vocabCache: { at: number; vocab: Promise<Vocabulary> } | null = null;

export function foodVocabulary(): Promise<Vocabulary> {
  if (vocabCache && Date.now() - vocabCache.at < VOCAB_TTL_MS) {
    return vocabCache.vocab;
  }
  const vocab = getDb()
    .execute<{ word: string; nentry: number }>(
      sql`select word, nentry from ts_stat($$
            select to_tsvector('simple', coalesce(common_name, '') || ' ' || name)
              from foods where owner_id is null$$)
           where word ~ '^[a-z]{3,}$'`,
    )
    .then((rows) =>
      vocabulary(rows.map((r) => ({ word: r.word, count: Number(r.nentry) }))),
    );
  vocabCache = { at: Date.now(), vocab };
  // A failed load is retried on the next search rather than cached.
  vocab.catch(() => (vocabCache = null));
  return vocab;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type FoodSearch = {
  hits: FoodHit[];
  /** The query with typos fixed, when any were; else null. */
  corrected: string | null;
};

/**
 * Forgiving search: misspellings are corrected and everyday words mapped
 * to USDA's, then foods match by prefix full text or trigram similarity.
 * Whole-word matches on the everyday name rank first, then foods you log;
 * restaurant items sink unless asked for, and exact duplicates collapse.
 */
export async function searchFoodsPlanned(
  userId: string,
  text: string,
  limit: number,
): Promise<FoodSearch> {
  const plan = planQuery(text, await foodVocabulary().catch(() => undefined));
  if (!plan) return { hits: [], corrected: null };
  const q = plan.text;
  // The first word, or a synonym of it, starting the name ranks first.
  const lead = `(${plan.lead.map(escapeRegex).join("|")})(s|es)?`;
  const display = sql`coalesce(f.common_name, f.name)`;
  const sim = sql`greatest(word_similarity(${q}, ${display}), word_similarity(${q}, f.name))`;

  const rows = await getDb().execute<HitRow & { score: number }>(sql`
    with uses as (
      select food_id, count(*)::int as uses
        from diary_entries
       where user_id = ${userId} and food_id is not null
       group by food_id
    ),
    matches as (
      select f.id,
             lower(${display}) as same_food,
             f.source,
             length(f.name) as full_length,
             f.search_tsv @@ tq.q as full_text,
             ${sim} as sim,
             0.5 * ts_rank_cd(f.search_tsv, tq.q)
             + ${sim}
             + case when f.search_tsv @@ tq.q then 0.4 else 0 end
             + case when ${display} ~* ${`^${lead}\\M`} then 0.35
                    when ${display} ~* ${`\\m${lead}\\M`} then 0.15
                    else 0 end
             + case when f.owner_id is not null then 0.2 else 0 end
             -- Restaurant and brand items sink, unless the query names
             -- the brand in full ("burger king").
             - case when (f.name ~ '^[A-Z][A-Z''&.]{2,}' or f.name ~* '^fast foods?,')
                     and not (${q} like '% %' and lower(f.name) like ${`${q}%`})
                    then 0.45 else 0 end
             -- Dried and powdered forms are rarely what a short query means.
             - case when f.name ~* '\\m(dried|dehydrated|powder|powdered|mix)\\M'
                     and ${q} !~* '(dried|dehydrated|powder|mix)' then 0.25 else 0 end
             - length(${display}) * 0.006 as text_score
        from foods f, to_tsquery('english', ${plan.tsquery}) as tq(q)
       where (f.owner_id is null or f.owner_id = ${userId})
         and (f.search_tsv @@ tq.q
              or ${q} <% f.name
              or ${q} <% f.common_name)
       order by text_score desc
       limit 300
    ),
    ranked as (
      select m.*,
             u.uses,
             -- Foods you log rank first, but a near miss ("bread" for
             -- "breast") is not lifted over real matches.
             m.text_score + case when u.uses is null then 0
                                 when not m.full_text then 0.1
                                 else 1 + least(u.uses, 20) * 0.05 end as score,
             -- Variants that read the same collapse to one: the one you log,
             -- else Foundation data, else the plainest.
             row_number() over (partition by m.same_food
                                order by u.uses desc nulls last,
                                         m.text_score desc,
                                         (m.source = 'usda_foundation') desc,
                                         m.full_length) as copy
        from matches m
        left join uses u on u.food_id = m.id
    )
    select ${hitColumns},
           r.uses,
           r.sim,
           r.full_text,
           r.score
      from ranked r
      join foods f on f.id = r.id
      ${hitJoins(userId)}
     where r.copy = 1
     order by r.score desc
     limit ${limit}
  `);
  return { hits: rows.map(toHit), corrected: plan.corrected };
}

export async function searchFoods(
  userId: string,
  text: string,
  limit: number,
): Promise<FoodHit[]> {
  return (await searchFoodsPlanned(userId, text, limit)).hits;
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

/**
 * My foods: every food the user created or has logged, with how often and
 * when. Custom foods never logged still appear, so nothing added is lost.
 */
export async function myFoods(
  userId: string,
  options: {
    query?: string | undefined;
    sort: MyFoodsSort;
    customOnly?: boolean | undefined;
  },
): Promise<MyFoodDTO[]> {
  const q = options.query?.trim();
  const orderBy =
    options.sort === "name"
      ? sql`lower(coalesce(f.common_name, f.name)) asc`
      : options.sort === "frequent"
        ? sql`coalesce(u.uses, 0) desc, coalesce(u.last_used, f.created_at) desc`
        : sql`coalesce(u.last_used, f.created_at) desc`;
  const rows = await getDb().execute<
    HitRow & { owner_id: string | null; last_used: Date | string | null }
  >(sql`
    with u as (
      select food_id, count(*)::int as uses, max(created_at) as last_used
        from diary_entries
       where user_id = ${userId} and food_id is not null
       group by food_id
    ),
    mine as (
      select id from foods where owner_id = ${userId}
      union
      select food_id from u
    )
    select ${hitColumns}, u.uses, u.last_used, f.owner_id
      from mine
      join foods f on f.id = mine.id
      left join u on u.food_id = f.id
      ${hitJoins(userId)}
     where (f.owner_id is null or f.owner_id = ${userId})
       ${options.customOnly ? sql`and f.owner_id = ${userId}` : sql``}
       ${q ? sql`and (f.name ilike ${`%${q}%`} or f.common_name ilike ${`%${q}%`} or f.brand ilike ${`%${q}%`})` : sql``}
     order by ${orderBy}
     limit 500
  `);
  return rows.map((row) => ({
    ...toHit(row),
    isCustom: row.owner_id !== null,
    lastLoggedAt: row.last_used ? new Date(row.last_used).toISOString() : null,
  }));
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
    name: food.commonName ?? food.name,
    ...(food.commonName ? { fullName: food.name } : {}),
    brand: food.brand,
    source: food.source,
    // Custom barcodes are stored with the owner in front; show the code.
    sourceId:
      food.source === "custom"
        ? (food.sourceId?.split(":")[1] ?? null)
        : food.sourceId,
    isCustom: food.ownerId !== null,
    per100g: nutrients?.map ?? {},
    energyEstimated: nutrients?.energyEstimated ?? false,
    portions,
    score: miseScore(nutrients?.map ?? {}, {
      nutriscorePoints: food.nutriscorePoints,
      additives: food.additives,
      organic: food.organic,
    }),
  };
}

const qualityColumns = (product: OffFood) => ({
  nutriscorePoints: product.quality.nutriscorePoints,
  additives: product.quality.additives,
  organic: product.quality.organic,
});

/**
 * A packaged food by barcode: the user's own custom food for it, else the
 * cache of earlier lookups, else Open Food Facts, stored for next time.
 * Null when nobody knows it.
 */
export async function foodByBarcode(
  userId: string,
  code: string,
  fetchProduct: (code: string) => Promise<OffFood | null>,
): Promise<FoodDetail | null> {
  const db = getDb();
  const own = await db
    .select({ id: foods.id })
    .from(foods)
    .where(
      and(
        eq(foods.source, "custom"),
        eq(foods.sourceId, customBarcodeKey(userId, code)),
        eq(foods.ownerId, userId),
      ),
    )
    .limit(1);
  if (own[0]) return getFood(userId, own[0].id);

  const [cached] = await db
    .select({ id: foods.id, organic: foods.organic })
    .from(foods)
    .where(and(eq(foods.source, "off"), eq(foods.sourceId, code)))
    .limit(1);
  if (cached) {
    // Cached before the Mise score existed: fetch its score inputs once.
    if (cached.organic === null) {
      const fresh = await fetchProduct(code).catch(() => null);
      if (fresh) {
        await db
          .update(foods)
          .set(qualityColumns(fresh))
          .where(eq(foods.id, cached.id));
      }
    }
    return getFood(userId, cached.id);
  }

  const product = await fetchProduct(code);
  if (!product) return null;
  const id = await db.transaction(async (tx) => {
    const [food] = await tx
      .insert(foods)
      .values({
        source: "off",
        sourceId: code,
        name: product.name,
        brand: product.brand,
        ...qualityColumns(product),
      })
      .onConflictDoNothing()
      .returning({ id: foods.id });
    // Lost a race with another lookup of the same code: use theirs.
    if (!food) return null;
    const rows = Object.entries(product.per100g).map(([nid, amount]) => ({
      foodId: food.id,
      nutrientId: Number(nid),
      amountPer100g: amount,
    }));
    if (rows.length) await tx.insert(foodNutrients).values(rows);
    if (product.portion) {
      await tx
        .insert(foodPortions)
        .values({ foodId: food.id, ...product.portion });
    }
    return food.id;
  });
  if (id === null) return foodByBarcode(userId, code, async () => null);
  return getFood(userId, id);
}

/** Portions for several foods in one query, keyed by food id. */
export async function portionsFor(
  foodIds: number[],
): Promise<Map<number, { label: string; grams: number }[]>> {
  const out = new Map<number, { label: string; grams: number }[]>();
  if (foodIds.length === 0) return out;
  const rows = await getDb()
    .select({
      foodId: foodPortions.foodId,
      label: foodPortions.label,
      grams: foodPortions.grams,
    })
    .from(foodPortions)
    .where(inArray(foodPortions.foodId, foodIds))
    .orderBy(asc(foodPortions.id));
  for (const r of rows) {
    const list = out.get(r.foodId) ?? [];
    list.push({ label: r.label, grams: r.grams });
    out.set(r.foodId, list);
  }
  return out;
}

export type CustomFoodInput = {
  name: string;
  brand?: string | undefined;
  servingLabel: string;
  servingGrams: number;
  /** Amounts in one serving, by nutrient id. */
  perServing: NutrientMap;
  barcode?: string | undefined;
};

// (source, source_id) is unique across everyone, and two people can make
// their own food for the same package, so custom barcodes carry the owner.
const customBarcodeKey = (userId: string, code: string) => `${userId}:${code}`;

/** Store a custom food. Nutrients are converted to per 100 g. */
export async function createCustomFood(
  userId: string,
  input: CustomFoodInput,
): Promise<number> {
  const sourceId = input.barcode
    ? customBarcodeKey(userId, input.barcode)
    : null;
  return getDb().transaction(async (tx) => {
    // The newest food for a barcode wins the next scan.
    if (sourceId) {
      await tx
        .update(foods)
        .set({ sourceId: null })
        .where(and(eq(foods.source, "custom"), eq(foods.sourceId, sourceId)));
    }
    const [food] = await tx
      .insert(foods)
      .values({
        source: "custom",
        sourceId,
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
