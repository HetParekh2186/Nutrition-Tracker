import { cn } from "cn";

import type { MiseScore, ScoreRating } from "@/lib/nutrition/mise-score";

const RATING: Record<ScoreRating, { label: string; dot: string }> = {
  excellent: { label: "Excellent", dot: "bg-good" },
  good: { label: "Good", dot: "bg-fair" },
  poor: { label: "Poor", dot: "bg-warn" },
  bad: { label: "Bad", dot: "bg-over" },
};

function describe(s: MiseScore): string {
  return `Mise score ${s.score} out of 100, ${RATING[s.rating].label.toLowerCase()}`;
}

/** Compact score for a food row: a coloured dot and the number. */
export function ScoreBadge({
  score,
  className,
}: {
  score: MiseScore | null;
  className?: string;
}) {
  if (!score) return null;
  return (
    <span
      role="img"
      aria-label={describe(score)}
      title={`${describe(score)}${score.basis === "nutrition" ? " (nutrition only)" : ""}`}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-4xl border border-border px-1.5 num text-xs text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", RATING[score.rating].dot)}
      />
      {score.score}
    </span>
  );
}

function Part({
  label,
  value,
  max,
  children,
}: {
  label: string;
  value: number | null;
  max: number;
  children?: React.ReactNode;
}) {
  return (
    <li className="grid gap-0.5">
      <span className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="num text-ink-muted">
          {value === null ? "unknown" : `${value} / ${max}`}
        </span>
      </span>
      {children}
    </li>
  );
}

/** The score with how it was worked out, for the amount step. */
export function ScoreCard({ score }: { score: MiseScore | null }) {
  if (!score) {
    return (
      <p className="text-xs text-ink-muted">
        No Mise score: the label data needed (energy, sugars, saturated fat and
        sodium) is incomplete.
      </p>
    );
  }
  const { parts } = score;
  const full = score.basis === "full";
  return (
    <details className="group rounded-lg border border-border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className={cn("size-2.5 rounded-full", RATING[score.rating].dot)}
        />
        <span>
          Mise score <span className="num font-medium">{score.score}</span>
          <span className="text-ink-muted">/100</span>
        </span>
        <span className="text-ink-muted">{RATING[score.rating].label}</span>
        <span className="ml-auto text-xs text-ink-muted group-open:hidden">
          How it is scored
        </span>
        <span className="ml-auto hidden text-xs text-ink-muted group-open:inline">
          Hide
        </span>
      </summary>
      <ul className="mt-2 grid gap-1.5 text-xs">
        <Part
          label="Nutrition (Nutri-Score)"
          value={full ? Math.round(parts.nutrition * 0.6) : parts.nutrition}
          max={full ? 60 : 100}
        />
        {full ? (
          <>
            <Part label="Additives" value={parts.additives} max={30}>
              {score.flagged.length ? (
                <span className="text-ink-muted">
                  {score.flagged
                    .map(
                      (a) =>
                        `${a.code} ${a.name}${a.risk === "high" ? " (high risk)" : ""}`,
                    )
                    .join(", ")}
                </span>
              ) : (
                <span className="text-ink-muted">None of concern.</span>
              )}
            </Part>
            <Part label="Organic" value={parts.organic} max={10} />
          </>
        ) : (
          <li className="text-ink-muted">
            Scored on nutrition only: additives and organic labels are known for
            scanned packaged foods.
          </li>
        )}
      </ul>
    </details>
  );
}
