import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TodayView } from "@/components/today/today-view";
import { getUserId } from "@/lib/auth/session";
import { getDaySummary, getDiaryDay } from "@/lib/diary/repo";
import { isIsoDate, localDate } from "@/lib/nutrition/dates";
import { getProfile } from "@/lib/profile/repo";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/today");
  const profile = await getProfile(userId);
  // New accounts set up their targets first; the demo is already set up.
  if (!profile.onboarded && !profile.isDemo) redirect("/onboarding");
  const { date: requested } = await searchParams;
  const today = localDate(new Date(), profile.timezone);
  const date = requested && isIsoDate(requested) ? requested : today;

  // Render the first paint from the server so the ring is there immediately.
  const [diary, summary] = await Promise.all([
    getDiaryDay(userId, date),
    getDaySummary(userId, date),
  ]);

  return (
    <TodayView
      key={date}
      date={date}
      today={today}
      initialDiary={diary}
      initialSummary={summary}
    />
  );
}
