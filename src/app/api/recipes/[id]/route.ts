import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { RecipeInputSchema, RecipeViewQuery } from "@/lib/api/schemas";
import {
  deleteRecipe,
  getRecipe,
  RecipeNotFoundError,
  updateRecipe,
} from "@/lib/recipes/repo";

type Ctx = { params: Promise<{ id: string }> };
const RecipeId = z.uuid();

export const GET = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(RecipeId, (await params).id);
  const { servings } = parseWith(RecipeViewQuery, searchParamsObject(request));
  const recipe = await getRecipe(userId, id, servings);
  if (!recipe) throw new HttpError(404, "Recipe not found");
  return NextResponse.json(recipe);
});

export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(RecipeId, (await params).id);
  const input = parseWith(RecipeInputSchema, await readJson(request));
  try {
    await updateRecipe(userId, id, input);
  } catch (err) {
    if (err instanceof RecipeNotFoundError) {
      throw new HttpError(404, "Recipe not found or not yours to edit");
    }
    throw err;
  }
  return NextResponse.json({ id });
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(RecipeId, (await params).id);
  if (!(await deleteRecipe(userId, id))) {
    throw new HttpError(404, "Recipe not found or not yours to delete");
  }
  return new NextResponse(null, { status: 204 });
});
