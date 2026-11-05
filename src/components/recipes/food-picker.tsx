"use client";

import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ScoreBadge } from "@/components/foods/mise-score";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/client/api";
import type { FoodHit } from "@/lib/foods/types";

/** Search dialog that returns one food, e.g. to match a recipe ingredient. */
export function FoodPicker({
  initialQuery,
  onPick,
  onClose,
}: {
  initialQuery: string;
  onPick: (food: FoodHit) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery.trim());
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);
  const { data, isFetching } = useQuery({
    queryKey: ["food-search", q],
    queryFn: ({ signal }) => api.searchFoods(q, signal),
    enabled: q.length > 1,
    placeholderData: (prev) => prev,
  });
  const hits = data?.query === q ? data.results : [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Match a food</DialogTitle>
        <DialogDescription className="sr-only">
          Search the USDA database and pick the food this ingredient is.
        </DialogDescription>
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search aria-hidden className="size-4 text-ink-muted" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search USDA foods"
              className="h-12 w-full bg-transparent outline-none placeholder:text-ink-muted"
            />
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            {hits.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">
                {q.length < 2
                  ? "Type a food name."
                  : isFetching
                    ? "Searching"
                    : "No foods match."}
              </p>
            ) : null}
            {hits.map((hit) => (
              <Command.Item
                key={hit.id}
                value={String(hit.id)}
                onSelect={() => onPick(hit)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-surface-2"
              >
                <span className="min-w-0 truncate">{hit.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <ScoreBadge score={hit.score} />
                  <Badge variant="outline">
                    {hit.source === "custom"
                      ? "Custom"
                      : hit.source === "off"
                        ? "OFF"
                        : "USDA"}
                  </Badge>
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
