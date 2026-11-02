"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TargetsUpdateInput } from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import type { NutrientCategory } from "@/lib/nutrition/catalog";
import { roundForDisplay } from "@/lib/nutrition/format";
import type { TargetRowDTO } from "@/lib/profile/types";

const GROUPS: { label: string; categories: NutrientCategory[] }[] = [
  { label: "Energy and macros", categories: ["energy", "macro"] },
  { label: "Vitamins", categories: ["vitamin"] },
  { label: "Minerals", categories: ["mineral"] },
  { label: "Lipids", categories: ["lipid"] },
  { label: "Amino acids", categories: ["amino_acid"] },
];

const SOURCE_LABEL = {
  computed: "From profile",
  default: "NIH default",
  user: "Edited",
} as const;

type Draft = Record<number, { min: string; max: string }>;

const show = (n: number | null, row: TargetRowDTO) =>
  n === null ? "" : String(roundForDisplay(n, row.unit));

function toNumber(s: string): number | null {
  const n = Number(s);
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** Every target, editable. Edits are kept when the profile changes. */
export function TargetsEditor({ initial }: { initial: TargetRowDTO[] }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Draft>({});

  const save = useMutation({
    mutationFn: (input: TargetsUpdateInput) => api.updateTargets(input),
    onSuccess: (next) => {
      setRows(next);
      setDraft({});
      void qc.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Targets saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const dirty = Object.keys(draft).length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const targets = Object.entries(draft).map(([id, d]) => ({
      nutrientId: Number(id),
      min: toNumber(d.min),
      max: toNumber(d.max),
    }));
    if (targets.length) save.mutate({ targets });
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      {GROUPS.map((group) => {
        const groupRows = rows.filter((r) =>
          group.categories.includes(r.category),
        );
        return (
          <fieldset key={group.label} className="grid gap-1">
            <legend className="mb-2 font-display text-lg">{group.label}</legend>
            <div
              aria-hidden
              className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_2rem] gap-2 px-1 text-xs text-ink-muted sm:grid-cols-[minmax(0,1fr)_7rem_6rem_6rem_2rem]"
            >
              <span>Nutrient</span>
              <span className="hidden sm:block">Source</span>
              <span>Min</span>
              <span>Max</span>
              <span />
            </div>
            {groupRows.map((row) => {
              const d = draft[row.nutrientId] ?? {
                min: show(row.min, row),
                max: show(row.max, row),
              };
              const set = (key: "min" | "max", v: string) =>
                setDraft({ ...draft, [row.nutrientId]: { ...d, [key]: v } });
              return (
                <div
                  key={row.nutrientId}
                  className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_2rem] items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_6rem_2rem]"
                >
                  <span className="truncate text-sm">
                    {row.name}{" "}
                    <span className="text-xs text-ink-muted">({row.unit})</span>
                  </span>
                  <span className="hidden sm:block">
                    <Badge
                      variant={row.source === "user" ? "default" : "outline"}
                    >
                      {SOURCE_LABEL[row.source]}
                    </Badge>
                  </span>
                  <Input
                    aria-label={`${row.name} minimum`}
                    inputMode="decimal"
                    className="h-7 num"
                    value={d.min}
                    onChange={(e) => set("min", e.target.value)}
                  />
                  <Input
                    aria-label={`${row.name} maximum`}
                    inputMode="decimal"
                    className="h-7 num"
                    value={d.max}
                    onChange={(e) => set("max", e.target.value)}
                  />
                  {row.source === "user" && row.computed ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Reset ${row.name} to ${show(row.computed.min ?? row.computed.max, row)}`}
                      title="Reset to the computed value"
                      onClick={() =>
                        save.mutate({
                          targets: [
                            { nutrientId: row.nutrientId, reset: true },
                          ],
                        })
                      }
                    >
                      <RotateCcw />
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </fieldset>
        );
      })}
      <div className="sticky bottom-20 flex justify-end md:bottom-4">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending ? "Saving" : "Save targets"}
        </Button>
      </div>
    </form>
  );
}
