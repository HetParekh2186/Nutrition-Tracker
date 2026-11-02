import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth/session";
import { getRangeSummary } from "@/lib/insights/repo";
import { addDays, localDate } from "@/lib/nutrition/dates";
import { getProfile } from "@/lib/profile/repo";

import { InsightsView } from "./insights-view";

export const metadata: Metadata = { title: "Insights" };

const RANGES = [7, 30, 90] as const;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/insights");
  const { range: requested } = await searchParams;
  const range =
    RANGES.find((r) => String(r) === requested) ??
    (30 as (typeof RANGES)[number]);
  const profile = await getProfile(userId);
  const to = localDate(new Date(), profile.timezone);
  const from = addDays(to, -(range - 1));
  const weekFrom = addDays(to, -6);

  const [summary, week] = await Promise.all([
    getRangeSummary(userId, from, to),
    range === 7 ? null : getRangeSummary(userId, weekFrom, to),
  ]);

  return (
    <InsightsView range={range} summary={summary} week={week ?? summary} />
  );
}
