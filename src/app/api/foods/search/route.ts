import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { FoodSearchQuery } from "@/lib/api/schemas";
import { searchFoodsPlanned, usedFoods } from "@/lib/foods/repo";
import type { FoodSearchResult } from "@/lib/foods/types";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { q, limit } = parseWith(FoodSearchQuery, searchParamsObject(request));
  const query = q.trim();

  if (query) {
    const { hits, corrected } = await searchFoodsPlanned(userId, query, limit);
    const body: FoodSearchResult = {
      query,
      corrected,
      results: hits,
      recent: [],
      frequent: [],
    };
    return NextResponse.json(body);
  }

  const [recent, frequent] = await Promise.all([
    usedFoods(userId, "recent", 6),
    usedFoods(userId, "frequent", 6),
  ]);
  const body: FoodSearchResult = { query, results: [], recent, frequent };
  return NextResponse.json(body);
});
