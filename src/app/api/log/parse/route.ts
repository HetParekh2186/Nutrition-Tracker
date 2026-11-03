import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { assertLlmAvailable } from "@/lib/api/llm-guard";
import { LogParseRequest } from "@/lib/api/schemas";
import { parseLogText } from "@/lib/log/service";

export const maxDuration = 60;

/** Plain English to matched foods with grams; nothing is logged yet. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const { text } = parseWith(LogParseRequest, await readJson(request));
  await assertLlmAvailable(userId);
  const items = await parseLogText(userId, text);
  return NextResponse.json({ items });
});
