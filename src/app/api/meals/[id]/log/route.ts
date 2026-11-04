import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { LogMealRequest } from "@/lib/api/schemas";
import { logMeal } from "@/lib/meals/repo";

type Ctx = { params: Promise<{ id: string }> };

/** Log every item of a saved meal into one slot of a day. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const input = parseWith(LogMealRequest, await readJson(request));
  const ids = await logMeal(userId, id, input);
  if (!ids) throw new HttpError(404, "Meal not found");
  return NextResponse.json({ ids }, { status: 201 });
});
