import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { RangeQuery } from "@/lib/api/schemas";
import { getRangeSummary } from "@/lib/insights/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { from, to } = parseWith(RangeQuery, searchParamsObject(request));
  return NextResponse.json(await getRangeSummary(userId, from, to));
});
