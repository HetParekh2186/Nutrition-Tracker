// Open Food Facts barcode lookups for packaged foods (SPEC.md "Data
// sources"). Products are stored as source = 'off' and cached by barcode,
// so each one is fetched once. OFF reports every *_100g value in grams
// (energy in kcal or kJ), so minerals and vitamins are scaled to the
// catalog's units here. Pure parts are tested.

import { z } from "zod";

import { N } from "@/lib/nutrition/catalog";
import type { NutrientMap } from "@/lib/nutrition/math";
import type { FoodQuality } from "@/lib/nutrition/mise-score";

/** Digits only, 8 to 14 long (EAN-8, UPC-A, EAN-13, GTIN-14). */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

/** GS1 check digit, which every real barcode satisfies. */
export function validCheckDigit(code: string): boolean {
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

const Num = z.coerce.number().finite().nonnegative();

export const OffResponse = z.object({
  status: z.union([z.literal(0), z.literal(1)]),
  product: z
    .object({
      product_name: z.string().optional(),
      product_name_en: z.string().optional(),
      generic_name: z.string().optional(),
      brands: z.string().optional(),
      serving_size: z.string().optional(),
      serving_quantity: Num.optional(),
      nutriments: z.record(z.string(), z.unknown()).default({}),
      nutriscore_score: z.unknown().optional(),
      additives_n: z.unknown().optional(),
      additives_tags: z.array(z.string()).optional(),
      labels_tags: z.array(z.string()).optional(),
    })
    .optional(),
});
export type OffResponse = z.infer<typeof OffResponse>;

/** OFF field, catalog nutrient id, factor from grams to the catalog unit. */
const FIELDS: [string, number, number][] = [
  ["proteins", N.protein, 1],
  ["carbohydrates", N.carbs, 1],
  ["fat", N.fat, 1],
  ["fiber", N.fiber, 1],
  ["sugars", N.sugars, 1],
  ["added-sugars", N.addedSugars, 1],
  ["saturated-fat", 1258, 1],
  ["monounsaturated-fat", 1292, 1],
  ["polyunsaturated-fat", 1293, 1],
  ["trans-fat", 1257, 1],
  ["cholesterol", 1253, 1000],
  ["sodium", N.sodium, 1000],
  ["potassium", 1092, 1000],
  ["calcium", 1087, 1000],
  ["iron", 1089, 1000],
  ["magnesium", 1090, 1000],
  ["zinc", 1095, 1000],
  ["vitamin-c", 1162, 1000],
  ["vitamin-d", 1114, 1_000_000],
  ["vitamin-a", 1106, 1_000_000],
];

export type OffFood = {
  name: string;
  brand: string | null;
  per100g: NutrientMap;
  portion: { label: string; grams: number } | null;
  /** Inputs to the Mise score beyond nutrients. */
  quality: FoodQuality;
};

function num(v: unknown): number | null {
  // Blank means unknown, not zero.
  if (v === "" || v === null || v === undefined) return null;
  const parsed = Num.safeParse(v);
  return parsed.success ? parsed.data : null;
}

/** Map an OFF product to a food, or null when it has no usable data. */
export function offToFood(res: OffResponse): OffFood | null {
  const p = res.product;
  if (res.status !== 1 || !p) return null;
  const name = (p.product_name_en || p.product_name || p.generic_name || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return null;
  const n = p.nutriments;

  const per100g: NutrientMap = {};
  const kcal = num(n["energy-kcal_100g"]);
  const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]);
  if (kcal !== null) per100g[N.energy] = kcal;
  else if (kj !== null) per100g[N.energy] = kj / 4.184;
  for (const [field, id, factor] of FIELDS) {
    const v = num(n[`${field}_100g`]);
    if (v !== null) per100g[id] = v * factor;
  }
  // Without energy or any macro there is nothing worth logging.
  if (
    per100g[N.energy] === undefined &&
    per100g[N.protein] === undefined &&
    per100g[N.carbs] === undefined &&
    per100g[N.fat] === undefined
  ) {
    return null;
  }

  const servingG = p.serving_quantity;
  const portion =
    servingG && servingG > 0 && servingG < 5000
      ? {
          label: p.serving_size?.trim()
            ? `1 serving (${p.serving_size.trim()})`
            : "1 serving",
          grams: servingG,
        }
      : null;
  const brand = p.brands?.split(",")[0]?.trim() || null;
  return { name, brand, per100g, portion, quality: offQuality(p) };
}

/**
 * Nutri-Score points, additives and organic label. OFF only counts
 * additives once it has read the ingredients (additives_n is then set), so
 * an empty list before that means unknown, not none.
 */
export function offQuality(
  p: NonNullable<OffResponse["product"]>,
): FoodQuality {
  const score = z.coerce.number().int().safeParse(p.nutriscore_score);
  const analysed = p.additives_n !== undefined && p.additives_n !== null;
  return {
    nutriscorePoints:
      p.nutriscore_score !== undefined &&
      p.nutriscore_score !== null &&
      score.success
        ? score.data
        : null,
    additives: analysed ? (p.additives_tags ?? []) : null,
    // en:organic, en:eu-organic, en:usda-organic, fr:ab-agriculture-biologique
    organic: (p.labels_tags ?? []).some(
      (t) => /organic|biologique/.test(t) && !/:(no|non)-/.test(t),
    ),
  };
}

const FIELDS_PARAM = [
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "serving_size",
  "serving_quantity",
  "nutriments",
  "nutriscore_score",
  "additives_n",
  "additives_tags",
  "labels_tags",
].join(",");

/** Fetch a product from the OFF API; null when OFF does not know it. */
export async function fetchOffProduct(code: string): Promise<OffFood | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS_PARAM}`,
    {
      headers: { "User-Agent": "Mise nutrition tracker (portfolio project)" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`);
  const parsed = OffResponse.safeParse(await res.json());
  return parsed.success ? offToFood(parsed.data) : null;
}
