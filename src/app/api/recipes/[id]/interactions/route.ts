import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { InteractionRequest } from "@/lib/api/schemas";
import { getRecipe } from "@/lib/recipes/repo";
import { recordInteraction } from "@/lib/recommend/interactions";
import { rebuildTasteProfile } from "@/lib/recommend/taste-repo";

type Ctx = { params: Promise<{ id: string }> };

/** Record a view, save, unsave, skip or rating. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const body = parseWith(InteractionRequest, await readJson(request));
  if (!(await getRecipe(userId, id)))
    throw new HttpError(404, "Recipe not found");
  await recordInteraction(
    userId,
    id,
    body.event,
    body.event === "rate" ? body.rating : null,
  );
  // Saves, skips and ratings change taste; refresh so suggestions move now.
  if (body.event !== "view") await rebuildTasteProfile(userId);
  return NextResponse.json({ ok: true }, { status: 201 });
});
