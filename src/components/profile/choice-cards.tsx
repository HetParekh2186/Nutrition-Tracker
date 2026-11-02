"use client";

import { cn } from "@/lib/utils";

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

/** A radio group drawn as cards. Keyboard: arrow keys move, like radios. */
export function ChoiceCards<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
  columns = 2,
}: {
  legend: string;
  name: string;
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          "grid grid-cols-1 gap-2",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-3",
        )}
      >
        {choices.map((c) => (
          <label
            key={c.value}
            className={cn(
              "grid cursor-pointer gap-0.5 rounded-lg border bg-surface px-3 py-2.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              value === c.value
                ? "border-ink"
                : "border-border hover:border-ink-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="sr-only"
            />
            <span className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={cn(
                  "grid size-3.5 shrink-0 place-items-center rounded-full border",
                  value === c.value ? "border-ink" : "border-ink-muted",
                )}
              >
                {value === c.value ? (
                  <span className="size-1.5 rounded-full bg-ink" />
                ) : null}
              </span>
              {c.label}
            </span>
            {c.description ? (
              <span className="pl-5.5 text-xs text-ink-muted">
                {c.description}
              </span>
            ) : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
