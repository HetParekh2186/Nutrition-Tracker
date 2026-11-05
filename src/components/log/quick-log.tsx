"use client";

import { useQuery } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  ArrowLeft,
  Loader2,
  MessageSquareText,
  ScanBarcode,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";

import { MacroLine } from "@/components/nutrition/macro-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys, useAddEntry } from "@/hooks/use-diary";
import { DESKTOP, useMediaQuery } from "@/hooks/use-media-query";
import { useMeals } from "@/hooks/use-meals";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";
import { SLOT_LABELS } from "@/lib/diary/slots";
import { cn } from "@/lib/utils";
import { defaultAmount, macrosForGrams } from "@/lib/foods/preview";
import type { FoodHit } from "@/lib/foods/types";
import type { MealDTO } from "@/lib/meals/types";
import {
  defaultSlotForHour,
  gramsFor,
  portionLabelFor,
  portionOptions,
  type PortionOption,
} from "@/lib/foods/units";

import { BarcodeStep } from "./barcode-step";
import { CustomFoodForm } from "./custom-food-form";
import { DescribeStep } from "./describe-step";
import { MealStep } from "./meal-step";
import { SlotPicker } from "./slot-picker";

const SOURCE_LABEL: Record<FoodHit["source"], string> = {
  usda_foundation: "USDA",
  usda_sr_legacy: "USDA",
  usda_branded: "USDA",
  off: "OFF",
  custom: "Custom",
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export type Step =
  | { kind: "search" }
  | { kind: "meal"; meal: MealDTO }
  | { kind: "amount"; hit: FoodHit; loggedVia: "search" | "recent" }
  | { kind: "custom"; barcode?: string }
  | { kind: "describe"; text: string }
  | { kind: "barcode"; code: string };

function FoodRow({ hit }: { hit: FoodHit }) {
  const preview = defaultAmount(hit);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm">{hit.name}</span>
        <Badge variant={hit.source === "custom" ? "secondary" : "outline"}>
          {SOURCE_LABEL[hit.source]}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-ink-muted">{preview.label}</span>
        <MacroLine macros={preview.macros} />
      </div>
    </div>
  );
}

/** Looks like a sentence rather than a food name: "2 eggs and toast". */
function looksDescribed(q: string): boolean {
  return (
    /\d/.test(q) || /\b(and|with)\b|,/.test(q) || q.split(/\s+/).length >= 4
  );
}

