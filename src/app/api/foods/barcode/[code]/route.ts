import { NextResponse } from "next/server";

import { HttpError, requireUserId, route } from "@/lib/api/http";
import {
  fetchOffProduct,
  normalizeBarcode,
  validCheckDigit,
} from "@/lib/foods/off";
import { foodByBarcode } from "@/lib/foods/repo";
import type { FoodHit } from "@/lib/foods/types";

type Ctx = { params: Promise<{ code: string }> };

/** Open Food Facts lookup, cached in foods as source 'off'. */
export const GET = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const code = normalizeBarcode((await params).code);
  if (!code || !validCheckDigit(code)) {
    throw new HttpError(
      400,
      "That does not look like a barcode. Check the digits.",
    );
  }
  let food;
  try {
    food = await foodByBarcode(userId, code, fetchOffProduct);
  } catch {
    throw new HttpError(
      502,
      "Open Food Facts is not responding. Try again soon.",
    );
  }
  if (!food) {
    throw new HttpError(
      404,
      "No product with that barcode in Open Food Facts. Create a custom food instead.",
    );
  }
  const hit: FoodHit = {
    id: food.id,
    name: food.name,
    brand: food.brand,
    source: food.source,
    per100g: food.per100g,
    defaultPortion: food.portions[0]
      ? { label: food.portions[0].label, grams: food.portions[0].grams }
      : null,
    lastUsed: null,
    uses: 0,
    score: food.score,
  };
  return NextResponse.json(hit);
});
