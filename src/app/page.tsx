import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./login/actions";

// Placeholder home until the Today screen lands in Phase 1.
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-4">
      <div>
        <p className="num text-xs tracking-widest text-ink-muted uppercase">
          Mise
        </p>
        <h1 className="mt-2 text-2xl">Everything in its place</h1>
      </div>
      {email ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-muted">
            Signed in as <span className="text-ink">{email}</span>
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <Button asChild size="lg" className="w-fit">
          <Link href="/login">Sign in</Link>
        </Button>
      )}
      <Link
        href="/styleguide"
        className="w-fit text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        Design system
      </Link>
    </main>
  );
}
