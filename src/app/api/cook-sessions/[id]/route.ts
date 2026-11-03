import { NextResponse } from "next/server";
import { z } from "zod";

import {
  HttpError,
  parseWith,
  readJson,
  requireUserId,
  route,
} from "@/lib/api/http";
import { CookPatchRequest } from "@/lib/api/schemas";
import {
  CookSessionNotFound,
  decideProposal,
  getSession,
  updateSession,
} from "@/lib/cook/repo";

type Ctx = { params: Promise<{ id: string }> };

async function withSession<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    if (err instanceof CookSessionNotFound) {
      throw new HttpError(404, "Cook session not found");
    }
    throw err;
  }
}

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  return NextResponse.json(await withSession(() => getSession(userId, id)));
});

/** Move the step, change servings, or accept or reject a proposed swap. */
export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const id = parseWith(z.uuid(), (await params).id);
  const patch = parseWith(CookPatchRequest, await readJson(request));
  const session = await withSession(async () => {
    if (patch.proposal) {
      await decideProposal(
        userId,
        id,
        patch.proposal.id,
        patch.proposal.accept,
      );
    }
    await updateSession(userId, id, {
      currentStep: patch.currentStep,
      servings: patch.servings,
    });
    return getSession(userId, id);
  });
  return NextResponse.json(session);
});
