import type { Metadata } from "next";

import { MyFoodsView } from "@/components/foods/my-foods-view";
import { BackLink } from "@/components/foods/back-link";

export const metadata: Metadata = { title: "My foods" };

export default async function MyFoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-2">
        <BackLink />
        <h1 className="text-2xl">My foods</h1>
        <p className="text-sm text-ink-muted">
          Every food you have logged or created. Tap one to log it again.
        </p>
      </header>
      <MyFoodsView initialFilter={filter === "custom" ? "custom" : "all"} />
    </div>
  );
}
