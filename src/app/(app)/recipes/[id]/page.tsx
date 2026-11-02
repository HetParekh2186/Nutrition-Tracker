import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getUserId } from "@/lib/auth/session";
import { targetsFor } from "@/lib/diary/repo";
import { llmConfigured } from "@/lib/llm/client";
import { getRecipe } from "@/lib/recipes/repo";

import { RecipeView } from "./recipe-view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const userId = await getUserId();
  const { id } = await params;
  if (!userId || !z.uuid().safeParse(id).success) return { title: "Recipe" };
  const recipe = await getRecipe(userId, id);
  return { title: recipe?.title ?? "Recipe" };
}

export default async function RecipePage({ params }: Props) {
  const userId = await getUserId();
  const { id } = await params;
  if (!userId) redirect(`/login?next=/recipes/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [recipe, { targets }] = await Promise.all([
    getRecipe(userId, id),
    targetsFor(userId),
  ]);
  if (!recipe) notFound();
  // Per-serving amounts against the user's daily targets.
  const withTargets = {
    ...recipe,
    nutrients: recipe.nutrients.map((n) => ({
      ...n,
      target: targets[n.id] ?? null,
    })),
  };
  return <RecipeView initial={withTargets} aiEnabled={llmConfigured()} />;
}
