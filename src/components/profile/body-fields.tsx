"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Sex } from "@/lib/nutrition/targets";
import { SEX_CHOICES } from "@/lib/profile/options";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/profile/units";

import { ChoiceCards } from "./choice-cards";

export type BodyDraft = {
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  unitSystem: "metric" | "imperial";
};

const fmt = (n: number | null, digits = 1) =>
  n === null ? "" : String(Number(n.toFixed(digits)));

function parse(v: string): number | null {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** Sex, birth date, height and weight. Shows imperial inputs on request. */
export function BodyFields({
  value,
  onChange,
}: {
  value: BodyDraft;
  onChange: (next: BodyDraft) => void;
}) {
  const imperial = value.unitSystem === "imperial";
  const ftIn = value.heightCm ? cmToFtIn(value.heightCm) : null;
  // Keep what the user typed while it is mid-edit, e.g. "17".
  const [weightText, setWeightText] = useState(() =>
    fmt(
      value.weightKg === null
        ? null
        : imperial
          ? kgToLb(value.weightKg)
          : value.weightKg,
    ),
  );
  const [heightText, setHeightText] = useState(() => fmt(value.heightCm));
  const [feetText, setFeetText] = useState(() =>
    ftIn ? String(ftIn.feet) : "",
  );
  const [inchText, setInchText] = useState(() =>
    ftIn ? String(ftIn.inches) : "",
  );

  function switchUnits(next: "metric" | "imperial") {
    if (next === value.unitSystem) return;
    const w = value.weightKg;
    setWeightText(fmt(w === null ? null : next === "imperial" ? kgToLb(w) : w));
    setHeightText(fmt(value.heightCm));
    const fi = value.heightCm ? cmToFtIn(value.heightCm) : null;
    setFeetText(fi ? String(fi.feet) : "");
    setInchText(fi ? String(fi.inches) : "");
    onChange({ ...value, unitSystem: next });
  }

  function setFtIn(feet: string, inches: string) {
    setFeetText(feet);
    setInchText(inches);
    const f = parse(feet);
    const i = parse(inches) ?? 0;
    onChange({ ...value, heightCm: f === null ? null : ftInToCm(f, i) });
  }

  return (
    <div className="grid gap-6">
      <ChoiceCards
        legend="Sex"
        name="sex"
        choices={SEX_CHOICES}
        value={value.sex}
        onChange={(sex) => onChange({ ...value, sex })}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="birth-date">Birth date</Label>
        <Input
          id="birth-date"
          type="date"
          className="max-w-xs num"
          value={value.birthDate ?? ""}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) =>
            onChange({ ...value, birthDate: e.target.value || null })
          }
        />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Height and weight</span>
          <div
            role="radiogroup"
            aria-label="Units"
            className="flex rounded-lg bg-surface-2 p-0.5 text-xs"
          >
            {(["metric", "imperial"] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={value.unitSystem === u}
                onClick={() => switchUnits(u)}
                className={`rounded-md px-2.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${value.unitSystem === u ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border)]" : "text-ink-muted"}`}
              >
                {u === "metric" ? "kg, cm" : "lb, ft"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {imperial ? (
            <div className="grid gap-1.5">
              <span className="text-sm">Height</span>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label="Height, feet"
                  inputMode="numeric"
                  className="num"
                  placeholder="ft"
                  value={feetText}
                  onChange={(e) => setFtIn(e.target.value, inchText)}
                />
                <Input
                  aria-label="Height, inches"
                  inputMode="decimal"
                  className="num"
                  placeholder="in"
                  value={inchText}
                  onChange={(e) => setFtIn(feetText, e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="height-cm">Height (cm)</Label>
              <Input
                id="height-cm"
                inputMode="decimal"
                className="num"
                value={heightText}
                onChange={(e) => {
                  setHeightText(e.target.value);
                  onChange({ ...value, heightCm: parse(e.target.value) });
                }}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="weight">Weight ({imperial ? "lb" : "kg"})</Label>
            <Input
              id="weight"
              inputMode="decimal"
              className="num"
              value={weightText}
              onChange={(e) => {
                setWeightText(e.target.value);
                const n = parse(e.target.value);
                onChange({
                  ...value,
                  weightKg: n === null ? null : imperial ? lbToKg(n) : n,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