function SearchStep({
  onPick,
  onMeal,
  onCustom,
  onDescribe,
  onBarcode,
}: {
  onPick: (hit: FoodHit, via: "search" | "recent") => void;
  onMeal: (meal: MealDTO) => void;
  onCustom: () => void;
  onDescribe: (text: string) => void;
  onBarcode: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 120);
  const { data, isFetching } = useQuery({
    queryKey: keys.search(q),
    queryFn: ({ signal }) => api.searchFoods(q, signal),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
  const showingStale = data?.query !== q;
  // Saved meals are few, so they are matched here rather than on the server.
  const { data: allMeals } = useMeals();
  const meals = (allMeals ?? [])
    .filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, q ? 5 : 3);
  const isBarcode = /^\d{8,14}$/.test(q.replace(/[\s-]/g, ""));

  const groups: {
    heading: string;
    hits: FoodHit[];
    via: "search" | "recent";
  }[] = q
    ? [
        {
          heading: "Foods",
          hits: showingStale ? [] : (data?.results ?? []),
          via: "search",
        },
      ]
    : [
        { heading: "Recent", hits: data?.recent ?? [], via: "recent" },
        {
          heading: "Frequent",
          hits: (data?.frequent ?? []).filter(
            (f) => !data?.recent.some((r) => r.id === f.id),
          ),
          via: "recent",
        },
      ];

  return (
    <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search aria-hidden className="size-4 shrink-0 text-ink-muted" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search foods: chicken breast, oats, banana"
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-ink-muted"
        />
        {isFetching ? (
          <Loader2
            aria-label="Searching"
            className="size-4 animate-spin text-ink-muted"
          />
        ) : null}
        {/* Phones scan more than they type barcodes: one tap to the camera. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onBarcode("")}
          aria-label="Scan a barcode"
          className="-mr-2 shrink-0 md:hidden"
        >
          <ScanBarcode aria-hidden />
        </Button>
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 md:max-h-[min(60vh,28rem)]">
        {/* The custom-food row is always present, so cmdk's Empty never
            shows; report search state explicitly instead. */}
        {groups.every((g) => g.hits.length === 0) && meals.length === 0 ? (
          <p
            role="status"
            className="px-3 py-6 text-center text-sm text-ink-muted"
          >
            {q
              ? isFetching || showingStale
                ? "Searching"
                : `No foods match "${q}".`
              : "Foods you log will show up here."}
          </p>
        ) : null}
        {meals.length ? (
          <Command.Group
            heading="Saved meals"
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-muted"
          >
            {meals.map((meal) => (
              <Command.Item
                key={meal.id}
                value={`meal-${meal.id}`}
                onSelect={() => onMeal(meal)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-surface-2"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">{meal.name}</span>
                    <Badge variant="secondary">Meal</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-ink-muted">
                      {meal.items.length}{" "}
                      {meal.items.length === 1 ? "item" : "items"}
                    </span>
                    <MacroLine macros={meal.macros} />
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {groups.map((group) =>
          group.hits.length ? (
            <Command.Group
              key={group.heading}
              heading={group.heading}
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-ink-muted"
            >
              {group.hits.map((hit) => (
                <Command.Item
                  key={`${group.heading}-${hit.id}`}
                  value={`${group.heading}-${hit.id}`}
                  onSelect={() => onPick(hit, group.via)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-surface-2"
                >
                  <FoodRow hit={hit} />
                </Command.Item>
              ))}
            </Command.Group>
          ) : null,
        )}
        <Command.Group>
          <Command.Item
            value="describe-meal"
            onSelect={() => onDescribe(query.trim())}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink",
              q && !isBarcode && looksDescribed(q) && "text-ink",
            )}
          >
            <MessageSquareText aria-hidden className="size-4" />
            {q && !isBarcode && looksDescribed(q) ? (
              <span className="min-w-0 truncate">
                Log &ldquo;{q}&rdquo; in plain English
              </span>
            ) : (
              "Describe a meal in plain English"
            )}
          </Command.Item>
          <Command.Item
            value="barcode"
            onSelect={() => onBarcode(isBarcode ? q : "")}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink",
              isBarcode && "text-ink",
            )}
          >
            <ScanBarcode aria-hidden className="size-4" />
            {isBarcode ? `Look up barcode ${q}` : "Scan or type a barcode"}
          </Command.Item>
          <Command.Item
            value="create-custom-food"
            onSelect={onCustom}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-muted data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink"
          >
            <Plus aria-hidden className="size-4" />
            Create a custom food
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command>
  );
}

function AmountStep({
  hit,
  loggedVia,
  date,
  initialSlot,
  openedAt,
  onBack,
  onDone,
}: {
  hit: FoodHit;
  loggedVia: "search" | "recent";
  date: string;
  initialSlot: MealSlot;
  openedAt: number;
  onBack: () => void;
  onDone: () => void;
}) {
  const detail = useQuery({
    queryKey: keys.food(hit.id),
    queryFn: () => api.food(hit.id),
    staleTime: 5 * 60_000,
  });
  // Until the full portion list loads, offer the result's default portion
  // so the starting amount ("1 large") is right from the first frame.
  const options = useMemo(
    () =>
      portionOptions(
        detail.data?.portions ??
          (hit.defaultPortion ? [hit.defaultPortion] : []),
      ),
    [detail.data, hit.defaultPortion],
  );

  // Start from the default amount: last used, else first portion, else 100 g.
  const start = defaultAmount(hit);
  const [quantity, setQuantity] = useState<string>(() =>
    hit.lastUsed || !hit.defaultPortion
      ? String(Number(start.grams.toFixed(1)))
      : "1",
  );
  const [unitKey, setUnitKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const inputRef = useRef<HTMLInputElement>(null);

  // Once portions load, select the first one for a new food, else grams.
  const unit: PortionOption =
    options.find((o) => o.key === unitKey) ??
    (!hit.lastUsed && hit.defaultPortion ? options[0] : undefined) ??
    options.find((o) => o.key === "g")!;

  const qty = Number(quantity);
  const valid = Number.isFinite(qty) && qty > 0;
  const grams = valid ? gramsFor(qty, unit) : 0;
  const per100g = detail.data?.per100g ?? hit.per100g;
  const { energyEstimated, ...macros } = macrosForGrams(per100g, grams);

  const add = useAddEntry();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      inputRef.current?.focus();
      return;
    }
    const portionLabel = portionLabelFor(qty, unit);
    add.mutate({
      input: {
        date,
        mealSlot: slot,
        loggedVia,
        ...(openedAt ? { logMs: Date.now() - openedAt } : {}),
        item: {
          kind: "food",
          foodId: hit.id,
          quantityG: grams,
          portionLabel,
        },
      },
      preview: { name: hit.name, brand: hit.brand, macros },
      notify: {
        title: `Logged to ${SLOT_LABELS[slot].toLowerCase()}`,
        description: hit.name,
      },
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 p-4">
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
          <p className="font-display text-lg leading-snug">{hit.name}</p>
          <p className="text-xs text-ink-muted">
            {SOURCE_LABEL[hit.source]}
            {hit.brand ? ` · ${hit.brand}` : ""}
            {energyEstimated ? " · energy estimated from macros" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ql-qty">Amount</Label>
          <Input
            id="ql-qty"
            ref={inputRef}
            autoFocus
            inputMode="decimal"
            className="num"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            aria-invalid={!valid || undefined}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ql-unit">Unit</Label>
          <select
            id="ql-unit"
            value={unit.key}
            onChange={(e) => {
              const next = options.find((o) => o.key === e.target.value);
              if (!next) return;
              // Keep the same weight when switching units.
              if (valid)
                setQuantity(String(Number((grams / next.grams).toFixed(2))));
              setUnitKey(next.key);
            }}
            className="h-8 min-w-0 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.key === "g" || o.key === "oz"
                  ? o.label
                  : `${o.label} (${Number(o.grams.toFixed(1))} g)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SlotPicker value={slot} onChange={setSlot} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
        <span className="num text-xs text-ink-muted">
          {Number(grams.toFixed(1))} g
        </span>
        <MacroLine macros={macros} />
      </div>

      <Button type="submit" size="lg" disabled={!valid}>
        Log to {SLOT_LABELS[slot].toLowerCase()}
        <kbd className="ml-2 num text-xs opacity-70">Enter</kbd>
      </Button>
    </form>
  );
}

function Panel({
  date,
  initialSlot,
  initialStep,
  openedAt,
  onDone,
}: {
  date: string;
  initialSlot: MealSlot;
  initialStep?: Step | undefined;
  /** Epoch ms the palette opened, to measure how long logging takes. */
  openedAt: number;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>(initialStep ?? { kind: "search" });
  const desktop = useMediaQuery(DESKTOP);

  if (step.kind === "meal") {
    return (
      <MealStep
        meal={step.meal}
        date={date}
        initialSlot={initialSlot}
        onBack={() => setStep({ kind: "search" })}
        onDone={onDone}
      />
    );
  }
  if (step.kind === "amount") {
    return (
      <AmountStep
        hit={step.hit}
        loggedVia={step.loggedVia}
        date={date}
        initialSlot={initialSlot}
        openedAt={openedAt}
        onBack={() => setStep({ kind: "search" })}
        onDone={onDone}
      />
    );
  }
  if (step.kind === "describe") {
    return (
      <DescribeStep
        initialText={step.text}
        date={date}
        initialSlot={initialSlot}
        openedAt={openedAt}
        onBack={() => setStep({ kind: "search" })}
        onDone={onDone}
      />
    );
  }
  if (step.kind === "barcode") {
    return (
      <BarcodeStep
        initialCode={step.code}
        autoScan={!desktop}
        onBack={() => setStep({ kind: "search" })}
        onFound={(hit) => setStep({ kind: "amount", hit, loggedVia: "search" })}
        onCreateCustom={(barcode) => setStep({ kind: "custom", barcode })}
      />
    );
  }
  if (step.kind === "custom") {
    const { barcode } = step;
    return (
      <CustomFoodForm
        barcode={barcode}
        backLabel={barcode ? "Back to barcode" : "Back to search"}
        onBack={() =>
          setStep(
            barcode ? { kind: "barcode", code: barcode } : { kind: "search" },
          )
        }
        onCreated={(hit) =>
          setStep({ kind: "amount", hit, loggedVia: "search" })
        }
      />
    );
  }
  return (
    <SearchStep
      onPick={(hit, loggedVia) => setStep({ kind: "amount", hit, loggedVia })}
      onMeal={(meal) => setStep({ kind: "meal", meal })}
      onCustom={() => setStep({ kind: "custom" })}
      onDescribe={(text) => setStep({ kind: "describe", text })}
      onBarcode={(code) => setStep({ kind: "barcode", code })}
    />
  );
}

/**
 * The Quick Log palette: a dialog on desktop (Cmd+K), a bottom sheet on
 * phones. Search, pick an amount, Enter logs it.
 */
export function QuickLog({
  open,
  onOpenChange,
  date,
  initialSlot,
  initialStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  initialSlot?: MealSlot | undefined;
  /** Open straight on a food's amount or a saved meal, not the search. */
  initialStep?: Step | undefined;
}) {
  const desktop = useMediaQuery(DESKTOP);
  // Fresh state each time the palette opens.
  const [session, setSession] = useState(0);
  const [openedAt, setOpenedAt] = useState(0);
  useEffect(() => {
    if (!open) return;
    setSession((s) => s + 1);
    setOpenedAt(Date.now());
  }, [open]);
  const slot = initialSlot ?? defaultSlotForHour(new Date().getHours());
  const close = () => onOpenChange(false);
  const panel = (
    <Panel
      key={session}
      date={date}
      initialSlot={slot}
      initialStep={initialStep}
      openedAt={openedAt}
      onDone={close}
    />
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Log food</DialogTitle>
          <DialogDescription className="sr-only">
            Search for a food, choose an amount and press Enter to log it.
          </DialogDescription>
          {panel}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    // The sheet follows the visible area itself (see TrackVisibleViewport),
    // so vaul's own keyboard handling is off; the two would fight.
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content className="fixed inset-x-0 bottom-[var(--vv-bottom,0px)] z-50 flex max-h-[min(92dvh,calc(var(--vv-height,100dvh)-1rem))] flex-col rounded-t-xl border border-border bg-surface shadow-float outline-none">
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
          />
          <Drawer.Title className="sr-only">Log food</Drawer.Title>
          <Drawer.Description className="sr-only">
            Search for a food, choose an amount and log it.
          </Drawer.Description>
          <div className="flex min-h-[min(60dvh,calc(var(--vv-height,100dvh)-3rem))] flex-1 flex-col">
            {panel}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
