import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { PreferencesUpdateSchema } from "@/lib/api/schemas";
import { getPreferences, updatePreferences } from "@/lib/profile/repo";

export const GET = route(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await getPreferences(userId));
});

export const PUT = route(async (request: Request) => {
  const userId = await requireUserId();
  const patch = parseWith(PreferencesUpdateSchema, await readJson(request));
  return NextResponse.json(await updatePreferences(userId, patch));
});
