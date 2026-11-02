import { NextResponse } from "next/server";

import {
  parseWith,
  readJson,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { RecipeInputSchema, RecipeQuery } from "@/lib/api/schemas";
import { createRecipe, listRecipes } from "@/lib/recipes/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { query, tags, slot } = parseWith(
    RecipeQuery,
    searchParamsObject(request),
  );
  return NextResponse.json(
    await listRecipes(userId, {
      query,
      slot,
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    }),
  );
});

/** Create a recipe; the nutrition cache is computed on save. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const input = parseWith(RecipeInputSchema, await readJson(request));
  const id = await createRecipe(userId, input, { source: "user" });
  return NextResponse.json({ id }, { status: 201 });
});
