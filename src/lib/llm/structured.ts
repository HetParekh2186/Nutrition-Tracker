// One structured Claude call with the shared rules from SPEC.md:
// - model from ANTHROPIC_MODEL
// - output parsed with a Zod schema; on failure retry once with the error,
//   then give up with a friendly message
// - per-user rate limit and token logging per feature
// - server-side refusal fallback, opted in by default

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { getAnthropic, llmModel } from "./client";
import { assertWithinRateLimit, recordUsage } from "./usage";

export class LlmOutputError extends Error {}

export type Effort = "low" | "medium" | "high";

export async function structuredCall<T extends z.ZodType>(options: {
  userId: string;
  feature: string;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const client = getAnthropic();
  await assertWithinRateLimit(options.userId);
  const model = llmModel();
  const messages = [...options.messages];

  for (let attempt = 0; attempt < 2; attempt++) {
    let usage = { input_tokens: 0, output_tokens: 0 };
    let ok = false;
    try {
      const response = await client.beta.messages.parse({
        model,
        max_tokens: options.maxTokens ?? 16000,
        system: options.system,
        messages,
        output_config: {
          format: betaZodOutputFormat(options.schema),
          effort: options.effort ?? "medium",
        },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      usage = response.usage;

      if (response.stop_reason === "refusal") {
        throw new LlmOutputError(
          "The assistant declined this request. Try rephrasing it.",
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new LlmOutputError(
          "The response was too long. Try a simpler request.",
        );
      }
      const parsed = options.schema.safeParse(response.parsed_output);
      if (parsed.success) {
        ok = true;
        return parsed.data;
      }
      // Retry once, telling the model exactly what failed validation.
      messages.push(
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: `That output did not validate: ${parsed.error.message}. Return corrected JSON only.`,
        },
      );
    } finally {
      await recordUsage({
        userId: options.userId,
        feature: options.feature,
        model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        ok,
      }).catch(() => {});
    }
  }
  throw new LlmOutputError(
    "The assistant's answer could not be understood. Please try again.",
  );
}
