import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { getUserId } from "@/lib/auth/session";
import { getRecipe } from "@/lib/recipes/repo";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  const { id } = await params;
  if (!userId) redirect(`/login?next=/recipes/${id}/edit`);
  if (!z.uuid().safeParse(id).success) notFound();
  const recipe = await getRecipe(userId, id);
  if (!recipe) notFound();
  if (!recipe.isOwn) redirect(`/recipes/${id}`);

  const indexById = new Map(recipe.ingredients.map((ing, i) => [ing.id, i]));
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8">
      <h1 className="text-2xl">Edit recipe</h1>
      <RecipeEditor
        recipeId={recipe.id}
        initial={{
          title: recipe.title,
          description: recipe.description ?? "",
          cuisine: recipe.cuisine ?? "",
          mealTypes: recipe.mealTypes,
          servings: String(recipe.servings),
          prepMinutes:
            recipe.prepMinutes === null ? "" : String(recipe.prepMinutes),
          cookMinutes:
            recipe.cookMinutes === null ? "" : String(recipe.cookMinutes),
          ingredients: recipe.ingredients.map((ing) => ({
            key: `i${ing.id}`,
            displayText: ing.displayText,
            grams: String(Number(ing.quantityG.toFixed(1))),
            foodId: ing.foodId,
            foodName: ing.foodName,
            groupLabel: ing.groupLabel,
          })),
          steps: recipe.steps.map((s) => ({
            key: `s${s.id}`,
            instruction: s.instruction,
            timerMinutes: s.timerSeconds
              ? String(Math.round(s.timerSeconds / 60))
              : "",
            ingredientIndexes: s.ingredientIds.flatMap((id) => {
              const i = indexById.get(id);
              return i === undefined ? [] : [i];
            }),
          })),
        }}
      />
    </div>
  );
}
