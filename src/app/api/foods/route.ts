import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { CustomFoodRequest } from "@/lib/api/schemas";
import { createCustomFood, getFood } from "@/lib/foods/repo";
import { N } from "@/lib/nutrition/catalog";
import type { NutrientMap } from "@/lib/nutrition/math";

/** Create a custom food from per-serving label values. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const input = parseWith(CustomFoodRequest, await readJson(request));
  const perServing: NutrientMap = {
    [N.energy]: input.kcal,
    [N.protein]: input.proteinG,
    [N.carbs]: input.carbsG,
    [N.fat]: input.fatG,
  };
  if (input.fiberG !== undefined) perServing[N.fiber] = input.fiberG;
  if (input.sugarsG !== undefined) perServing[N.sugars] = input.sugarsG;
  if (input.sodiumMg !== undefined) perServing[N.sodium] = input.sodiumMg;

  const id = await createCustomFood(userId, {
    name: input.name,
    brand: input.brand,
    servingLabel: input.servingLabel,
    servingGrams: input.servingGrams,
    perServing,
  });
  return NextResponse.json(await getFood(userId, id), { status: 201 });
});
