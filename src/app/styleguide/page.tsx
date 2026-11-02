import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FOOD_TOKENS,
  STATUS_TOKENS,
  SURFACE_TOKENS,
  TYPE_SCALE,
  type ColorToken,
} from "@/lib/design/tokens";

export const metadata: Metadata = {
  title: "Styleguide",
  description: "The Mise design system: tokens, type and components.",
};

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-6 border-b border-border pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="num text-xs tracking-widest text-ink-muted uppercase">
            Mise design system
          </p>
          <h1 className="mt-2 text-2xl">Kitchen notebook, lab instrument</h1>
          <p className="mt-3 text-ink-muted">
            Warm paper surfaces with precise, tabular numbers. One paprika
            accent per screen; every macro keeps its own colour everywhere it
            appears.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section
        title="Numbers are the hero"
        note="JetBrains Mono, tabular figures"
      >
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <div>
            <p className="num text-3xl">1,284</p>
            <p className="text-sm text-ink-muted">kcal remaining</p>
          </div>
          <MacroFigure label="Protein" value="52" tone="var(--protein)" />
          <MacroFigure label="Carbs" value="85" tone="var(--carbs)" />
          <MacroFigure label="Fat" value="22" tone="var(--fat)" />
          <MacroFigure label="Fiber" value="9.4" tone="var(--fiber)" />
        </div>
      </Section>

      <Section title="Paper and ink" note="Surfaces, text and the accent">
        <SwatchGrid tokens={SURFACE_TOKENS} />
      </Section>

      <Section
        title="Food colours"
        note="Fixed per macro: rings, bars, chips, charts"
      >
        <SwatchGrid tokens={FOOD_TOKENS} />
      </Section>

      <Section
        title="Target status"
        note="Always paired with a label and a value"
      >
        <SwatchGrid tokens={STATUS_TOKENS} />
      </Section>

      <Section title="Type" note="Fraunces for display, Inter for UI">
        <div className="grid gap-3 sm:grid-cols-3">
          <FontSample family="font-display" name="Fraunces" role="Display" />
          <FontSample family="font-sans" name="Inter" role="UI" />
          <FontSample family="num" name="JetBrains Mono" role="Numbers" />
        </div>
        <ol className="mt-8 divide-y divide-border border-y border-border">
          {TYPE_SCALE.map((step) => (
            <li
              key={step.px}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-4 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_16rem]"
            >
              <span className="num text-xs text-ink-muted">{step.px}px</span>
              <span className={`${step.className} truncate font-display`}>
                Everything in its place
              </span>
              <span className="col-start-2 text-sm text-ink-muted sm:col-start-auto">
                {step.use}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Controls" note="Radius 10px, focus ring in paprika">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Log food</Button>
          <Button variant="secondary">Copy yesterday</Button>
          <Button variant="outline">Edit</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete entry</Button>
          <Button variant="link">View source</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-6 grid max-w-md gap-2">
          <Label htmlFor="sg-amount">Amount (g)</Label>
          <Input
            id="sg-amount"
            inputMode="decimal"
            placeholder="180"
            className="num"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge>USDA</Badge>
          <Badge variant="secondary">Custom</Badge>
          <Badge variant="outline">Open Food Facts</Badge>
          <Badge variant="destructive">Over by 120 kcal</Badge>
        </div>
      </Section>

      <Section
        title="Surfaces"
        note="Cards radius 14px, 1px borders, no shadows"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chicken breast, cooked</CardTitle>
              <CardDescription>180 g · USDA SR Legacy</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2">
                <MacroStat label="Protein" value="55.8" tone="bg-protein" />
                <MacroStat label="Carbs" value="0" tone="bg-carbs" />
                <MacroStat label="Fat" value="6.5" tone="bg-fat" />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Floating layers</CardTitle>
              <CardDescription>
                Dialogs, the palette and sheets get the one soft shadow.
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t border-border bg-surface-2 py-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this entry?</DialogTitle>
                    <DialogDescription>
                      180 g chicken breast will be removed from lunch.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Keep it</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive">Delete</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border py-12 last:border-b-0">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">{title}</h2>
        <p className="text-sm text-ink-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function SwatchGrid({ tokens }: { tokens: ColorToken[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {tokens.map((token) => (
        <li key={token.name}>
          <div
            className="h-16 rounded-lg border border-border"
            style={{ backgroundColor: `var(--${token.name})` }}
          />
          <p className="mt-2 num text-sm">--{token.name}</p>
          <p className="num text-xs text-ink-muted">
            {token.light} / {token.dark}
          </p>
          <p className="text-xs text-ink-muted">{token.use}</p>
        </li>
      ))}
    </ul>
  );
}

function FontSample({
  family,
  name,
  role,
}: {
  family: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-ink-muted">{role}</p>
      <p className={`${family} mt-1 text-xl`}>Aa 0123</p>
      <p className="mt-1 text-sm">{name}</p>
    </div>
  );
}

function MacroFigure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="border-l-4 pl-3" style={{ borderColor: tone }}>
      <p className="num text-2xl">
        {value}
        <span className="text-lg text-ink-muted">g</span>
      </p>
      <p className="text-sm text-ink-muted">{label} left</p>
    </div>
  );
}

function MacroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
        <span aria-hidden className={`size-2 rounded-full ${tone}`} />
        {label}
      </dt>
      <dd className="mt-1 num text-lg">
        {value}
        <span className="text-xs text-ink-muted"> g</span>
      </dd>
    </div>
  );
}
