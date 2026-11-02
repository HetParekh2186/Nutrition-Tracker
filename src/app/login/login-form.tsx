"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { sendMagicLink, type MagicLinkState } from "./actions";

const INITIAL: MagicLinkState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);

  if (state.status === "sent") {
    return (
      <div role="status" className="grid gap-2">
        <p className="font-display text-lg">Check your inbox</p>
        <p className="text-sm text-ink-muted">
          We sent a sign-in link to{" "}
          <span className="font-medium text-ink">{state.email}</span>. Open it
          on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={
            state.status === "error" ? "email-error" : undefined
          }
        />
        {state.status === "error" ? (
          <p id="email-error" className="text-sm text-over">
            {state.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending link" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
