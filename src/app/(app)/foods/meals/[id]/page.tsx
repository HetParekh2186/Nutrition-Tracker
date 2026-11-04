import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/foods/back-link";
import { MealEditor } from "@/components/foods/meal-editor";
import { getUserId } from "@/lib/auth/session";
import { getMeal } from "@/lib/meals/repo";

export const metadata: Metadata = { title: "Edit meal" };

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  const { id } = await params;
  if (!userId) redirect(`/login?next=/foods/meals/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const meal = await getMeal(userId, id);
  if (!meal) notFound();

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-2">
        <BackLink href="/foods/meals" label="Saved meals" />
        <h1 className="text-2xl">{meal.name}</h1>
      </header>
      <MealEditor meal={meal} />
    </div>
  );
}
