import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth/session";
import { MEAL_SLOTS, type MealSlot } from "@/lib/db/enums";
import { defaultSlotForHour } from "@/lib/foods/units";
import { getRecommendations } from "@/lib/recommend/service";

import { ForYouView } from "./for-you-view";

export const metadata: Metadata = { title: "For You" };

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/for-you");
  const { slot: raw } = await searchParams;
  const slot =
    (MEAL_SLOTS.find((s) => s === raw) as MealSlot | undefined) ??
    defaultSlotForHour(new Date().getHours());
  const initial = await getRecommendations(userId, slot, 10);
  return <ForYouView key={slot} initial={initial} />;
}
