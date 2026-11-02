"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { FADE, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function DigitColumn({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={false}
        animate={{ y: `${-digit}em` }}
        transition={SPRING}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * A formatted number whose digits roll when it changes. Screen readers get
 * the plain text; the animated columns are hidden from them.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  /** Already formatted, e.g. "1,284". */
  value: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const chars = [...value];

  if (reduce) {
    return (
      <span className={cn("relative inline-grid num", className)}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex num leading-none", className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((ch, i) => {
          // Key from the right so units, tens and hundreds keep their column
          // when the number gains or loses a digit.
          const key = chars.length - i;
          return /\d/.test(ch) ? (
            <DigitColumn key={key} digit={Number(ch)} />
          ) : (
            <span key={`${key}${ch}`} className="inline-block leading-none">
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}
