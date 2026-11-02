"use client";

import { Copy, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { useQuickLog } from "@/components/log/quick-log-provider";
import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { useCopyEntries } from "@/hooks/use-diary";
import type { MealSlot } from "@/lib/db/enums";
import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/diary/slots";
import type { DiaryDayDTO, DiaryEntryDTO } from "@/lib/diary/types";
import { addDays } from "@/lib/nutrition/dates";
import { formatAmount } from "@/lib/nutrition/format";
import { sumMacros } from "@/lib/nutrition/status";
import { SPRING } from "@/lib/motion";

import { EntryDialog } from "./entry-dialog";

function amountLabel(entry: DiaryEntryDTO): string {
  if (entry.kind === "recipe") {
    const s = Number(entry.servings?.toFixed(2) ?? 0);
    return `${s} ${s === 1 ? "serving" : "servings"}`;
  }
  const grams = `${formatAmount(entry.quantityG ?? 0, "g")} g`;
  return entry.portionLabel ? `${entry.portionLabel} · ${grams}` : grams;
}

function Slot({
  slot,
  entries,
  date,
  onEdit,
}: {
  slot: MealSlot;
  entries: DiaryEntryDTO[];
  date: string;
  onEdit: (entry: DiaryEntryDTO) => void;
}) {
  const { open } = useQuickLog();
  const copy = useCopyEntries();
  const total = sumMacros(entries);
  const headingId = `slot-${slot}`;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-border bg-surface"
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
        <h3 id={headingId} className="text-lg">
          {SLOT_LABELS[slot]}
        </h3>
        {entries.length ? (
          <span className="num text-sm text-ink-muted">
            {formatAmount(total.kcal, "kcal")} kcal
          </span>
        ) : null}
      </header>

      {entries.length ? (
        <ul className="px-2">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={SPRING}
              >
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  disabled={entry.id < 0}
                  className="flex w-full flex-col gap-1 rounded-lg px-2 py-2.5 text-left transition-colors outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{entry.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {amountLabel(entry)}
                    </span>
                  </span>
                  <MacroLine macros={entry.macros} className="shrink-0" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="px-4 pb-1 text-sm text-ink-muted">Nothing logged yet.</p>
      )}

      <footer className="flex flex-wrap gap-1 px-2 pt-1 pb-2">
        <Button variant="ghost" size="sm" onClick={() => open({ slot })}>
          <Plus aria-hidden />
          Add
        </Button>
        {entries.length === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={copy.isPending}
            onClick={() =>
              copy.mutate({ from: addDays(date, -1), to: date, slot })
            }
          >
            <Copy aria-hidden />
            Copy yesterday
          </Button>
        ) : null}
      </footer>
    </section>
  );
}

export function MealSlots({ day }: { day: DiaryDayDTO }) {
  const [editing, setEditing] = useState<DiaryEntryDTO | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        {MEAL_SLOTS.map((slot) => (
          <Slot
            key={slot}
            slot={slot}
            entries={day.slots[slot]}
            date={day.date}
            onEdit={setEditing}
          />
        ))}
      </div>
      {editing ? (
        <EntryDialog
          key={editing.id}
          entry={editing}
          date={day.date}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
