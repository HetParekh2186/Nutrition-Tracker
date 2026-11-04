import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** "Foods" link above a page inside the Foods tab. */
export function BackLink({
  href = "/foods",
  label = "Foods",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 rounded text-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowLeft aria-hidden className="size-4" />
      {label}
    </Link>
  );
}
