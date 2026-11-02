import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { assertLlmAvailable } from "@/lib/api/llm-guard";
import { GenerateRequest } from "@/lib/api/schemas";
import { ndjsonResponse } from "@/lib/api/stream";
import { resolveDate } from "@/lib/api/today";
import { draftContext, productionDeps } from "@/lib/recipes/ai";
import { runGeneration } from "@/lib/recipes/generate";

// Generation can take a while: draft, match, maybe one revision.
export const maxDuration = 120;

/** Streams progress as NDJSON, ending with { type: "done", recipeId }. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const input = parseWith(GenerateRequest, await readJson(request));
  await assertLlmAvailable(userId);
  const date = await resolveDate(userId, undefined);

  return ndjsonResponse(async (send) => {
    const ctx = await draftContext(userId, {
      request: input.request,
      slot: input.slot,
      servings: input.servings,
      target: input.target,
      date,
    });
    const result = await runGeneration(
      productionDeps(userId, (message) => send({ type: "status", message })),
      ctx,
    );
    send({ type: "done", ...result });
  });
});
