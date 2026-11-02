"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A list of short strings: type and press Enter or comma to add. */
export function ChipInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim().toLowerCase();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  const unused = suggestions.filter((s) => !values.includes(s));

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="-mt-1 text-xs text-ink-muted">{hint}</p> : null}
      {values.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} added`}>
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1.5 pl-2.5 text-sm outline-none hover:bg-border focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Remove ${v}`}
              >
                {v}
                <X aria-hidden className="size-3.5 text-ink-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
      />
      {unused.length ? (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-ink-muted outline-none hover:border-ink-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
