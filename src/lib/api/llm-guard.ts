import { HttpError } from "@/lib/api/http";
import { llmConfigured } from "@/lib/llm/client";
import { assertWithinRateLimit, RateLimitedError } from "@/lib/llm/usage";

/** Fail fast, before a stream starts, when AI calls cannot run. */
export async function assertLlmAvailable(userId: string): Promise<void> {
  if (!llmConfigured()) {
    throw new HttpError(
      503,
      "AI features are not set up on this server yet. Add ANTHROPIC_API_KEY to enable them.",
    );
  }
  try {
    await assertWithinRateLimit(userId);
  } catch (err) {
    if (err instanceof RateLimitedError) throw new HttpError(429, err.message);
    throw err;
  }
}
