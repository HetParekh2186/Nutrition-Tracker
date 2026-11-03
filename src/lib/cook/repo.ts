// Cook sessions: start, read with swaps applied, step, decide on proposed
// swaps, and complete (log the meal, saving an adapted child recipe first
// when swaps were accepted, so logged macros match what was eaten).

import { and, asc, eq } from "drizzle-orm";

import type { RecipeInput } from "@/lib/api/schemas";
import { getDb } from "@/lib/db";
import type { MealSlot } from "@/lib/db/enums";
import { cookMessages, cookSessions } from "@/lib/db/schema";
import { addEntry } from "@/lib/diary/repo";
import { nutrientMapsFor } from "@/lib/foods/repo";
import type { NutrientMap } from "@/lib/nutrition/math";
import { recipeNutrition, scaleQuantity } from "@/lib/recipes/compute";
import { createRecipe, getRecipe, toInput } from "@/lib/recipes/repo";
import type { RecipeDetailDTO } from "@/lib/recipes/types";
import { recordInteraction } from "@/lib/recommend/interactions";
import { rebuildTasteProfile } from "@/lib/recommend/taste-repo";

import { applySubstitutions, type Substitution } from "./substitute";
import type { ChatMessageDTO, CookSessionDTO, ProposalDTO } from "./types";

export class CookSessionNotFound extends Error {}

/** What cook_messages.content holds, by kind. */
export type StoredContent =
  | { kind: "text"; text: string }
  | ({ kind: "proposal" } & Omit<ProposalDTO, "id">);

export async function startSession(
  userId: string,
  recipeId: string,
  servings: number,
): Promise<string> {
  if (!(await getRecipe(userId, recipeId))) throw new CookSessionNotFound();
  const [row] = await getDb()
    .insert(cookSessions)
    .values({ userId, recipeId, servings })
    .returning({ id: cookSessions.id });
  await recordInteraction(userId, recipeId, "cook_start");
  return row!.id;
}

async function sessionRow(userId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(cookSessions)
    .where(and(eq(cookSessions.id, id), eq(cookSessions.userId, userId)));
  if (!row) throw new CookSessionNotFound();
  return row;
}

export async function foodMapsFor(
  ids: number[],
): Promise<Map<number, NutrientMap>> {
  return new Map(
    [...(await nutrientMapsFor(ids))].map(([id, v]) => [id, v.map] as const),
  );
}

/** The recipe as cooked: swaps applied, quantities scaled to the session. */
function cookedRecipe(
  recipe: RecipeDetailDTO,
  subs: Substitution[],
  servings: number,
): RecipeDetailDTO {
  const applied = applySubstitutions(
    recipe.ingredients.map((i) => ({ ...i, displayText: i.displayText })),
    subs,
  );
  return {
    ...recipe,
    viewServings: servings,
    ingredients: applied.map((i) => ({
      ...i,
      scaledG: scaleQuantity(i.quantityG, recipe.servings, servings),
    })),
  };
}

export async function getSession(
  userId: string,
  id: string,
): Promise<CookSessionDTO> {
  const row = await sessionRow(userId, id);
  const recipe = await getRecipe(userId, row.recipeId, row.servings);
  if (!recipe) throw new CookSessionNotFound();
  const subs = row.substitutions;
  const cooked = cookedRecipe(recipe, subs, row.servings);
  const maps = await foodMapsFor(
    cooked.ingredients.flatMap((i) => (i.foodId ? [i.foodId] : [])),
  );
  const { macros } = recipeNutrition(cooked.ingredients, recipe.servings, maps);

  const messages = await getDb()
    .select()
    .from(cookMessages)
    .where(eq(cookMessages.sessionId, id))
    .orderBy(asc(cookMessages.createdAt), asc(cookMessages.id));

  return {
    id: row.id,
    recipe: cooked,
    servings: row.servings,
    currentStep: row.currentStep,
    substitutions: subs,
    perServing: macros,
    completedAt: row.completedAt?.toISOString() ?? null,
    messages: messages.flatMap((m): ChatMessageDTO[] => {
      const c = m.content as StoredContent;
      if (c.kind === "proposal") {
        const { kind: _k, ...proposal } = c;
        return [
          {
            id: m.id,
            role: "proposal",
            proposal: { id: m.id, ...proposal },
            step: m.stepAtTime,
          },
        ];
      }
      if (m.role === "tool") return [];
      return [{ id: m.id, role: m.role, text: c.text, step: m.stepAtTime }];
    }),
  };
}

