"use client";

import type { MealSlot } from "@/lib/db/enums";
import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/diary/slots";
import { cn } from "@/lib/utils";

/** Segmented radio group for the four meal slots. */
export function SlotPicker({
  value,
  onChange,
  name = "slot",
}: {
  value: MealSlot;
  onChange: (slot: MealSlot) => void;
  name?: string;
}) {
  return (
    <fieldset className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1">
      <legend className="sr-only">Meal</legend>
      {MEAL_SLOTS.map((slot) => (
        <label
          key={slot}
          className={cn(
            "cursor-pointer rounded-md px-2 py-1.5 text-center text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
            value === slot
              ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border)]"
              : "text-ink-muted hover:text-ink",
          )}
        >
          <input
            type="radio"
            name={name}
            value={slot}
            checked={value === slot}
            onChange={() => onChange(slot)}
            className="sr-only"
          />
          {SLOT_LABELS[slot]}
        </label>
      ))}
    </fieldset>
  );
}
