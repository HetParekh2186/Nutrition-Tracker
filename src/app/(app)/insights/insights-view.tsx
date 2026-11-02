"use client";

import Link from "next/link";
import { useState } from "react";

import { MacroTrend } from "@/components/insights/macro-trend";
import { MicroGrid } from "@/components/insights/micro-grid";
import { SourcesPanel } from "@/components/insights/sources-panel";
import { MACRO_META } from "@/components/nutrition/macro-chip";
import type { SuggestionStats } from "@/lib/insights/repo";
import type { RangeSummaryDTO } from "@/lib/insights/types";
import { formatAmount } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/macros";
import { daysMeeting } from "@/lib/nutrition/range";
import { fractionOf } from "@/lib/nutrition/status";
import { cn } from "@/lib/utils";

const TRENDS: {
  key: keyof Macros;
  title: string;
  unit: "kcal" | "g";
  color: string;
}[] = [
  { key: "kcal", title: "Calories", unit: "kcal", color: "var(--ink)" },
  {
    key: "proteinG",
    title: MACRO_META.protein.label,
    unit: "g",
    color: MACRO_META.protein.color,
  },
  {
    key: "carbsG",
    title: MACRO_META.carbs.label,
    unit: "g",
    color: MACRO_META.carbs.color,
  },
  {
    key: "fatG",
    title: MACRO_META.fat.label,
    unit: "g",
    color: MACRO_META.fat.color,
  },
];

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-border bg-surface p-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="num text-xl whitespace-nowrap sm:text-2xl">{value}</dd>
      <dd className="text-xs text-ink-muted">{detail}</dd>
    </div>
  );
}

export function InsightsView({
  range,
  summary,
  week,
  suggestions,
}: {
  range: 7 | 30 | 90;
  summary: RangeSummaryDTO;
  week: RangeSummaryDTO;
  suggestions: SuggestionStats;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const { averageMacros: avg, targetMacros: target } = summary;
  const proteinDays = daysMeeting(summary.days, "proteinG", target.proteinG);
  const nearKcal = daysMeeting(summary.days, "kcal", target.kcal, 0.9);

  return (
    <div className="grid grid-cols-1 gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Insights</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Averages count only the days you logged.
          </p>
        </div>
        <nav
          aria-label="Time range"
          className="flex rounded-lg bg-surface-2 p-1 text-sm"
        >
          {([7, 30, 90] as const).map((r) => (
            <Link
              key={r}
              href={`/insights?range=${r}`}
              scroll={false}
              aria-current={r === range ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                r === range
                  ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border)]"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Average calories"
          value={formatAmount(avg.kcal, "kcal")}
          detail={`${Math.round(fractionOf(avg.kcal, target.kcal) * 100)}% of ${formatAmount(target.kcal, "kcal")} kcal`}
        />
        <Stat
          label="Average protein"
          value={`${formatAmount(avg.proteinG, "g")} g`}
          detail={`${Math.round(fractionOf(avg.proteinG, target.proteinG) * 100)}% of ${formatAmount(target.proteinG, "g")} g`}
        />
        <Stat
          label="Protein target hit"
          value={`${proteinDays} / ${summary.loggedDays}`}
          detail="logged days at or above target"
        />
        <Stat
          label="Days logged"
          value={`${summary.loggedDays} / ${summary.days.length}`}
          detail={`${nearKcal} within 10% of your calorie target`}
        />
        <Stat
          label="Suggestions acted on"
          value={
            suggestions.rate === null
              ? "None yet"
              : `${Math.round(suggestions.rate * 100)}%`
          }
          detail={`of ${suggestions.shown} top-5 suggestions saved or cooked, last 4 weeks`}
        />
      </dl>

      <section aria-labelledby="trends-heading" className="grid gap-4">
        <h2 id="trends-heading" className="text-xl">
          Average vs target
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {TRENDS.map((t) => (
            <MacroTrend
              key={t.key}
              title={t.title}
              unit={t.unit}
              color={t.color}
              average={avg[t.key]}
              target={target[t.key]}
              points={summary.days.map((d) => ({
                date: d.date,
                value: d.entryCount > 0 ? d.macros[t.key] : null,
              }))}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="micro-heading"
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div className="grid min-w-0 gap-4">
          <div>
            <h2 id="micro-heading" className="text-xl">
              Micronutrients, last 7 days
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Tap a tile to see which foods supply it.
            </p>
          </div>
          <MicroGrid
            nutrients={week.nutrients}
            selectedId={selected}
            onSelect={setSelected}
          />
        </div>
        <aside
          aria-live="polite"
          className="h-fit min-w-0 rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-20"
        >
          {selected === null ? (
            <p className="text-sm text-ink-muted">
              Pick a nutrient to see your top food sources for it this week.
            </p>
          ) : (
            <SourcesPanel nutrientId={selected} from={week.from} to={week.to} />
          )}
        </aside>
      </section>
    </div>
  );
}
