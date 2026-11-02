import { NextResponse } from "next/server";

import { parseWith, readJson, requireUserId, route } from "@/lib/api/http";
import { CopyRequest } from "@/lib/api/schemas";
import { copyEntries } from "@/lib/diary/repo";

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const { from, to, slot, toSlot } = parseWith(
    CopyRequest,
    await readJson(request),
  );
  const copied = await copyEntries(userId, from, to, slot, toSlot);
  return NextResponse.json({ copied }, { status: 201 });
});
