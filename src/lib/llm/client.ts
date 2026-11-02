import Anthropic from "@anthropic-ai/sdk";

/** Thrown when no Anthropic credentials are configured. */
export class LlmUnavailableError extends Error {
  constructor() {
    super("AI features are not configured on this server.");
  }
}

let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new LlmUnavailableError();
  }
  client ??= new Anthropic();
  return client;
}

/** SPEC.md: the model id comes from ANTHROPIC_MODEL. */
export function llmModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
}

export function llmConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  );
}
