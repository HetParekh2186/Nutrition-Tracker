"use client";

import { useActionState, useState, type ReactNode } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

import {
  requestPasswordReset,
  resendConfirmation,
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from "./actions";

const INITIAL: AuthState = { status: "idle" };

type Mode = "signin" | "signup" | "forgot" | "link";

/** Sign in with a password or an emailed link; sign up; reset a password. */
export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  // Kept across modes so switching does not make people retype it.
  const [email, setEmail] = useState("");
  const shared = { next, email, setEmail, setMode };

  return (
    <div className="grid gap-5">
      <fieldset>
        <legend className="sr-only">How to sign in</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
          {(
            [
              ["password", "Password"],
              ["link", "Email link"],
            ] as const
          ).map(([value, label]) => {
            const on = value === "link" ? mode === "link" : mode !== "link";
            return (
              <label
                key={value}
                className={cn(
                  "cursor-pointer rounded-md py-1.5 text-center text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  on
                    ? "bg-surface text-ink shadow-[0_0_0_1px_var(--border)]"
                    : "text-ink-muted",
                )}
              >
                <input
                  type="radio"
                  name="auth-method"
                  className="sr-only"
                  checked={on}
                  onChange={() => setMode(value === "link" ? "link" : "signin")}
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {mode === "signin" ? <SignIn key="signin" {...shared} /> : null}
      {mode === "signup" ? <SignUp key="signup" {...shared} /> : null}
      {mode === "forgot" ? <Forgot key="forgot" {...shared} /> : null}
      {mode === "link" ? <MagicLink key="link" {...shared} /> : null}
    </div>
  );
}

type Shared = {
  next?: string | undefined;
  email: string;
  setEmail: (email: string) => void;
  setMode: (mode: Mode) => void;
};

function EmailField({
  email,
  setEmail,
  invalid,
}: Pick<Shared, "email" | "setEmail"> & { invalid: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "auth-error" : undefined}
      />
    </div>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  if (state.status !== "error") return null;
  return (
    <p id="auth-error" role="alert" className="text-sm text-over">
      {state.message}
    </p>
  );
}

function Sent({ state }: { state: Extract<AuthState, { status: "sent" }> }) {
  const copy = {
    link: {
      title: "Check your inbox",
      body: "We sent a sign-in link to",
      after: "Open it on this device to continue.",
    },
    confirm: {
      title: "Confirm your email",
      body: "If this email is new to Mise, we sent a confirmation link to",
      after:
        "Open it on this device to finish. Already have an account? Sign in with your password instead.",
    },
    reset: {
      title: "Check your inbox",
      body: "If an account uses this email, we sent a reset link to",
      after: "Open it on this device to pick a new password.",
    },
  }[state.kind];
  return (
    <div role="status" className="grid gap-2">
      <p className="font-display text-lg">{copy.title}</p>
      <p className="text-sm text-ink-muted">
        {copy.body} <span className="font-medium text-ink">{state.email}</span>.{" "}
        {copy.after}
      </p>
    </div>
  );
}

function TextButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-ink underline decoration-accent underline-offset-4 hover:decoration-2"
    >
      {children}
    </button>
  );
}

function NextField({ next }: { next?: string | undefined }) {
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

function SignIn({ next, email, setEmail, setMode }: Shared) {
  const [state, action, pending] = useActionState(signInWithPassword, INITIAL);
  const invalid = state.status === "error";
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <NextField next={next} />
        <EmailField email={email} setEmail={setEmail} invalid={invalid} />
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <TextButton onClick={() => setMode("forgot")}>
              Forgot password?
            </TextButton>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? "auth-error" : undefined}
          />
        </div>
        <ErrorText state={state} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in" : "Sign in"}
        </Button>
      </form>
      {state.status === "error" && state.unconfirmed ? (
        <Resend next={next} email={email} />
      ) : null}
      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <TextButton onClick={() => setMode("signup")}>
          Create an account
        </TextButton>
      </p>
    </div>
  );
}

function Resend({ next, email }: { next?: string | undefined; email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, INITIAL);
  if (state.status === "sent") return <Sent state={state} />;
  return (
    <form action={action} className="grid gap-2">
      <NextField next={next} />
      <input type="hidden" name="email" value={email} />
      <ErrorText state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending" : "Send the confirmation email again"}
      </Button>
    </form>
  );
}

function SignUp({ next, email, setEmail, setMode }: Shared) {
  const [state, action, pending] = useActionState(signUpWithPassword, INITIAL);
  if (state.status === "sent") {
    return (
      <div className="grid gap-4">
        <Sent state={state} />
        <TextButton onClick={() => setMode("signin")}>
          Back to sign in
        </TextButton>
      </div>
    );
  }
  const invalid = state.status === "error";
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <NextField next={next} />
        <EmailField email={email} setEmail={setEmail} invalid={invalid} />
        <div className="grid gap-2">
          <Label htmlFor="new-password">Password</Label>
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            aria-invalid={invalid || undefined}
            aria-describedby={
              invalid ? "auth-error password-hint" : "password-hint"
            }
          />
          <p id="password-hint" className="text-xs text-ink-muted">
            At least {PASSWORD_MIN} characters. A short phrase works well.
          </p>
        </div>
        <ErrorText state={state} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating your account" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <TextButton onClick={() => setMode("signin")}>Sign in</TextButton>
      </p>
    </div>
  );
}

function Forgot({ email, setEmail, setMode }: Shared) {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    INITIAL,
  );
  return (
    <div className="grid gap-4">
      {state.status === "sent" ? (
        <Sent state={state} />
      ) : (
        <form action={action} className="grid gap-4">
          <p className="text-sm text-ink-muted">
            Enter your email and we will send a link to pick a new password.
          </p>
          <EmailField
            email={email}
            setEmail={setEmail}
            invalid={state.status === "error"}
          />
          <ErrorText state={state} />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Sending link" : "Email me a reset link"}
          </Button>
        </form>
      )}
      <TextButton onClick={() => setMode("signin")}>Back to sign in</TextButton>
    </div>
  );
}

function MagicLink({ next, email, setEmail }: Shared) {
  const [state, action, pending] = useActionState(sendMagicLink, INITIAL);
  if (state.status === "sent") return <Sent state={state} />;
  return (
    <form action={action} className="grid gap-4">
      <NextField next={next} />
      <p className="text-sm text-ink-muted">
        No password needed. We email you a link that signs you in.
      </p>
      <EmailField
        email={email}
        setEmail={setEmail}
        invalid={state.status === "error"}
      />
      <ErrorText state={state} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending link" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
