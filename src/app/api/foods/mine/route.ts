import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { MyFoodsQuery } from "@/lib/api/schemas";
import { myFoods } from "@/lib/foods/repo";

/** Every food the user created or has logged. */
export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { q, sort, filter } = parseWith(
    MyFoodsQuery,
    searchParamsObject(request),
  );
  return NextResponse.json(
    await myFoods(userId, { query: q, sort, customOnly: filter === "custom" }),
  );
});
