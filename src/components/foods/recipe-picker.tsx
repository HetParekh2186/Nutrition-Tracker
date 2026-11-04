"use client";

import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/client/api";
import { formatAmount } from "@/lib/nutrition/format";
import type { RecipeSummaryDTO } from "@/lib/recipes/types";

/** Search dialog that returns one recipe: yours first, then the library. */
export function RecipePicker({
  onPick,
  onClose,
}: {
  onPick: (recipe: RecipeSummaryDTO) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);
  const { data, isFetching } = useQuery({
    queryKey: ["recipes", { query: q }],
    queryFn: () => api.recipes({ query: q }),
    placeholderData: (prev) => prev,
  });
  const recipes = data ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Add a recipe</DialogTitle>
        <DialogDescription className="sr-only">
          Search your recipes and the starter library, then pick one.
        </DialogDescription>
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search aria-hidden className="size-4 text-ink-muted" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search recipes"
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-ink-muted"
            />
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            {recipes.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">
                {isFetching ? "Searching" : "No recipes match."}
              </p>
            ) : null}
            {recipes.map((r) => (
              <Command.Item
                key={r.id}
                value={r.id}
                onSelect={() => onPick(r)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-surface-2"
              >
                <span className="min-w-0 truncate">{r.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="num text-xs text-ink-muted">
                    {formatAmount(r.perServing.kcal, "kcal")} kcal
                  </span>
                  {r.isOwn ? <Badge variant="secondary">Yours</Badge> : null}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
