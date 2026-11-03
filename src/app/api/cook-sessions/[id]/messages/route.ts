import { z } from "zod";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { assertLlmAvailable } from "@/lib/api/llm-guard";
import { CookMessageRequest } from "@/lib/api/schemas";
import { ndjsonResponse } from "@/lib/api/stream";
import { runAssistant, type AssistantEvent } from "@/lib/cook/assistant";
import { getSession } from "@/lib/cook/repo";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ask the cooking assistant. Streams NDJSON: text deltas, tool events
 * (timer, proposal, servings, step) and a final done.
 */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const { text } = parseWith(CookMessageRequest, await readJson(request));
  await getSession(userId, id);
  await assertLlmAvailable(userId);
  return ndjsonResponse<AssistantEvent>((send) =>
    runAssistant(userId, id, text, send),
  );
});
