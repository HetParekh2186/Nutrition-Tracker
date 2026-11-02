import type { Metadata } from "next";

import { emptyIngredient, emptyStep } from "@/components/recipes/recipe-draft";
import { RecipeEditor } from "@/components/recipes/recipe-editor";

export const metadata: Metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8">
      <h1 className="text-2xl">New recipe</h1>
      <RecipeEditor
        initial={{
          title: "",
          description: "",
          cuisine: "",
          mealTypes: ["dinner"],
          servings: "2",
          prepMinutes: "",
          cookMinutes: "",
          ingredients: [
            emptyIngredient(),
            emptyIngredient(),
            emptyIngredient(),
          ],
          steps: [emptyStep(), emptyStep()],
        }}
      />
    </div>
  );
}
