// The Cook Mode assistant (SPEC.md "Cook Mode assistant"): a streaming
// manual tool loop. Each message carries the recipe scaled to the
// session, the current step, swaps so far and dietary rules, plus the last
// 12 chat messages. Claude writes words; every number comes from the
// server through the tools.

import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { cookMessages, foodPortions } from "@/lib/db/schema";
import { resolveFoodQuery } from "@/lib/foods/resolve";
import { getAnthropic, llmModel } from "@/lib/llm/client";
import { assertWithinRateLimit, recordUsage } from "@/lib/llm/usage";
import { getPreferences } from "@/lib/profile/repo";

import {
  addMessage,
  foodMapsFor,
  getSession,
  updateSession,
  type StoredContent,
} from "./repo";
import { TOOLS, executeTool, type ToolDeps, type ToolEvent } from "./tools";
import { densityFromPortion } from "./units";

export type AssistantEvent =
  | { type: "text"; delta: string }
  | ToolEvent
  | { type: "done"; messageId: number | null }
  | { type: "error"; message: string };

const HISTORY = 12;
const MAX_TURNS = 5;

const SYSTEM_RULES = `You are a calm, practical cooking coach inside the Mise app.
Keep answers short: 1 to 3 sentences unless asked for more.
For ingredient swaps, always call propose_substitution; never state macro numbers yourself.
For doneness of meat, fish or eggs, give the safe internal temperature and suggest a thermometer.
If asked something unrelated to cooking or nutrition, answer briefly and steer back to the recipe.
Use start_timer when the cook asks for a timer or a step needs waiting, go_to_step to move them, scale_recipe to change servings, and convert_units for unit questions.`;

function contextBlock(
  s: Awaited<ReturnType<typeof getSession>>,
  prefs: Awaited<ReturnType<typeof getPreferences>>,
): string {
  const step = s.recipe.steps.find((x) => x.position === s.currentStep);
  const ingredients = s.recipe.ingredients
    .map(
      (i) =>
        `- id ${i.id}: ${i.displayText} (${Math.round(i.scaledG)} g${i.foodId ? `, food_id ${i.foodId}` : ""})`,
    )
    .join("\n");
  return [
    `The user is cooking: ${s.recipe.title}, ${s.servings} servings, on step ${s.currentStep} of ${s.recipe.steps.length}.`,
    `Current step: ${step?.instruction ?? "not started"}`,
    `Dietary rules (never violate): ${prefs.dietType ?? "omnivore"}, excluded: ${prefs.excludedIngredients.join(", ") || "none"}.`,
    `Ingredients as cooked now (amounts for ${s.servings} servings; quantity_g in proposals is for the recipe's original ${s.recipe.servings} servings):\n${ingredients}`,
    s.substitutions.length
      ? `Swaps accepted so far: ${s.substitutions.map((x) => `${x.newFoodName ?? x.newFoodId} for ingredient ${x.ingredientId}`).join("; ")}.`
      : "No swaps yet.",
    `Steps:\n${s.recipe.steps.map((x) => `${x.position}. ${x.instruction}`).join("\n")}`,
  ].join("\n\n");
}

async function history(
  sessionId: string,
): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = await getDb()
    .select()
    .from(cookMessages)
    .where(eq(cookMessages.sessionId, sessionId))
    .orderBy(desc(cookMessages.createdAt), desc(cookMessages.id))
    .limit(HISTORY * 2);
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of rows.reverse()) {
    const c = m.content as StoredContent;
    if (c.kind === "proposal") {
      out.push({
        role: "user",
        content: `[The swap ${c.originalText} -> ${c.newFoodName} is ${c.status}.]`,
      });
    } else if (m.role === "user" || m.role === "assistant") {
      out.push({ role: m.role, content: c.text });
    }
  }
  // The API needs a user turn first and no empty turns.
  while (out[0]?.role === "assistant") out.shift();
  return out.slice(-HISTORY);
}

export async function runAssistant(
  userId: string,
  sessionId: string,
  text: string,
  send: (event: AssistantEvent) => void,
): Promise<void> {
  await assertWithinRateLimit(userId);
  const client = getAnthropic();
  const model = llmModel();
  const [session, prefs, past] = await Promise.all([
    getSession(userId, sessionId),
    getPreferences(userId),
    history(sessionId),
  ]);
  await addMessage(
    sessionId,
    "user",
    { kind: "text", text },
    session.currentStep,
  );

  let current = session;
  const deps: ToolDeps = {
    resolve: async (q) => {
      const r = await resolveFoodQuery(userId, q);
      return r.best
        ? { foodId: r.best.id, name: r.best.name, confidence: r.confidence }
        : null;
    },
    foodMaps: foodMapsFor,
    density: async (foodId) => {
      const portions = await getDb()
        .select()
        .from(foodPortions)
        .where(eq(foodPortions.foodId, foodId));
      for (const p of portions) {
        const d = densityFromPortion(p.label, p.grams);
        if (d) return d;
      }
      return null;
    },
    saveProposal: (p) =>
      addMessage(
        sessionId,
        "tool",
        { kind: "proposal", ...p },
        current.currentStep,
      ),
    setServings: (servings) => updateSession(userId, sessionId, { servings }),
    setStep: (step) => updateSession(userId, sessionId, { currentStep: step }),
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...past,
    { role: "user", content: text },
  ];
  let reply = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_RULES,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: contextBlock(current, prefs) },
      ],
      tools: TOOLS.map((t) => ({ ...t, eager_input_streaming: true })),
      messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    stream.on("text", (delta) => {
      reply += delta;
      send({ type: "text", delta });
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
    } finally {
      const usage = stream.currentMessage?.usage;
      await recordUsage({
        userId,
        feature: "cook_assistant",
        model,
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        ok: true,
      }).catch(() => {});
    }

    if (message.stop_reason === "refusal") {
      send({
        type: "error",
        message: "The assistant cannot help with that one.",
      });
      break;
    }
    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const outcome = await executeTool(
        use.name,
        use.input,
        {
          ingredients: current.recipe.ingredients.map((i) => ({
            id: i.id,
            foodId: i.foodId,
            quantityG: i.quantityG,
            displayText: i.displayText,
            foodName: i.foodName,
          })),
          recipeServings: current.recipe.servings,
          stepCount: current.recipe.steps.length,
          substitutions: current.substitutions,
          excluded: prefs.excludedIngredients,
        },
        deps,
      );
      if (outcome.event) send(outcome.event);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: outcome.result,
        ...(outcome.isError ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
    // Tools may have changed servings or the step; refresh the context.
    current = await getSession(userId, sessionId);
    if (reply) reply += "\n";
  }

  const messageId = reply.trim()
    ? await addMessage(
        sessionId,
        "assistant",
        { kind: "text", text: reply.trim() },
        current.currentStep,
      )
    : null;
  send({ type: "done", messageId });
}
