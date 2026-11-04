"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { LogMealInput } from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import { SLOT_LABELS } from "@/lib/diary/slots";
import type { MealDTO } from "@/lib/meals/types";

import { invalidateDay, keys } from "./use-diary";

export function useMeals() {
  return useQuery({ queryKey: keys.meals, queryFn: api.meals });
}

/** Log a saved meal, with an Undo that removes every entry it added. */
export function useLogMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meal, input }: { meal: MealDTO; input: LogMealInput }) =>
      api.logMeal(meal.id, input),
    onSuccess: ({ ids }, { meal, input }) => {
      toast.success(`Logged to ${SLOT_LABELS[input.mealSlot].toLowerCase()}`, {
        description: `${meal.name}: ${ids.length} ${ids.length === 1 ? "item" : "items"}`,
        action: {
          label: "Undo",
          onClick: () => {
            void Promise.all(ids.map((id) => api.deleteEntry(id)))
              .then(() => invalidateDay(qc, input.date))
              .catch((err: Error) => toast.error(err.message));
          },
        },
      });
    },
    onError: (err) => toast.error(err.message),
    onSettled: (_d, _e, { input }) => invalidateDay(qc, input.date),
  });
}
