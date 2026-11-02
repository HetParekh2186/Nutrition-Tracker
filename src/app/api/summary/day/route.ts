import { NextResponse } from "next/server";

import {
  parseWith,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { DiaryQuery } from "@/lib/api/schemas";
import { resolveDate } from "@/lib/api/today";
import { getDaySummary } from "@/lib/diary/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { date } = parseWith(DiaryQuery, searchParamsObject(request));
  return NextResponse.json(
    await getDaySummary(userId, await resolveDate(userId, date)),
  );
});
