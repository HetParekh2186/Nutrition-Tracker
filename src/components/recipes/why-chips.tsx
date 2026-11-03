import { cn } from "@/lib/utils";

/** One to three short reasons a recipe was suggested. */
export function WhyChips({
  reasons,
  className,
}: {
  reasons: string[];
  className?: string;
}) {
  return (
    <ul
      aria-label="Why this was suggested"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {reasons.map((r) => (
        <li
          key={r}
          className="rounded-full bg-surface-2 px-2.5 py-1 text-xs leading-none text-ink"
        >
          {r}
        </li>
      ))}
    </ul>
  );
}
