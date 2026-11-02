"use client";

import { motion, useReducedMotion } from "motion/react";

import type { NutrientRowDTO } from "@/lib/diary/types";
import { formatAmount } from "@/lib/nutrition/format";
import {
  fractionOf,
  referenceAmount,
  targetStatus,
} from "@/lib/nutrition/status";
import { FADE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Periodic-table style symbols. */
const SYMBOLS: Record<number, string> = {
  1106: "A",
  1162: "C",
  1114: "D",
  1109: "E",
  1185: "K",
  1165: "B1",
  1166: "B2",
  1167: "B3",
  1170: "B5",
  1175: "B6",
  1178: "B12",
  1190: "B9",
  1180: "Ch",
  1087: "Ca",
  1089: "Fe",
  1090: "Mg",
  1091: "P",
  1092: "K",
  1093: "Na",
  1095: "Zn",
  1098: "Cu",
  1101: "Mn",
  1103: "Se",
  1079: "Fb",
  1404: "ω3",
};

const ROWS: { label: string; ids: number[] }[] = [
  {
    label: "Vitamins",
    ids: [
      1106, 1162, 1114, 1109, 1185, 1165, 1166, 1167, 1170, 1175, 1178, 1190,
      1180,
    ],
  },
  {
    label: "Minerals",
    ids: [1087, 1089, 1090, 1091, 1092, 1093, 1095, 1098, 1101, 1103],
  },
  { label: "Also tracked", ids: [1079, 1404] },
];

function Tile({
  row,
  selected,
  onSelect,
}: {
  row: NutrientRowDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = referenceAmount(row.target);
  const amount = row.amount ?? 0;
  const fraction = fractionOf(amount, ref);
  const status = targetStatus(amount, row.target);
  const pct =
    ref === null || row.amount === null ? null : Math.round(fraction * 100);
  const incomplete = row.total > 0 && row.known < row.total;
  const over = status === "over";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${row.name}: ${
        row.amount === null
          ? "no data"
          : `${formatAmount(amount, row.unit)} ${row.unit} a day`
      }${pct === null ? "" : `, ${pct}% of target`}${over ? ", over the upper limit" : ""}${incomplete ? ", incomplete data" : ""}. Show top sources.`}
      className={cn(
        "relative isolate flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-lg border bg-surface p-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-ink"
          : over
            ? "border-over"
            : "border-border hover:border-ink-muted",
      )}
    >
      {/* The fill rises like a measuring beaker: 100% target fills the tile. */}
      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10"
        style={{
          backgroundColor: over
            ? "color-mix(in oklch, var(--over) 22%, transparent)"
            : "color-mix(in oklch, var(--fiber) 26%, transparent)",
        }}
        initial={false}
        animate={{ height: `${Math.min(fraction, 1) * 100}%` }}
        transition={reduce ? FADE : SPRING}
      />
      <span className="flex items-start justify-between gap-1">
        <span className="font-display text-xl leading-none">
          {SYMBOLS[row.id] ?? "?"}
        </span>
        {incomplete ? (
          <span aria-hidden className="size-1.5 rounded-full bg-warn" />
        ) : null}
      </span>
      <span className="grid gap-0.5">
        <span className="num text-sm leading-none">
          {pct === null ? "n/a" : `${pct}%`}
        </span>
        <span className="truncate text-[0.6875rem] leading-tight text-ink-muted">
          {row.name}
        </span>
      </span>
    </button>
  );
}

/**
 * A periodic table of micronutrients. Each tile fills to its average
 * percent of target; tap one to see where that nutrient comes from.
 */
export function MicroGrid({
  nutrients,
  selectedId,
  onSelect,
}: {
  nutrients: NutrientRowDTO[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const byId = new Map(nutrients.map((n) => [n.id, n]));
  return (
    <div className="grid gap-5">
      {ROWS.map((group) => (
        <div key={group.label} className="grid gap-2">
          <h3 className="text-xs tracking-widest text-ink-muted uppercase">
            {group.label}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-1.5">
            {group.ids.map((id) => {
              const row = byId.get(id);
              return row ? (
                <Tile
                  key={id}
                  row={row}
                  selected={selectedId === id}
                  onSelect={() => onSelect(id)}
                />
              ) : null;
            })}
          </div>
        </div>
      ))}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span>Fill shows the daily average as a share of target.</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-warn" />
          Some foods had no data
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm border border-over"
          />
          Over the upper limit
        </span>
      </p>
    </div>
  );
}
