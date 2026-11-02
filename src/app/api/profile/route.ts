import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { ProfileUpdateSchema } from "@/lib/api/schemas";
import { getProfile, updateProfile } from "@/lib/profile/repo";

export const GET = route(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await getProfile(userId));
});

/** Saves body stats and goal, then recomputes every non-user target. */
export const PUT = route(async (request: Request) => {
  const userId = await requireUserId();
  const patch = parseWith(ProfileUpdateSchema, await readJson(request));
  return NextResponse.json(await updateProfile(userId, patch));
});
