import {
  Apple,
  BookOpen,
  ChevronRight,
  History,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  CreateFoodButton,
  SearchFoodsButton,
} from "@/components/foods/food-actions";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth/session";
import { libraryCounts } from "@/lib/foods/library";

export const metadata: Metadata = { title: "Foods" };

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** One place in the library: a heading that links to it, then its actions. */
function LibraryCard({
  href,
  icon,
  title,
  description,
  meta,
  children,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
  children?: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4">
      <Link
        href={href}
        className="-m-2 flex items-start gap-3 rounded-lg p-2 transition-colors outline-none hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink [&_svg]:size-5"
        >
          {icon}
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg leading-tight">{title}</h2>
            <span className="shrink-0 num text-xs text-ink-muted">{meta}</span>
          </div>
          <p className="text-sm text-ink-muted">{description}</p>
        </div>
        <ChevronRight
          aria-hidden
          className="mt-2.5 size-4 shrink-0 text-ink-muted"
        />
      </Link>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </section>
  );
}

export default async function FoodsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/foods");
  const counts = await libraryCounts(userId);

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Foods</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Everything you have logged or made, and the shortcuts that make
            logging it again quick.
          </p>
        </div>
        <SearchFoodsButton />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LibraryCard
          href="/foods/mine"
          icon={<History />}
          title="My foods"
          description="Every food you have logged or created, saved in one list. Tap one to log it again."
          meta={count(counts.myFoods, "food", "foods")}
        >
          <Button asChild size="sm">
            <Link href="/foods/mine">Browse my foods</Link>
          </Button>
        </LibraryCard>

        <LibraryCard
          href="/foods/meals"
          icon={<UtensilsCrossed />}
          title="Saved meals"
          description="Combine foods and recipes you eat together, then log them all in one go."
          meta={count(counts.meals, "meal", "meals")}
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/foods/meals/new">
              <Plus aria-hidden />
              Create meal
            </Link>
          </Button>
        </LibraryCard>

        <LibraryCard
          href="/recipes"
          icon={<BookOpen />}
          title="Recipes"
          description="Write your own or have AI draft one. Nutrition is computed from USDA data for the ingredients."
          meta={`${counts.recipes} of yours`}
        >
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes/new">
              <Plus aria-hidden />
              Create recipe
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes/generate">
              <Sparkles aria-hidden />
              Generate with AI
            </Link>
          </Button>
        </LibraryCard>

        <LibraryCard
          href="/foods/mine?filter=custom"
          icon={<Apple />}
          title="Custom foods"
          description="Add anything the database is missing, straight from its nutrition label."
          meta={count(counts.customFoods, "food", "foods")}
        >
          <CreateFoodButton />
        </LibraryCard>
      </div>
    </div>
  );
}
