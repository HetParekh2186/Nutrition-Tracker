import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { TargetsUpdateSchema } from "@/lib/api/schemas";
import { getTargets, updateTargets } from "@/lib/profile/repo";

export const GET = route(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await getTargets(userId));
});

/** Edits become source "user"; { reset: true } restores the computed value. */
export const PUT = route(async (request: Request) => {
  const userId = await requireUserId();
  const { targets } = parseWith(TargetsUpdateSchema, await readJson(request));
  return NextResponse.json(await updateTargets(userId, targets));
});
