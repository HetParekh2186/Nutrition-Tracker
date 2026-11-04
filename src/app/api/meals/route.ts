import { NextResponse } from "next/server";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { MealInputSchema } from "@/lib/api/schemas";
import { NotFoundError } from "@/lib/diary/repo";
import { createMeal, listMeals } from "@/lib/meals/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { q } = searchParamsObject(request);
  return NextResponse.json(await listMeals(userId, q));
});

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const input = parseWith(MealInputSchema, await readJson(request));
  try {
    const id = await createMeal(userId, input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof NotFoundError) throw new HttpError(404, err.message);
    throw err;
  }
});
