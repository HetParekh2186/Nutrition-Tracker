"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { useQuickLog } from "@/components/log/quick-log-provider";
import { MacroLine } from "@/components/nutrition/macro-chip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys } from "@/hooks/use-diary";
import { api } from "@/lib/client/api";
import { defaultAmount } from "@/lib/foods/preview";
import type { MyFoodDTO, MyFoodsSort } from "@/lib/foods/types";
import { cn } from "@/lib/utils";

import { CreateFoodButton } from "./food-actions";

type Filter = "all" | "custom";

const SORTS: { value: MyFoodsSort; label: string }[] = [
  { value: "recent", label: "Recently logged" },
  { value: "frequent", label: "Most logged" },
  { value: "name", label: "A to Z" },
];

const SOURCE: Record<MyFoodDTO["source"], string> = {
  usda_foundation: "USDA",
  usda_sr_legacy: "USDA",
  usda_branded: "USDA",
  off: "OFF",
  custom: "Custom",
};

const DAY = 86_400_000;

/** "today", "yesterday", "5 days ago", else a short date. */
function ago(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function usage(food: MyFoodDTO, now: number): string {
  if (!food.uses || !food.lastLoggedAt) return "Not logged yet";
  const times = food.uses === 1 ? "once" : `${food.uses} times`;
  return `Logged ${times}, last ${ago(food.lastLoggedAt, now)}`;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Every food the user has logged or created; tap one to log it again. */
export function MyFoodsView({ initialFilter }: { initialFilter: Filter }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [sort, setSort] = useState<MyFoodsSort>("recent");
  const q = useDebounced(query.trim(), 150);
  const { open } = useQuickLog();
  const [now] = useState(() => Date.now());

  const { data, isFetching, isPending } = useQuery({
    queryKey: [...keys.myFoods, { q, filter, sort }],
    queryFn: () => api.myFoods({ q, filter, sort }),
    placeholderData: (prev) => prev,
  });
  const foods = data ?? [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:flex sm:items-end sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search my foods"
            aria-label="Search my foods"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Show" className="flex gap-1.5">
            {(["all", "custom"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  filter === f
                    ? "border-ink bg-surface text-ink"
                    : "border-border text-ink-muted hover:text-ink",
                )}
              >
                {f === "all" ? "All" : "Custom"}
              </button>
            ))}
          </div>
          <Label htmlFor="my-foods-sort" className="sr-only">
            Sort
          </Label>
          <select
            id="my-foods-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as MyFoodsSort)}
            className="h-8 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <CreateFoodButton />
        </div>
      </div>

      <p
        role="status"
        className="flex items-center gap-2 text-xs text-ink-muted"
      >
        {isPending ? (
          "Loading"
        ) : (
          <>
            {foods.length === 500 ? "500+" : foods.length}{" "}
            {foods.length === 1 ? "food" : "foods"}
            {isFetching ? (
              <Loader2 aria-label="Updating" className="size-3 animate-spin" />
            ) : null}
          </>
        )}
      </p>

      {!isPending && foods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          {q
            ? `Nothing in your foods matches "${q}".`
            : filter === "custom"
              ? "No custom foods yet. Create one from a nutrition label."
              : "Foods you log or create will be saved here."}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {foods.map((food) => {
            const preview = defaultAmount(food);
            return (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() =>
                    open({
                      step: {
                        kind: "amount",
                        hit: food,
                        loggedVia: food.uses ? "recent" : "search",
                      },
                    })
                  }
                  aria-label={`Log ${food.name}`}
                  className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors outline-none hover:bg-surface-2 focus-visible:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm">{food.name}</span>
                      <Badge
                        variant={food.isCustom ? "secondary" : "outline"}
                        className="shrink-0"
                      >
                        {SOURCE[food.source]}
                      </Badge>
                    </span>
                    <span className="truncate text-xs text-ink-muted">
                      {food.brand ? `${food.brand} · ` : ""}
                      {usage(food, now)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-ink-muted">
                      {preview.label}
                    </span>
                    <MacroLine macros={preview.macros} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
