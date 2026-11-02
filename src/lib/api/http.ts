// Small helpers shared by route handlers: auth, Zod parsing, JSON errors.

import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

import { getUserId } from "@/lib/auth/session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new HttpError(401, "Sign in required");
  return userId;
}

export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, "Invalid request", z.treeifyError(result.error));
  }
  return result.data;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
}

export function searchParamsObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

/** Wrap a handler so thrown HttpErrors become JSON responses. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(
          { error: err.message, details: err.details },
          { status: err.status },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}

export const IdParam = z.coerce.number().int().positive();
