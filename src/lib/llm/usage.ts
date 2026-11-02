// Per-user rate limit and token logging for LLM calls (SPEC.md "LLM
// features": for example 30 calls per hour, usage logged per feature).

import { and, count, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { llmUsage } from "@/lib/db/schema";

export const LLM_CALLS_PER_HOUR = 30;

export class RateLimitedError extends Error {
  constructor() {
    super(
      `You have used ${LLM_CALLS_PER_HOUR} AI requests in the last hour. Try again a little later.`,
    );
  }
}

export async function assertWithinRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await getDb()
    .select({ n: count() })
    .from(llmUsage)
    .where(and(eq(llmUsage.userId, userId), gte(llmUsage.createdAt, since)));
  if ((row?.n ?? 0) >= LLM_CALLS_PER_HOUR) throw new RateLimitedError();
}

export async function recordUsage(entry: {
  userId: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ok: boolean;
}): Promise<void> {
  await getDb().insert(llmUsage).values(entry);
}
