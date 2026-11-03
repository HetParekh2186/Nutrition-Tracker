// Production dependencies for plain-English logging.

import { portionsFor } from "@/lib/foods/repo";
import { resolveFoodQuery } from "@/lib/foods/resolve";
import { FOOD_PARSER_SYSTEM } from "@/lib/llm/prompts";
import { ParseResult } from "@/lib/llm/schemas";
import { structuredCall } from "@/lib/llm/structured";

import { parseLog } from "./parse";
import type { ParsedLogItem } from "./types";

export function parseLogText(
  userId: string,
  text: string,
): Promise<ParsedLogItem[]> {
  return parseLog(
    {
      parse: (t) =>
        structuredCall({
          userId,
          feature: "log_parse",
          system: FOOD_PARSER_SYSTEM,
          schema: ParseResult,
          effort: "low",
          maxTokens: 4000,
          messages: [{ role: "user", content: t }],
        }),
      resolve: (query) => resolveFoodQuery(userId, query),
      portions: portionsFor,
    },
    text,
  );
}
