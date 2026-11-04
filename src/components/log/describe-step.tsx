"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAddEntry } from "@/hooks/use-diary";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { macrosForGrams } from "@/lib/foods/preview";
import type { ParsedLogItem } from "@/lib/log/types";
import { addMacros, ZERO_MACROS } from "@/lib/nutrition/macros";
import { cn } from "@/lib/utils";

import { SlotPicker } from "./slot-picker";

type Row = {
  item: ParsedLogItem;
  pick: number;
  /** Grams typed by hand; null keeps the parsed estimate. */
  grams: string | null;
  include: boolean;
};

function rowGrams(row: Row): number {
  const typed = row.grams === null ? NaN : Number(row.grams);
  return row.grams === null
    ? (row.item.candidates[row.pick]?.grams ?? 0)
    : Number.isFinite(typed)
      ? typed
      : 0;
}

function ItemRow({
  row,
  index,
  onChange,
}: {
  row: Row;
  index: number;
  onChange: (row: Row) => void;
}) {
  const { item } = row;
  const pick = item.candidates[row.pick];
  const grams = rowGrams(row);
  const macros = pick ? macrosForGrams(pick.food.per100g, grams) : null;
  const id = `describe-${index}`;

  if (!pick) {
    return (
      <li className="grid gap-1 rounded-lg border border-dashed border-border p-3">
        <p className="text-sm">&ldquo;{item.text}&rdquo;</p>
        <p className="text-xs text-ink-muted">
          No food matched &ldquo;{item.query}&rdquo;. Search for it instead, or
          create a custom food.
        </p>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "grid gap-2.5 rounded-lg border p-3",
        item.needsReview ? "border-accent" : "border-border",
        !row.include && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.include}
            onChange={(e) => onChange({ ...row, include: e.target.checked })}
            className="size-4 shrink-0 accent-ink"
          />
          <span className="truncate">&ldquo;{item.text}&rdquo;</span>
        </label>
        {item.needsReview ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink">
            <AlertCircle aria-hidden className="size-3.5 text-accent" />
            Check this match
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-food`} className="text-xs text-ink-muted">
            Food
          </Label>
          <select
            id={`${id}-food`}
            value={row.pick}
            onChange={(e) =>
              onChange({ ...row, pick: Number(e.target.value), grams: null })
            }
            className="h-8 min-w-0 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            {item.candidates.map((c, i) => (
              <option key={c.food.id} value={i}>
                {c.food.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-g`} className="text-xs text-ink-muted">
            Grams
          </Label>
          <input
            id={`${id}-g`}
            inputMode="decimal"
            value={row.grams ?? String(pick.grams)}
            onChange={(e) => onChange({ ...row, grams: e.target.value })}
            className="h-8 min-w-0 rounded-lg border border-input bg-surface-2 px-2 num text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>
          {row.grams === null && pick.portionLabel ? pick.portionLabel : null}
          {row.grams === null && pick.method === "guess"
            ? `${pick.portionLabel ? ", " : ""}amount estimated`
            : null}
        </span>
        {macros ? <MacroLine macros={macros} /> : null}
      </div>
    </li>
  );
}

/**
 * Plain-English logging: describe a meal, check what it matched, log it.
 * Claude only splits the text; every number comes from USDA data.
 */
export function DescribeStep({
  initialText,
  date,
  initialSlot,
  openedAt,
  onBack,
  onDone,
}: {
  initialText: string;
  date: string;
  initialSlot: MealSlot;
  openedAt: number;
  onBack: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [saving, setSaving] = useState(false);
  const add = useAddEntry();

  const parse = useMutation({
    mutationFn: (t: string) => api.parseLog(t),
    onSuccess: ({ items }) =>
      setRows(
        items.map((item) => ({
          item,
          pick: 0,
          grams: null,
          include: item.candidates.length > 0,
        })),
      ),
  });

  const chosen = (rows ?? []).filter(
    (r) => r.include && r.item.candidates[r.pick] && rowGrams(r) > 0,
  );
  const total = chosen.reduce(
    (sum, r) =>
      addMacros(
        sum,
        macrosForGrams(r.item.candidates[r.pick]!.food.per100g, rowGrams(r)),
      ),
    ZERO_MACROS,
  );

  async function logAll() {
    setSaving(true);
    try {
      // The whole meal counts as one log action.
      const logMs = openedAt ? Date.now() - openedAt : undefined;
      for (const [i, r] of chosen.entries()) {
        const c = r.item.candidates[r.pick]!;
        const grams = rowGrams(r);
        const { energyEstimated: _e, ...macros } = macrosForGrams(
          c.food.per100g,
          grams,
        );
        await add.mutateAsync({
          input: {
            date,
            mealSlot: slot,
            loggedVia: "natural_language",
            ...(i === 0 && logMs !== undefined ? { logMs } : {}),
            item: {
              kind: "food",
              foodId: c.food.id,
              quantityG: grams,
              portionLabel: r.grams === null ? c.portionLabel : null,
            },
          },
          preview: { name: c.food.name, brand: c.food.brand, macros },
        });
      }
      toast.success(
        `Logged ${chosen.length} ${chosen.length === 1 ? "item" : "items"} to ${SLOT_LABELS[slot].toLowerCase()}`,
      );
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid max-h-[min(80dvh,46rem)] min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 p-4">
      <div className="flex items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back to search"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug">Describe a meal</p>
          <p className="text-xs text-ink-muted">
            Write it the way you would say it. You check every match before
            anything is logged.
          </p>
        </div>
      </div>

      <div className="grid min-h-0 content-start gap-4 overflow-y-auto">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 2) parse.mutate(text.trim());
          }}
        >
          <Label htmlFor="describe-text" className="sr-only">
            What did you eat?
          </Label>
          <textarea
            id="describe-text"
            autoFocus
            rows={2}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="2 eggs, a slice of sourdough with butter and a black coffee"
            className="min-h-16 w-full resize-none rounded-lg border border-input bg-surface-2 px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          <div>
            <Button
              type="submit"
              variant={rows ? "outline" : "default"}
              disabled={parse.isPending || text.trim().length < 2}
            >
              {parse.isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Sparkles aria-hidden />
              )}
              {parse.isPending
                ? "Matching foods"
                : rows
                  ? "Match again"
                  : "Match foods"}
            </Button>
          </div>
          {parse.isError ? (
            <p role="alert" className="text-sm text-over">
              {parse.error.message}
            </p>
          ) : null}
        </form>

        {rows ? (
          rows.length === 0 ? (
            <p role="status" className="text-sm text-ink-muted">
              No foods found in that. Try naming what you ate.
            </p>
          ) : (
            <>
              <ul className="grid gap-2" aria-label="Matched foods">
                {rows.map((row, i) => (
                  <ItemRow
                    key={`${i}-${row.item.query}`}
                    row={row}
                    index={i}
                    onChange={(next) =>
                      setRows((prev) =>
                        prev ? prev.map((r, j) => (j === i ? next : r)) : prev,
                      )
                    }
                  />
                ))}
              </ul>
              <SlotPicker
                value={slot}
                onChange={setSlot}
                name="describe-slot"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                <span className="text-xs text-ink-muted">Total</span>
                <MacroLine macros={total} />
              </div>
              <Button
                size="lg"
                onClick={() => void logAll()}
                disabled={saving || chosen.length === 0}
              >
                {saving
                  ? "Logging"
                  : `Log ${chosen.length} ${chosen.length === 1 ? "item" : "items"} to ${SLOT_LABELS[slot].toLowerCase()}`}
              </Button>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
