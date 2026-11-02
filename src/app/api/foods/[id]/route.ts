import { NextResponse } from "next/server";

import {
  HttpError,
  IdParam,
  parseWith,
  requireUserId,
  route,
} from "@/lib/api/http";
import { getFood } from "@/lib/foods/repo";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(IdParam, (await params).id);
  const food = await getFood(userId, id);
  if (!food) throw new HttpError(404, "Food not found");
  return NextResponse.json(food);
});
