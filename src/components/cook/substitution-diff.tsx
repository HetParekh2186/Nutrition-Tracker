"use client";

import { ArrowRight, Check, X } from "lucide-react";

import { MACRO_META } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import type { ProposalDTO } from "@/lib/cook/types";
import { formatAmount } from "@/lib/nutrition/format";
import { cn } from "@/lib/utils";

const ROWS = [
  { key: "kcal", label: "Calories", unit: "kcal", color: "var(--ink)" },
  {
    key: "proteinG",
    label: MACRO_META.protein.label,
    unit: "g",
    color: MACRO_META.protein.color,
  },
  {
    key: "carbsG",
    label: MACRO_META.carbs.label,
    unit: "g",
    color: MACRO_META.carbs.color,
  },
  {
    key: "fatG",
    label: MACRO_META.fat.label,
    unit: "g",
    color: MACRO_META.fat.color,
  },
] as const;

function signed(n: number, unit: "kcal" | "g"): string {
  const shown = formatAmount(Math.abs(n), unit);
  if (Number(shown.replace(/,/g, "")) === 0) return "±0";
  return `${n > 0 ? "+" : "−"}${shown}`;
}

/** The macro change of a proposed swap, per serving, from USDA data. */
export function SubstitutionDiff({
  proposal,
  onDecide,
  busy,
}: {
  proposal: ProposalDTO;
  onDecide: (accept: boolean) => void;
  busy?: boolean;
}) {
  const { diff } = proposal;
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <header className="grid gap-1">
        <p className="text-xs tracking-widest text-ink-muted uppercase">Swap</p>
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-ink-muted line-through">
            {proposal.originalText}
          </span>
          <ArrowRight aria-label="for" className="size-3.5 text-ink-muted" />
          <span className="font-medium">
            {proposal.substitution.displayText ?? proposal.newFoodName}
          </span>
        </p>
        <p className="text-xs text-ink-muted">{proposal.substitution.reason}</p>
      </header>
      <table className="w-full text-sm">
        <caption className="sr-only">
          Per serving, before and after the swap
        </caption>
        <thead className="text-xs text-ink-muted">
          <tr>
            <th scope="col" className="pb-1 text-left font-normal">
              Per serving
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Now
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              After
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="num">
          {ROWS.map((r) => {
            const d = diff.delta[r.key];
            return (
              <tr key={r.key} className="border-t border-border">
                <th scope="row" className="py-1 text-left font-normal">
                  <span className="inline-flex items-center gap-1.5 font-sans">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    {r.label}
                  </span>
                </th>
                <td className="py-1 text-right text-ink-muted">
                  {formatAmount(diff.before[r.key], r.unit)}
                </td>
                <td className="py-1 text-right">
                  {formatAmount(diff.after[r.key], r.unit)}
                </td>
                <td
                  className={cn(
                    "py-1 text-right",
                    d < 0 && r.key !== "proteinG" ? "text-good" : "",
                  )}
                >
                  {signed(d, r.unit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {proposal.status === "pending" ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onDecide(true)} disabled={busy}>
            <Check aria-hidden />
            Accept swap
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDecide(false)}
            disabled={busy}
          >
            <X aria-hidden />
            Keep original
          </Button>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">
          {proposal.status === "accepted"
            ? "Swapped. Ingredients and macros updated."
            : "Kept the original."}
        </p>
      )}
    </article>
  );
}
