import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/foods/back-link";
import { MealsView } from "@/components/foods/meals-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Saved meals" };

export default function MealsPage() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <BackLink />
          <h1 className="text-2xl">Saved meals</h1>
          <p className="text-sm text-ink-muted">
            Foods and recipes you eat together, logged in one go.
          </p>
        </div>
        <Button asChild>
          <Link href="/foods/meals/new">
            <Plus aria-hidden />
            Create meal
          </Link>
        </Button>
      </header>
      <MealsView />
    </div>
  );
}
