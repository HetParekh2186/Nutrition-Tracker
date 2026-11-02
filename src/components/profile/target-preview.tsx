"use client";

import { MACRO_META } from "@/components/nutrition/macro-chip";
import { N } from "@/lib/nutrition/catalog";
import { localDate } from "@/lib/nutrition/dates";
import { computeTargets, type TargetInput } from "@/lib/nutrition/dri";
import { formatAmount } from "@/lib/nutrition/format";

/** Live calorie and macro targets for a draft profile. */
export function TargetPreview({
  input,
}: {
  input: Omit<TargetInput, "onDate"> | null;
}) {
  if (!input) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-ink-muted">
        Fill in your details to see your daily targets.
      </p>
    );
  }
  const t = computeTargets({
    ...input,
    onDate: localDate(
      new Date(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
  });
  const kcal = t[N.energy]?.min ?? 0;
  const macros = [
    { key: "protein", id: N.protein },
    { key: "carbs", id: N.carbs },
    { key: "fat", id: N.fat },
  ] as const;

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <p className="text-sm text-ink-muted">Daily target</p>
        <p className="num text-2xl">
          {formatAmount(kcal, "kcal")}
          <span className="text-base text-ink-muted"> kcal</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div key={m.key} className="grid gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: MACRO_META[m.key].color }}
              />
              {MACRO_META[m.key].label}
            </dt>
            <dd className="num text-lg">
              {formatAmount(t[m.id]?.min ?? 0, "g")}
              <span className="text-xs text-ink-muted"> g</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-muted">
        Mifflin-St Jeor energy times your activity factor, adjusted for your
        goal. Vitamins and minerals use the NIH reference intakes for your age
        and sex. You can change any target later in Settings.
      </p>
    </div>
  );
}
