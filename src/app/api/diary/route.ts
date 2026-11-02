import { NextResponse } from "next/server";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
  searchParamsObject,
} from "@/lib/api/http";
import { DiaryQuery, NewDiaryEntry } from "@/lib/api/schemas";
import { resolveDate } from "@/lib/api/today";
import { addEntry, getDiaryDay, NotFoundError } from "@/lib/diary/repo";

export const GET = route(async (request: Request) => {
  const userId = await requireUserId();
  const { date } = parseWith(DiaryQuery, searchParamsObject(request));
  return NextResponse.json(
    await getDiaryDay(userId, await resolveDate(userId, date)),
  );
});

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const input = parseWith(NewDiaryEntry, await readJson(request));
  try {
    const id = await addEntry(userId, input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof NotFoundError) throw new HttpError(404, err.message);
    throw err;
  }
});
