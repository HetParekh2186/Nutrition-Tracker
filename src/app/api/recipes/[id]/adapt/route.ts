import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { assertLlmAvailable } from "@/lib/api/llm-guard";
import { AdaptRequest } from "@/lib/api/schemas";
import { ndjsonResponse } from "@/lib/api/stream";
import { resolveDate } from "@/lib/api/today";
import { draftContext, productionDeps } from "@/lib/recipes/ai";
import { runGeneration } from "@/lib/recipes/generate";
import { getRecipe, toInput } from "@/lib/recipes/repo";

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Adapt a recipe ("make it spicier, swap rice for quinoa"). The result is
 * saved as an ai_adapted child of the original, with macros recomputed
 * from USDA data. Streams progress as NDJSON.
 */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const { instructions, servings } = parseWith(
    AdaptRequest,
    await readJson(request),
  );
  const parent = await getRecipe(userId, id);
  if (!parent) throw new HttpError(404, "Recipe not found");
  await assertLlmAvailable(userId);
  const date = await resolveDate(userId, undefined);

  return ndjsonResponse(async (send) => {
    const ctx = await draftContext(userId, {
      request: instructions,
      servings: servings ?? parent.servings,
      // No macro target: the request itself may change them ("higher
      // protein"). The adapted macros are recomputed from USDA data.
      target: undefined,
      date,
    });
    const result = await runGeneration(
      productionDeps(userId, (message) => send({ type: "status", message })),
      { ...ctx, parent: toInput(parent) },
      parent.id,
    );
    send({ type: "done", ...result });
  });
});
