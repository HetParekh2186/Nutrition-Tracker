"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Camera, Loader2, ScanBarcode } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/api";
import type { FoodHit } from "@/lib/foods/types";

import {
  cameraAvailable,
  CameraScanner,
  type CameraProblem,
} from "./camera-scanner";

const PROBLEM_TEXT: Record<CameraProblem, string> = {
  unsupported:
    "This browser cannot open the camera here. Type the digits instead.",
  denied:
    "Camera access is blocked. Allow it for this site in your browser settings, or type the digits.",
  "no-camera": "No camera was found. Type the digits instead.",
  failed: "The camera could not start. Type the digits instead.",
};

/**
 * Scan a barcode with the camera, or type the digits under it; Open Food
 * Facts fills in the rest. Phones open the camera straight away.
 */
export function BarcodeStep({
  initialCode,
  autoScan = false,
  onBack,
  onFound,
}: {
  initialCode: string;
  autoScan?: boolean;
  onBack: () => void;
  onFound: (hit: FoodHit) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [canScan] = useState(cameraAvailable);
  const [scanning, setScanning] = useState(
    () => autoScan && !initialCode && cameraAvailable(),
  );
  const [problem, setProblem] = useState<CameraProblem | null>(null);
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
      {scanning ? (
        <CameraScanner
          onDetected={(scanned) => {
            setScanning(false);
            setCode(scanned);
            lookup.mutate(scanned);
          }}
          onProblem={(p) => {
            setScanning(false);
            setProblem(p);
          }}
        />
      ) : canScan ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setProblem(null);
            lookup.reset();
            setScanning(true);
          }}
        >
          <Camera aria-hidden />
          {code ? "Scan again" : "Scan with camera"}
        </Button>
      ) : null}
      {problem ? (
        <p role="alert" className="text-sm text-ink-muted">
          {PROBLEM_TEXT[problem]}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="barcode">Digits under the barcode</Label>
        <Input
          id="barcode"
          // Focusing would raise the keyboard over the viewfinder.
          autoFocus={!scanning}
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
