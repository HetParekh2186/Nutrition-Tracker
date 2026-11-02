"use client";

import { motion, useReducedMotion } from "motion/react";

import type { NutrientRowDTO } from "@/lib/diary/types";
import { BAR_GROUPS } from "@/lib/nutrition/catalog";
import { formatAmount } from "@/lib/nutrition/format";
import {
  fractionOf,
  referenceAmount,
  targetStatus,
  type TargetStatus,
} from "@/lib/nutrition/status";
import { FADE, SPRING } from "@/lib/motion";

// The track shows 0 to 150% of the reference; the tick marks 100%.
const TRACK_MAX = 1.5;

const FILL: Record<TargetStatus, string> = {
  none: "var(--ink-muted)",
  low: "var(--ink-muted)",
  good: "var(--good)",
  over: "var(--over)",
};

function percentLabel(row: NutrientRowDTO): string | null {
  const ref = referenceAmount(row.target);
  if (row.amount === null || ref === null) return null;
  return `${Math.round(fractionOf(row.amount, ref) * 100)}%`;
}

function Bar({ row }: { row: NutrientRowDTO }) {
  const reduce = useReducedMotion();
  const amount = row.amount ?? 0;
  const ref = referenceAmount(row.target);
  const status = targetStatus(amount, row.target);
  const fill = Math.min(fractionOf(amount, ref) / TRACK_MAX, 1);
  const incomplete = row.total > 0 && row.known < row.total;
  const pct = percentLabel(row);
  const limitOnly = row.target?.min === null && row.target?.max !== null;

  return (
    <li className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_4.5rem] items-center gap-3 py-1.5 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_7rem]">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{row.name}</span>
        {incomplete ? (
          <span
            className="size-1.5 shrink-0 rounded-full bg-warn"
            title={`Data for ${row.known} of ${row.total} foods`}
          >
            <span className="sr-only">
              (data for {row.known} of {row.total} foods)
            </span>
          </span>
        ) : null}
      </span>

      {ref !== null ? (
        <span
          className="relative h-2 rounded-full bg-surface-2"
          role="meter"
          aria-label={row.name}
          aria-valuemin={0}
          aria-valuemax={ref}
          aria-valuenow={amount}
          aria-valuetext={`${formatAmount(amount, row.unit)} ${row.unit} of ${formatAmount(ref, row.unit)} ${row.unit}${limitOnly ? " limit" : ""}`}
        >
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: FILL[status] }}
            initial={false}
            animate={{ width: `${fill * 100}%` }}
            transition={reduce ? FADE : SPRING}
          />
          <span
            aria-hidden
            className="absolute -inset-y-1 w-px bg-ink"
            style={{ left: `${(1 / TRACK_MAX) * 100}%` }}
          />
        </span>
      ) : (
        <span className="text-xs text-ink-muted">No target</span>
      )}

      <span className="text-right num text-xs">
        {row.amount === null ? (
          <span className="text-ink-muted">no data</span>
        ) : (
          <>
            <span className={status === "over" ? "text-over" : "text-ink"}>
              {formatAmount(row.amount, row.unit)}
            </span>
            <span className="text-ink-muted"> {row.unit}</span>
            {pct ? (
              <span className="hidden text-ink-muted sm:inline"> · {pct}</span>
            ) : null}
          </>
        )}
      </span>
    </li>
  );
}

/**
 * Cronometer-style bars grouped as Vitamins, Minerals, Lipids, Amino acids.
 * A tick marks the target; green means met, --over means above a limit, and
 * a small dot marks nutrients with incomplete data.
 */
export function NutrientBars({
  nutrients,
  openGroups = ["vitamin", "mineral"],
}: {
  nutrients: NutrientRowDTO[];
  openGroups?: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {BAR_GROUPS.map((group) => {
        const rows = nutrients.filter((n) => n.category === group.category);
        if (rows.length === 0) return null;
        const met = rows.filter(
          (r) =>
            r.amount !== null && targetStatus(r.amount, r.target) === "good",
        ).length;
        const withTarget = rows.filter(
          (r) => referenceAmount(r.target) !== null,
        ).length;
        return (
          <details
            key={group.category}
            open={openGroups.includes(group.category)}
            className="group rounded-xl border border-border bg-surface"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-lg">{group.label}</span>
              <span className="num text-xs text-ink-muted">
                {withTarget > 0 ? `${met} of ${withTarget} met` : null}
                <span
                  aria-hidden
                  className="ml-2 inline-block transition-transform group-open:rotate-90"
                >
                  ›
                </span>
              </span>
            </summary>
            <ul className="border-t border-border px-4 py-2">
              {rows.map((row) => (
                <Bar key={row.id} row={row} />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
