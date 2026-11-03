import { NextResponse } from "next/server";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { StartCookRequest } from "@/lib/api/schemas";
import { CookSessionNotFound, startSession } from "@/lib/cook/repo";

/** Start cooking a recipe: { recipe_id, servings }. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const { recipe_id, servings } = parseWith(
    StartCookRequest,
    await readJson(request),
  );
  try {
    const id = await startSession(userId, recipe_id, servings);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof CookSessionNotFound) {
      throw new HttpError(404, "Recipe not found");
    }
    throw err;
  }
});
