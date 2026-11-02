import { NextResponse } from "next/server";

import {
  HttpError,
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { SourcesQuery } from "@/lib/api/schemas";
import { getSources } from "@/lib/insights/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { nutrient, from, to } = parseWith(
    SourcesQuery,
    searchParamsObject(request),
  );
  const body = await getSources(userId, nutrient, from, to);
  if (!body) throw new HttpError(404, "Unknown nutrient");
  return NextResponse.json(body);
});
