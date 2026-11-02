import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { FoodSearchQuery } from "@/lib/api/schemas";
import { searchFoods, usedFoods } from "@/lib/foods/repo";
import type { FoodSearchResult } from "@/lib/foods/types";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { q, limit } = parseWith(FoodSearchQuery, searchParamsObject(request));
  const query = q.trim();

  if (query) {
    const body: FoodSearchResult = {
      query,
      results: await searchFoods(userId, query, limit),
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
