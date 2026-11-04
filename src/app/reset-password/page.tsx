import type { Metadata } from "next";

import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata: Metadata = { title: "Pick a new password" };

// The reset email's link signs the user in through /auth/confirm and lands
// here. Not a public path, so an expired session goes back to sign-in.
export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="num text-xs tracking-widest text-ink-muted uppercase">
          Mise
        </p>
        <h1 className="mt-2 text-xl">Pick a new password</h1>
        <p className="mt-2 mb-8 text-sm text-ink-muted">
          You are signed in from the reset link. Choose the password you will
          use from now on.
        </p>
        <div className="rounded-xl border border-border bg-surface p-6">
          <SetPasswordForm from="reset" submitLabel="Save and continue" />
        </div>
      </div>
    </main>
  );
}
