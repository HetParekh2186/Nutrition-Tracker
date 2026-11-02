"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAmount } from "@/lib/nutrition/format";
import { fractionOf } from "@/lib/nutrition/status";

export type TrendPoint = { date: string; value: number | null };

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function compact(n: number): string {
  return n >= 1000
    ? `${Number((n / 1000).toFixed(1))}K`
    : String(Math.round(n));
}

/**
 * One macro over a date range: a bar per logged day, a target line, and
 * the average and percent of target as the headline. One series, so no
 * legend: the title names it.
 */
export function MacroTrend({
  title,
  unit,
  color,
  points,
  average,
  target,
}: {
  title: string;
  unit: "kcal" | "g";
  color: string;
  points: TrendPoint[];
  average: number;
  target: number;
}) {
  const pct = Math.round(fractionOf(average, target) * 100);
  const dense = points.length > 40;

  function TooltipCard({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: unknown }>;
  }) {
    const p = payload?.[0]?.payload as TrendPoint | undefined;
    if (!active || !p) return null;
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-float">
        <p className="text-ink-muted">{shortDate(p.date)}</p>
        {p.value === null ? (
          <p>Nothing logged</p>
        ) : (
          <p className="num text-sm text-ink">
            {formatAmount(p.value, unit)} {unit}
            <span className="text-ink-muted">
              {" "}
              · {Math.round(fractionOf(p.value, target) * 100)}% of target
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <figure className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="flex items-center gap-2 font-display text-lg">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          {title}
        </span>
        <span className="num text-sm">
          avg {formatAmount(average, unit)} {unit}
          <span className="text-ink-muted">
            {" "}
            · {pct}% of {formatAmount(target, unit)}
          </span>
        </span>
      </figcaption>
      <div className="h-40" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
            barCategoryGap={dense ? 1 : 2}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={compact}
              tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              content={(props) => (
                <TooltipCard active={props.active} payload={props.payload} />
              )}
              cursor={{ fill: "var(--surface-2)" }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="value"
              fill={color}
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <ReferenceLine
              y={target}
              stroke="var(--ink)"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">
            {title} per day, target {formatAmount(target, unit)} {unit}
          </caption>
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="py-1 font-normal">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                {title} ({unit})
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                % of target
              </th>
            </tr>
          </thead>
          <tbody className="num">
            {points.map((p) => (
              <tr key={p.date} className="border-t border-border">
                <td className="py-1">{shortDate(p.date)}</td>
                <td className="py-1 text-right">
                  {p.value === null
                    ? "not logged"
                    : formatAmount(p.value, unit)}
                </td>
                <td className="py-1 text-right">
                  {p.value === null
                    ? ""
                    : `${Math.round(fractionOf(p.value, target) * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