export async function updateSession(
  userId: string,
  id: string,
  patch: { currentStep?: number | undefined; servings?: number | undefined },
): Promise<void> {
  await sessionRow(userId, id);
  const set: Partial<typeof cookSessions.$inferInsert> = {};
  if (patch.currentStep !== undefined) set.currentStep = patch.currentStep;
  if (patch.servings !== undefined) set.servings = patch.servings;
  if (Object.keys(set).length === 0) return;
  await getDb()
    .update(cookSessions)
    .set(set)
    .where(and(eq(cookSessions.id, id), eq(cookSessions.userId, userId)));
}

export async function addMessage(
  sessionId: string,
  role: "user" | "assistant" | "tool",
  content: StoredContent,
  step: number | null,
): Promise<number> {
  const [row] = await getDb()
    .insert(cookMessages)
    .values({ sessionId, role, content, stepAtTime: step })
    .returning({ id: cookMessages.id });
  return row!.id;
}

/** Accept or reject a proposed swap. Accepting adds it to the session. */
export async function decideProposal(
  userId: string,
  sessionId: string,
  messageId: number,
  accept: boolean,
): Promise<void> {
  const row = await sessionRow(userId, sessionId);
  const db = getDb();
  const [msg] = await db
    .select()
    .from(cookMessages)
    .where(
      and(
        eq(cookMessages.id, messageId),
        eq(cookMessages.sessionId, sessionId),
      ),
    );
  const content = msg?.content as StoredContent | undefined;
  if (!content || content.kind !== "proposal" || content.status !== "pending") {
    throw new CookSessionNotFound();
  }
  await db.transaction(async (tx) => {
    await tx
      .update(cookMessages)
      .set({
        content: { ...content, status: accept ? "accepted" : "rejected" },
      })
      .where(eq(cookMessages.id, messageId));
    if (accept) {
      await tx
        .update(cookSessions)
        .set({ substitutions: [...row.substitutions, content.substitution] })
        .where(eq(cookSessions.id, sessionId));
    }
  });
}

/**
 * "Done, log it": the meal goes in the diary linked to the session. With
 * accepted swaps, the cooked version is saved first as an ai_adapted child
 * so the logged macros match what was eaten.
 */
export async function completeSession(
  userId: string,
  id: string,
  options: { servings: number; mealSlot: MealSlot; date: string },
): Promise<{ recipeId: string; entryId: number }> {
  const row = await sessionRow(userId, id);
  const recipe = await getRecipe(userId, row.recipeId);
  if (!recipe) throw new CookSessionNotFound();

  let recipeId = recipe.id;
  if (row.substitutions.length) {
    const cooked = cookedRecipe(recipe, row.substitutions, recipe.servings);
    const input: RecipeInput = {
      ...toInput(cooked),
      title: `${recipe.title} (your version)`,
      description: `Cooked with ${row.substitutions
        .map((s) => s.newFoodName ?? "a swap")
        .join(", ")}.`,
    };
    recipeId = await createRecipe(userId, input, {
      source: "ai_adapted",
      parentRecipeId: recipe.id,
    });
  }

  const entryId = await addEntry(userId, {
    date: options.date,
    mealSlot: options.mealSlot,
    loggedVia: "cook_mode",
    cookSessionId: id,
    item: { kind: "recipe", recipeId, servings: options.servings },
  });
  await getDb()
    .update(cookSessions)
    .set({ completedAt: new Date() })
    .where(eq(cookSessions.id, id));
  await recordInteraction(userId, row.recipeId, "cook_complete");
  // SPEC.md: the taste profile is rebuilt after each completed cook.
  await rebuildTasteProfile(userId);
  return { recipeId, entryId };
}
