import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { RecommendationQuery } from "@/lib/api/schemas";
import { getRecommendations } from "@/lib/recommend/service";

/** Ranked suggestions with reasons; each one is logged as an impression. */
export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { slot, limit } = parseWith(
    RecommendationQuery,
    searchParamsObject(request),
  );
  return NextResponse.json(await getRecommendations(userId, slot, limit));
});
