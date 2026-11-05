"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomFoodRequest } from "@/lib/api/schemas";
import { api } from "@/lib/client/api";
import type { FoodHit } from "@/lib/foods/types";

const NUMBER_FIELDS = [
  { name: "kcal", label: "Calories", unit: "kcal", required: true },
  { name: "proteinG", label: "Protein", unit: "g", required: true },
  { name: "carbsG", label: "Carbs", unit: "g", required: true },
  { name: "fatG", label: "Fat", unit: "g", required: true },
  { name: "fiberG", label: "Fiber", unit: "g", required: false },
  { name: "sodiumMg", label: "Sodium", unit: "mg", required: false },
] as const;

function optionalNumber(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : Number(s);
}

/** Create a food from a nutrition label (values per serving). */
export function CustomFoodForm({
  onBack,
  onCreated,
  backLabel = "Back to search",
  barcode,
}: {
  onBack: () => void;
  onCreated: (hit: FoodHit) => void;
  backLabel?: string;
  /** Saved with the food so scanning this package finds it next time. */
  barcode?: string | undefined;
}) {
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({ mutationFn: api.createFood });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = CustomFoodRequest.safeParse({
      name: form.get("name"),
      brand: String(form.get("brand") ?? "").trim() || undefined,
      servingLabel: form.get("servingLabel"),
      servingGrams: optionalNumber(form.get("servingGrams")),
      ...Object.fromEntries(
        NUMBER_FIELDS.map((f) => [f.name, optionalNumber(form.get(f.name))]),
      ),
      barcode,
    });
    if (!parsed.success) {
      setError(
        "Check the highlighted values: a name, serving size and the four main values are needed.",
      );
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: (food) =>
        onCreated({
          id: food.id,
          name: food.name,
          brand: food.brand,
          source: food.source,
          per100g: food.per100g,
          defaultPortion: food.portions[0]
            ? { label: food.portions[0].label, grams: food.portions[0].grams }
            : null,
          lastUsed: null,
          uses: 0,
        }),
      onError: (err) => setError(err.message),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid max-h-[80dvh] gap-4 overflow-y-auto p-4"
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft />
        </Button>
        <div>
          <p className="font-display text-lg">Custom food</p>
          <p className="text-xs text-ink-muted">
            Copy the values from the label, per serving.
          </p>
          {barcode ? (
            <p className="text-xs text-ink-muted">
              Barcode <span className="num">{barcode}</span> will be saved with
              it.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cf-name">Name</Label>
          <Input id="cf-name" name="name" required autoFocus maxLength={120} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cf-brand">Brand (optional)</Label>
          <Input id="cf-brand" name="brand" maxLength={80} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cf-serving">Serving</Label>
            <Input
              id="cf-serving"
              name="servingLabel"
              required
              defaultValue="1 serving"
              maxLength={60}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cf-grams">Grams</Label>
            <Input
              id="cf-grams"
              name="servingGrams"
              inputMode="decimal"
              required
              className="num"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NUMBER_FIELDS.map((f) => (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={`cf-${f.name}`}>
              {f.label}{" "}
              <span className="text-ink-muted">
                ({f.unit}
                {f.required ? "" : ", optional"})
              </span>
            </Label>
            <Input
              id={`cf-${f.name}`}
              name={f.name}
              inputMode="decimal"
              required={f.required}
              className="num"
            />
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-over">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={create.isPending}>
        {create.isPending ? "Saving" : "Save and choose amount"}
      </Button>
    </form>
  );
}
