import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { CompleteCookRequest } from "@/lib/api/schemas";
import { resolveDate } from "@/lib/api/today";
import { completeSession, CookSessionNotFound } from "@/lib/cook/repo";

type Ctx = { params: Promise<{ id: string }> };

/** "Done, log it": finish cooking and log what was eaten. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const { servings, mealSlot } = parseWith(
    CompleteCookRequest,
    await readJson(request),
  );
  try {
    const result = await completeSession(userId, id, {
      servings,
      mealSlot,
      date: await resolveDate(userId, undefined),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof CookSessionNotFound) {
      throw new HttpError(404, "Cook session not found");
    }
    throw err;
  }
});
