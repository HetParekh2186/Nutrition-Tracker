"use client";

import { ChevronLeft, ChevronRight, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { useQuickLog } from "@/components/log/quick-log-provider";
import { DayRing } from "@/components/nutrition/day-ring";
import { NutrientBars } from "@/components/nutrition/nutrient-bars";
import { Button } from "@/components/ui/button";
import { useCopyEntries, useDaySummary, useDiary } from "@/hooks/use-diary";
import type { DaySummaryDTO, DiaryDayDTO } from "@/lib/diary/types";
import { addDays } from "@/lib/nutrition/dates";

import { MealSlots } from "./meal-slots";

function dayTitle(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TodayView({
  date,
  today,
  initialDiary,
  initialSummary,
}: {
  date: string;
  today: string;
  initialDiary: DiaryDayDTO;
  initialSummary: DaySummaryDTO;
}) {
  const { setDate } = useQuickLog();
  useEffect(() => setDate(date), [date, setDate]);
  useEffect(() => () => setDate(today), [today, setDate]);

  const diary = useDiary(date);
  const summary = useDaySummary(date);
  const copy = useCopyEntries();
  const day = diary.data ?? initialDiary;
  const s = summary.data ?? initialSummary;
  const isEmpty = s.entryCount === 0 && day.date === date;
  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="grid grid-cols-1 gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="num text-xs tracking-widest text-ink-muted uppercase">
            {longDate(date)}
          </p>
          <h1 className="mt-1 text-2xl">{dayTitle(date, today)}</h1>
        </div>
        <nav aria-label="Day" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Previous day">
            <Link href={`/today?date=${prev}`} scroll={false}>
              <ChevronLeft />
            </Link>
          </Button>
          {date !== today ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/today" scroll={false}>
                Jump to today
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon" aria-label="Next day">
            <Link href={`/today?date=${next}`} scroll={false}>
              <ChevronRight />
            </Link>
          </Button>
        </nav>
      </header>

      <section aria-label="Day totals" className="grid grid-cols-1 gap-4">
        <DayRing
          consumed={s.consumed}
          target={s.target}
          remaining={s.remaining}
        />
        {date === today ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/for-you?slot=dinner">
                <Sparkles aria-hidden />
                Suggest dinner
              </Link>
            </Button>
            <span className="text-xs text-ink-muted">
              Recipes that fit what you have left today.
            </span>
          </div>
        ) : null}
        <p className="text-xs text-ink-muted">
          {s.targetsAreDefaults
            ? "Using standard targets until you set up your profile."
            : null}
          {s.energyEstimated
            ? " Some calories are estimated from protein, carbs and fat because the source has no energy value."
            : null}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
        <section
          aria-labelledby="meals-heading"
          className="grid grid-cols-1 content-start gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="meals-heading" className="text-xl">
              Meals
            </h2>
            {isEmpty ? (
              <Button
                variant="outline"
                size="sm"
                disabled={copy.isPending}
                onClick={() => copy.mutate({ from: prev, to: date })}
              >
                <Copy aria-hidden />
                Copy previous day
              </Button>
            ) : null}
          </div>
          <MealSlots day={day} />
        </section>

        <section
          aria-labelledby="nutrients-heading"
          className="grid grid-cols-1 content-start gap-4"
        >
          <h2 id="nutrients-heading" className="text-xl">
            Nutrients
          </h2>
          <NutrientBars nutrients={s.nutrients} />
        </section>
      </div>
    </div>
  );
}
