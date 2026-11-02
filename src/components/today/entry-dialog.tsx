"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { SlotPicker } from "@/components/log/slot-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteEntry, useUpdateEntry } from "@/hooks/use-diary";
import type { MealSlot } from "@/lib/db/enums";
import type { DiaryEntryDTO } from "@/lib/diary/types";

/** Edit the amount or slot of a diary entry, or delete it. */
export function EntryDialog({
  entry,
  date,
  onClose,
}: {
  entry: DiaryEntryDTO;
  date: string;
  onClose: () => void;
}) {
  const isFood = entry.kind === "food";
  const [amount, setAmount] = useState(
    String(
      Number((isFood ? entry.quantityG : entry.servings)?.toFixed(2) ?? 0),
    ),
  );
  const [slot, setSlot] = useState<MealSlot>(entry.mealSlot);
  const update = useUpdateEntry(date);
  const remove = useDeleteEntry(date);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const original = isFood ? entry.quantityG : entry.servings;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const changedAmount = value !== original;
    update.mutate(
      {
        id: entry.id,
        patch: {
          ...(slot !== entry.mealSlot ? { mealSlot: slot } : {}),
          ...(changedAmount
            ? isFood
              ? { quantityG: value, portionLabel: null }
              : { servings: value }
            : {}),
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {entry.name}
            </DialogTitle>
            <DialogDescription>
              {entry.portionLabel ?? (isFood ? "Weighed in grams" : "Recipe")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="entry-amount">
              {isFood ? "Amount (g)" : "Servings"}
            </Label>
            <Input
              id="entry-amount"
              inputMode="decimal"
              className="num"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              aria-invalid={!valid || undefined}
            />
          </div>
          <SlotPicker value={slot} onChange={setSlot} name="entry-slot" />
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                remove.mutate(entry);
                onClose();
              }}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
            <Button type="submit" disabled={!valid || update.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
