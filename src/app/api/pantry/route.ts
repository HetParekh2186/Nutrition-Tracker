import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { PantryAddRequest } from "@/lib/api/schemas";
import { addToPantry } from "@/lib/recipes/familiar-repo";

/** "I have it": add ingredients to the kitchen list. */
export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const { items } = parseWith(PantryAddRequest, await readJson(request));
  return NextResponse.json({ pantry: await addToPantry(userId, items) });
});
