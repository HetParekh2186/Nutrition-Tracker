import { NextResponse } from "next/server";

import { HttpError, route } from "@/lib/api/http";
import { rebuildAllTasteProfiles } from "@/lib/recommend/taste-repo";

export const maxDuration = 300;

/**
 * Nightly taste-profile rebuild. Vercel Cron calls this with
 * "Authorization: Bearer $CRON_SECRET"; there is no user session.
 */
async function handler(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new HttpError(401, "Unauthorized");
  }
  const users = await rebuildAllTasteProfiles();
  return NextResponse.json({ rebuilt: users });
}

export const GET = route(handler);
export const POST = route(handler);
