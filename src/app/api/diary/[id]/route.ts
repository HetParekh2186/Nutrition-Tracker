import { NextResponse } from "next/server";

import {
  HttpError,
  IdParam,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { DiaryPatch } from "@/lib/api/schemas";
import { deleteEntry, updateEntry } from "@/lib/diary/repo";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(IdParam, (await params).id);
  const patch = parseWith(DiaryPatch, await readJson(request));
  if (!(await updateEntry(userId, id, patch))) {
    throw new HttpError(404, "Entry not found");
  }
  return NextResponse.json({ id });
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(IdParam, (await params).id);
  if (!(await deleteEntry(userId, id))) {
    throw new HttpError(404, "Entry not found");
  }
  return new NextResponse(null, { status: 204 });
});
