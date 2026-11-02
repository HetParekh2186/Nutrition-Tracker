"use client";

import { motion, useReducedMotion } from "motion/react";

import { formatAmount } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/macros";
import { fractionOf } from "@/lib/nutrition/status";
import { FADE, SPRING } from "@/lib/motion";

import { AnimatedNumber } from "./animated-number";
import { MACRO_META } from "./macro-chip";

const SIZE = 360;
const C = SIZE / 2;

type Arc = {
  key: string;
  label: string;
  color: string;
  radius: number;
  width: number;
  consumed: number;
  target: number;
  remaining: number;
  unit: "kcal" | "g";
};

function RingArc({ arc }: { arc: Arc }) {
  const reduce = useReducedMotion();
  const fraction = fractionOf(arc.consumed, arc.target);
  const over = fraction > 1;
  return (
    <g transform={`rotate(-90 ${C} ${C})`}>
      <circle
        cx={C}
        cy={C}
        r={arc.radius}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={arc.width}
      />
      <motion.circle
        cx={C}
        cy={C}
        r={arc.radius}
        fill="none"
        stroke={over ? "var(--over)" : arc.color}
        strokeWidth={arc.width}
        strokeLinecap="round"
        initial={false}
        animate={{
          pathLength: Math.min(fraction, 1),
          opacity: fraction > 0 ? 1 : 0,
        }}
        transition={reduce ? FADE : SPRING}
      />
    </g>
  );
}

/**
 * Concentric arcs: calories outside, protein, carbs and fat inside. The
 * centre shows kcal remaining. A legend beside it gives every arc a label
 * and a value, so colour is never the only signal.
 */
export function DayRing({
  consumed,
  target,
  remaining,
}: {
  consumed: Macros;
  target: Macros;
  remaining: Macros;
}) {
  const arcs: Arc[] = [
    {
      key: "kcal",
      label: "Calories",
      color: "var(--ink)",
      radius: 166,
      width: 18,
      consumed: consumed.kcal,
      target: target.kcal,
      remaining: remaining.kcal,
      unit: "kcal",
    },
    {
      key: "protein",
      label: MACRO_META.protein.label,
      color: MACRO_META.protein.color,
      radius: 143,
      width: 11,
      consumed: consumed.proteinG,
      target: target.proteinG,
      remaining: remaining.proteinG,
      unit: "g",
    },
    {
      key: "carbs",
      label: MACRO_META.carbs.label,
      color: MACRO_META.carbs.color,
      radius: 127,
      width: 11,
      consumed: consumed.carbsG,
      target: target.carbsG,
      remaining: remaining.carbsG,
      unit: "g",
    },
    {
      key: "fat",
      label: MACRO_META.fat.label,
      color: MACRO_META.fat.color,
      radius: 111,
      width: 11,
      consumed: consumed.fatG,
      target: target.fatG,
      remaining: remaining.fatG,
      unit: "g",
    },
  ];

  const kcalLeft = remaining.kcal;
  const over = kcalLeft < 0;

  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
      <figure
        className="relative aspect-square w-full max-w-[22.5rem] shrink-0"
        aria-label={`${formatAmount(Math.abs(kcalLeft), "kcal")} kcal ${over ? "over" : "remaining"}`}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden>
          {arcs.map((arc) => (
            <RingArc key={arc.key} arc={arc} />
          ))}
        </svg>
        <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={formatAmount(Math.abs(kcalLeft), "kcal")}
            className={`text-[clamp(2.75rem,13vw,4rem)] tracking-tight ${over ? "text-over" : "text-ink"}`}
          />
          <span className="mt-2 text-sm text-ink-muted">
            {over ? "kcal over" : "kcal remaining"}
          </span>
        </figcaption>
      </figure>

      <dl className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-1">
        {arcs.map((arc) => {
          const left = arc.remaining;
          return (
            <div key={arc.key} className="grid gap-1">
              <dt className="flex items-center gap-2 text-sm text-ink-muted">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: arc.color }}
                />
                {arc.label}
              </dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="num text-lg">
                  {formatAmount(arc.consumed, arc.unit)}
                </span>
                <span className="num text-sm text-ink-muted">
                  / {formatAmount(arc.target, arc.unit)} {arc.unit}
                </span>
              </dd>
              <dd
                className={`num text-xs ${left < 0 ? "text-over" : "text-ink-muted"}`}
              >
                {left < 0
                  ? `over by ${formatAmount(-left, arc.unit)} ${arc.unit}`
                  : `${formatAmount(left, arc.unit)} ${arc.unit} left`}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
