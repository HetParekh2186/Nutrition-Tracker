import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="num text-xs tracking-widest text-ink-muted uppercase">
          Mise
        </p>
        <h1 className="mt-2 text-xl">Sign in</h1>
        <p className="mt-2 mb-8 text-sm text-ink-muted">
          No password. We email you a link that signs you in.
        </p>
        {error === "link" ? (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-border bg-surface-2 p-3 text-sm"
          >
            That link has expired or was already used. Request a new one.
          </p>
        ) : null}
        <div className="rounded-xl border border-border bg-surface p-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
