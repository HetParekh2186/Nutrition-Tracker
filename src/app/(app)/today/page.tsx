import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TodayView } from "@/components/today/today-view";
import { getUserId } from "@/lib/auth/session";
import { getDaySummary, getDiaryDay, getTimezone } from "@/lib/diary/repo";
import { isIsoDate, localDate } from "@/lib/nutrition/dates";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/today");
  const { date: requested } = await searchParams;
  const today = localDate(new Date(), await getTimezone(userId));
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
