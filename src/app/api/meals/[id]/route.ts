import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { MealInputSchema } from "@/lib/api/schemas";
import { NotFoundError } from "@/lib/diary/repo";
import { deleteMeal, getMeal, updateMeal } from "@/lib/meals/repo";

type Ctx = { params: Promise<{ id: string }> };
const MealId = z.uuid();

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(MealId, (await params).id);
  const meal = await getMeal(userId, id);
  if (!meal) throw new HttpError(404, "Meal not found");
  return NextResponse.json(meal);
});

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(MealId, (await params).id);
  const input = parseWith(MealInputSchema, await readJson(request));
  try {
    if (!(await updateMeal(userId, id, input))) {
      throw new HttpError(404, "Meal not found");
    }
  } catch (err) {
    if (err instanceof NotFoundError) throw new HttpError(404, err.message);
    throw err;
  }
  return NextResponse.json({ id });
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(MealId, (await params).id);
  if (!(await deleteMeal(userId, id))) {
    throw new HttpError(404, "Meal not found");
  }
  return new NextResponse(null, { status: 204 });
});
