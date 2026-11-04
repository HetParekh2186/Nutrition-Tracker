"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { setPassword, type AuthState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/lib/auth/password";

import { PasswordInput } from "./password-input";

const INITIAL: AuthState = { status: "idle" };

/**
 * New password, typed twice. After a reset link (`from="reset"`) it goes on
 * to Today; in Settings it stays and confirms with a toast.
 */
export function SetPasswordForm({
  from,
  submitLabel,
}: {
  from: "reset" | "settings";
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(setPassword, INITIAL);
  const form = useRef<HTMLFormElement>(null);
  const invalid = state.status === "error";

  useEffect(() => {
    if (state.status === "saved") {
      toast.success("Password saved. You can sign in with it now.");
      form.current?.reset();
    }
  }, [state]);

  return (
    <form ref={form} action={action} className="grid max-w-sm gap-4">
      <input type="hidden" name="from" value={from} />
      <div className="grid gap-2">
        <Label htmlFor="set-password">New password</Label>
        <PasswordInput
          id="set-password"
          name="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          aria-invalid={invalid || undefined}
          aria-describedby="set-password-hint"
        />
        <p id="set-password-hint" className="text-xs text-ink-muted">
          At least {PASSWORD_MIN} characters.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Type it again</Label>
        <PasswordInput
          id="confirm-password"
          name="confirm"
          autoComplete="new-password"
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "set-password-error" : undefined}
        />
      </div>
      {invalid ? (
        <p id="set-password-error" role="alert" className="text-sm text-over">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
