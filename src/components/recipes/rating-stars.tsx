"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** A 1 to 5 star rating as a radio group, so arrow keys work. */
export function RatingStars({
  value,
  onChange,
  label = "Your rating",
}: {
  value: number | null;
  onChange: (rating: number) => void;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <fieldset
      className="flex items-center gap-2"
      onMouseLeave={() => setHover(null)}
    >
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="text-sm text-ink-muted">
        {label}
      </span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded p-0.5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="sr-only">
              {n} star{n === 1 ? "" : "s"}
            </span>
            <Star
              aria-hidden
              className={cn(
                "size-5 transition-colors",
                n <= shown ? "fill-ink stroke-ink" : "stroke-ink-muted",
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
