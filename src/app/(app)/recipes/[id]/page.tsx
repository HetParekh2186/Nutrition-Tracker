import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getUserId } from "@/lib/auth/session";
import { targetsFor } from "@/lib/diary/repo";
import { llmConfigured } from "@/lib/llm/client";
import { plainName, unfamiliar } from "@/lib/recipes/familiar";
import { knownFoods } from "@/lib/recipes/familiar-repo";
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
  const [recipe, { targets }, { known }] = await Promise.all([
    getRecipe(userId, id),
    targetsFor(userId),
    knownFoods(userId),
  ]);
  if (!recipe) notFound();
  // A recipe they typed in themselves needs no "do you have it?".
  const fresh =
    recipe.isOwn && recipe.source === "user"
      ? []
      : unfamiliar(recipe.ingredients, known).map((i) => ({
          id: i.id,
          name: plainName(i.displayText),
        }));
  // Per-serving amounts against the user's daily targets.
  const withTargets = {
    ...recipe,
    nutrients: recipe.nutrients.map((n) => ({
      ...n,
      target: targets[n.id] ?? null,
    })),
  };
  return (
    <RecipeView
      initial={withTargets}
      aiEnabled={llmConfigured()}
      newIngredients={fresh}
    />
  );
}
