"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CopyRequestInput,
  DiaryPatchInput,
  NewDiaryEntryInput,
} from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import type {
  DaySummaryDTO,
  DiaryDayDTO,
  DiaryEntryDTO,
} from "@/lib/diary/types";
import { addMacros, subtractMacros, type Macros } from "@/lib/nutrition/macros";

export const keys = {
  diary: (date: string) => ["diary", date] as const,
  summary: (date: string) => ["summary", date] as const,
  search: (q: string) => ["food-search", q] as const,
  food: (id: number) => ["food", id] as const,
};

export function useDiary(date: string) {
  return useQuery({
    queryKey: keys.diary(date),
    queryFn: () => api.diary(date),
  });
}

export function useDaySummary(date: string) {
  return useQuery({
    queryKey: keys.summary(date),
    queryFn: () => api.summary(date),
  });
}

function invalidateDay(qc: QueryClient, date: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.diary(date) }),
    qc.invalidateQueries({ queryKey: keys.summary(date) }),
    qc.invalidateQueries({ queryKey: ["food-search", ""] }),
  ]);
}

/** Shift the cached day summary by a macro delta so the ring moves now. */
function shiftSummary(qc: QueryClient, date: string, delta: Macros) {
  qc.setQueryData<DaySummaryDTO>(keys.summary(date), (s) => {
    if (!s) return s;
    const consumed = addMacros(s.consumed, delta);
    return {
      ...s,
      consumed,
      remaining: subtractMacros(s.target, consumed),
    };
  });
}

const NEGATE = (m: Macros): Macros =>
  subtractMacros({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }, m);

type Snapshot = {
  diary?: DiaryDayDTO | undefined;
  summary?: DaySummaryDTO | undefined;
};

function snapshot(qc: QueryClient, date: string): Snapshot {
  return {
    diary: qc.getQueryData(keys.diary(date)),
    summary: qc.getQueryData(keys.summary(date)),
  };
}

function restore(qc: QueryClient, date: string, snap: Snapshot | undefined) {
  if (!snap) return;
  qc.setQueryData(keys.diary(date), snap.diary);
  qc.setQueryData(keys.summary(date), snap.summary);
}

export type AddEntryVars = {
  input: NewDiaryEntryInput;
  /** Shown immediately while the server saves. */
  preview: { name: string; brand: string | null; macros: Macros };
  /**
   * Success toast with an Undo action. Lives on the mutation, not the call,
   * so it still shows after the dialog that logged it has closed.
   */
  notify?: { title: string; description?: string };
};

export function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input }: AddEntryVars) => api.addEntry(input),
    onMutate: async ({ input, preview }) => {
      const date = input.date;
      await qc.cancelQueries({ queryKey: keys.diary(date) });
      await qc.cancelQueries({ queryKey: keys.summary(date) });
      const snap = snapshot(qc, date);
      const temp: DiaryEntryDTO = {
        id: -Date.now(),
        entryDate: date,
        mealSlot: input.mealSlot,
        kind: input.item.kind,
        foodId: input.item.kind === "food" ? input.item.foodId : null,
        recipeId: input.item.kind === "recipe" ? input.item.recipeId : null,
        name: preview.name,
        brand: preview.brand,
        quantityG: input.item.kind === "food" ? input.item.quantityG : null,
        servings: input.item.kind === "recipe" ? input.item.servings : null,
        portionLabel:
          input.item.kind === "food" ? (input.item.portionLabel ?? null) : null,
        loggedVia: input.loggedVia ?? "search",
        createdAt: new Date().toISOString(),
        macros: preview.macros,
        energyEstimated: false,
      };
      qc.setQueryData<DiaryDayDTO>(keys.diary(date), (d) =>
        d
          ? {
              ...d,
              slots: {
                ...d.slots,
                [input.mealSlot]: [...d.slots[input.mealSlot], temp],
              },
            }
          : d,
      );
      shiftSummary(qc, date, preview.macros);
      return snap;
    },
    onSuccess: ({ id }, { input, notify }) => {
      if (!notify) return;
      toast.success(notify.title, {
        ...(notify.description ? { description: notify.description } : {}),
        action: {
          label: "Undo",
          onClick: () => {
            void api
              .deleteEntry(id)
              .then(() => invalidateDay(qc, input.date))
              .catch((err: Error) => toast.error(err.message));
          },
        },
      });
    },
    onError: (err, { input }, snap) => {
      restore(qc, input.date, snap);
      toast.error(err.message);
    },
    onSettled: (_data, _err, { input }) => invalidateDay(qc, input.date),
  });
}

export function useDeleteEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: DiaryEntryDTO) => api.deleteEntry(entry.id),
    onMutate: async (entry) => {
      await qc.cancelQueries({ queryKey: keys.diary(date) });
      const snap = snapshot(qc, date);
      qc.setQueryData<DiaryDayDTO>(keys.diary(date), (d) =>
        d
          ? {
              ...d,
              slots: {
                ...d.slots,
                [entry.mealSlot]: d.slots[entry.mealSlot].filter(
                  (e) => e.id !== entry.id,
                ),
              },
            }
          : d,
      );
      shiftSummary(qc, date, NEGATE(entry.macros));
      return snap;
    },
    onError: (err, _entry, snap) => {
      restore(qc, date, snap);
      toast.error(err.message);
    },
    onSettled: () => invalidateDay(qc, date),
  });
}

export function useUpdateEntry(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: DiaryPatchInput }) =>
      api.updateEntry(id, patch),
    onError: (err) => toast.error(err.message),
    onSettled: (_d, _e, { patch }) =>
      Promise.all([
        invalidateDay(qc, date),
        patch.date ? invalidateDay(qc, patch.date) : null,
      ]),
  });
}

export function useCopyEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyRequestInput) => api.copy(input),
    onSuccess: ({ copied }, input) => {
      toast.success(
        copied === 0
          ? "Nothing to copy"
          : `Copied ${copied} ${copied === 1 ? "item" : "items"}`,
      );
      return invalidateDay(qc, input.to);
    },
    onError: (err) => toast.error(err.message),
  });
}

export type SlotKey = MealSlot;
