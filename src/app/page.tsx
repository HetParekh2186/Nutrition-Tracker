import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth/session";

import { DemoButton } from "./login/demo-button";

// Signed-in users go straight to Today; everyone else sees a short intro.
export default async function Home() {
  if (await getUserId()) redirect("/today");

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-4">
      <div>
        <p className="num text-xs tracking-widest text-ink-muted uppercase">
          Mise
        </p>
        <h1 className="mt-2 text-2xl">Everything in its place</h1>
        <p className="mt-3 text-ink-muted">
          A nutrition tracker built on USDA data that learns what you eat,
          suggests recipes that fit what is left of your day, and walks you
          through cooking them.
        </p>
      </div>
      <div className="grid max-w-xs gap-2">
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <DemoButton />
      </div>
      <Link
        href="/styleguide"
        className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        Design system
      </Link>
    </main>
  );
}
