import { formatAmount } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/macros";
import { cn } from "@/lib/utils";

export const MACRO_META = {
  protein: { label: "Protein", short: "P", color: "var(--protein)" },
  carbs: { label: "Carbs", short: "C", color: "var(--carbs)" },
  fat: { label: "Fat", short: "F", color: "var(--fat)" },
  fiber: { label: "Fiber", short: "Fb", color: "var(--fiber)" },
} as const;

export type MacroKey = keyof typeof MACRO_META;

/** Colour dot, short label and grams. Colour is never the only signal. */
export function MacroChip({
  macro,
  grams,
  className,
}: {
  macro: MacroKey;
  grams: number;
  className?: string;
}) {
  const meta = MACRO_META[macro];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-ink-muted",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      <span className="sr-only">{meta.label}</span>
      <span aria-hidden>{meta.short}</span>
      <span className="num text-ink">{formatAmount(grams, "g")}</span>
    </span>
  );
}

/** "165 kcal  P 31  C 0  F 3.6" in one line. */
export function MacroLine({
  macros,
  className,
}: {
  macros: Macros;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-3", className)}
    >
      <span className="num text-sm text-ink">
        {formatAmount(macros.kcal, "kcal")}
        <span className="text-xs text-ink-muted"> kcal</span>
      </span>
      <MacroChip macro="protein" grams={macros.proteinG} />
      <MacroChip macro="carbs" grams={macros.carbsG} />
      <MacroChip macro="fat" grams={macros.fatG} />
    </span>
  );
}
