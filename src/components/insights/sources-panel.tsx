"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/client/api";
import type { NutrientUnit } from "@/lib/nutrition/catalog";
import { formatAmount } from "@/lib/nutrition/format";

/** "Vitamin D" keeps its capitals; "Iron" reads as "iron" mid-sentence. */
function nutrientPhrase(name: string): string {
  return /^(Vitamin|Omega)/.test(name) ? name : name.toLowerCase();
}

/** Daily amount, with "<1" instead of a misleading 0 for trace amounts. */
function perDay(amount: number, unit: NutrientUnit): string {
  const shown = formatAmount(amount, unit);
  return amount > 0 && Number(shown) === 0
    ? `<1 ${unit}/day`
    : `${shown} ${unit}/day`;
}

/** "Where does my X come from": top foods by share of the total. */
export function SourcesPanel({
  nutrientId,
  from,
  to,
}: {
  nutrientId: number;
  from: string;
  to: string;
}) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["sources", nutrientId, from, to],
    queryFn: () => api.sources(nutrientId, from, to),
  });

  if (isPending) {
    return <p className="text-sm text-ink-muted">Finding your sources</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-over">Could not load sources.</p>;
  }
  if (data.sources.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        None of the foods you logged in this period have data for {data.name}.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <h3 className="font-display text-lg">
        Where your {nutrientPhrase(data.name)} comes from
      </h3>
      <ol className="grid grid-cols-1 gap-2.5">
        {data.sources.map((s) => (
          <li key={s.key} className="grid min-w-0 gap-1">
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{s.name}</span>
              <span className="shrink-0 num text-xs text-ink-muted">
                {perDay(s.dailyAverage, data.unit)} ·{" "}
                {Math.round(s.share * 100)}%
              </span>
            </div>
            <span aria-hidden className="h-1.5 rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-ink-muted"
                style={{ width: `${Math.max(2, s.share * 100)}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-muted">
        Over {data.loggedDays} logged {data.loggedDays === 1 ? "day" : "days"}.
      </p>
    </div>
  );
}
