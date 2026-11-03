"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ScanBarcode } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/api";
import type { FoodHit } from "@/lib/foods/types";

/** Type the digits under a barcode; Open Food Facts fills in the rest. */
export function BarcodeStep({
  initialCode,
  onBack,
  onFound,
}: {
  initialCode: string;
  onBack: () => void;
  onFound: (hit: FoodHit) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const lookup = useMutation({
    mutationFn: (c: string) => api.barcode(c),
    onSuccess: onFound,
  });
  const digits = code.replace(/[\s-]/g, "");
  const valid = /^\d{8,14}$/.test(digits);

  return (
    <form
      className="grid gap-5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) lookup.mutate(digits);
      }}
    >
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
          <p className="font-display text-lg leading-snug">Barcode</p>
          <p className="text-xs text-ink-muted">
            Packaged foods come from Open Food Facts, which lists fewer vitamins
            and minerals than USDA.
          </p>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="barcode">Digits under the barcode</Label>
        <Input
          id="barcode"
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          className="num"
          placeholder="3017620422003"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={(code.length > 0 && !valid) || undefined}
          aria-describedby="barcode-help"
        />
        <p id="barcode-help" className="text-xs text-ink-muted">
          8 to 14 digits, usually 13 on EAN or 12 on UPC labels.
        </p>
      </div>
      {lookup.isError ? (
        <p role="alert" className="text-sm text-over">
          {lookup.error.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!valid || lookup.isPending}>
        {lookup.isPending ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <ScanBarcode aria-hidden />
        )}
        {lookup.isPending ? "Looking up" : "Look up"}
      </Button>
    </form>
  );
}
