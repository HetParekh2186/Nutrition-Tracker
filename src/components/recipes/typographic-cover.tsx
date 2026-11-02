import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Cuisine families share a tint from the food palette. */
function tintFor(cuisine: string | null): string {
  const c = (cuisine ?? "").toLowerCase();
  if (/indian|thai|mexican|caribbean/.test(c)) return "var(--carbs)";
  if (/italian|mediterranean|middle eastern|greek|spanish|french/.test(c))
    return "var(--fat)";
  if (/japanese|korean|chinese|vietnamese/.test(c)) return "var(--protein)";
  return "var(--fiber)";
}

/** Deterministic pseudo-random sequence from the recipe's cover seed. */
function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Pattern({ seed, color }: { seed: number; color: string }) {
  const rand = seeded(seed);
  const kind = seed % 4;
  const shapes: ReactNode[] = [];
  if (kind === 0) {
    // Dot grid
    for (let x = 0; x < 12; x++) {
      for (let y = 0; y < 9; y++) {
        shapes.push(
          <circle
            key={`${x}-${y}`}
            cx={x * 36 + 18}
            cy={y * 36 + 18}
            r={2 + rand() * 4}
          />,
        );
      }
    }
  } else if (kind === 1) {
    // Diagonal stripes
    for (let i = -10; i < 22; i++) {
      shapes.push(
        <rect
          key={i}
          x={i * 28}
          y={-50}
          width={8 + rand() * 8}
          height={420}
          transform={`rotate(35 ${i * 28} 150)`}
        />,
      );
    }
  } else if (kind === 2) {
    // Concentric arcs from a corner
    const cx = rand() > 0.5 ? 400 : 0;
    for (let r = 30; r < 520; r += 34) {
      shapes.push(
        <circle
          key={r}
          cx={cx}
          cy={300}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6 + rand() * 6}
        />,
      );
    }
  } else {
    // Wave lines
    for (let i = 0; i < 9; i++) {
      const y = 20 + i * 34;
      const a = 10 + rand() * 12;
      shapes.push(
        <path
          key={i}
          d={`M -20 ${y} Q 50 ${y - a} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y} T 500 ${y}`}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
        />,
      );
    }
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      style={{ fill: color, opacity: 0.35 }}
    >
      {shapes}
    </svg>
  );
}

/**
 * Generated cover for recipes without photos: the title in Fraunces over
 * a cuisine-tinted pattern. Never a broken image or a stock photo.
 */
export function TypographicCover({
  title,
  cuisine,
  seed,
  size = "card",
  className,
}: {
  title: string;
  cuisine: string | null;
  seed: number;
  size?: "card" | "hero";
  className?: string;
}) {
  const tint = tintFor(cuisine);
  return (
    <div
      className={cn(
        "relative isolate flex overflow-hidden",
        size === "card"
          ? "aspect-[4/3] p-4"
          : "aspect-[16/9] p-6 sm:aspect-[21/9] sm:p-10",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${tint} 16%, var(--surface))`,
      }}
    >
      <Pattern seed={seed} color={tint} />
      <div className="relative mt-auto grid gap-1">
        {cuisine ? (
          <span className="num text-xs tracking-widest text-ink-muted uppercase">
            {cuisine}
          </span>
        ) : null}
        <span
          className={cn(
            "font-display leading-[1.05] text-balance text-ink",
            size === "card" ? "line-clamp-3 text-xl" : "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </span>
      </div>
    </div>
  );
}
