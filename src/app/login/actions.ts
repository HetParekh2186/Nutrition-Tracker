"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  EmailField,
  SetPasswordForm,
  SignInForm,
  SignUpForm,
  authErrorMessage,
  firstIssue,
} from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/paths";
import { getUserId } from "@/lib/auth/session";
import { getProfile } from "@/lib/profile/repo";
import { createClient } from "@/lib/supabase/server";

export type AuthState =
  | { status: "idle" }
  /** An email went out: a sign-in link, a confirmation or a reset link. */
  | { status: "sent"; email: string; kind: "link" | "confirm" | "reset" }
  | { status: "saved" }
  | { status: "error"; message: string; unconfirmed?: boolean };

/** Kept for the magic-link form. */
export type MagicLinkState = AuthState;

const MagicLinkForm = z.object({
  email: EmailField,
  next: z.string().optional(),
});

function fields(formData: FormData, names: string[]) {
  return Object.fromEntries(
    names.map((n) => [n, formData.get(n) ?? undefined]),
  );
}

/**
 * Where an emailed link should land: /auth/confirm on this origin, which
 * then forwards to `next`. Using the request origin keeps local, preview and
 * production links working.
 */
async function confirmUrl(next: string | undefined): Promise<string | null> {
  const origin = (await headers()).get("origin");
  if (!origin) return null;
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}

export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = MagicLinkForm.safeParse(fields(formData, ["email", "next"]));
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const redirectTo = await confirmUrl(parsed.data.next);
  if (!redirectTo) {
    return { status: "error", message: "Missing request origin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.status === 429
          ? "Too many emails sent. Wait a minute and try again."
          : "Could not send the link. Try again.",
    };
  }
  return { status: "sent", email: parsed.data.email, kind: "link" };
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = SignInForm.safeParse(
    fields(formData, ["email", "password", "next"]),
  );
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return {
      status: "error",
      message: authErrorMessage(error),
      unconfirmed: error.code === "email_not_confirmed",
    };
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = SignUpForm.safeParse(
    fields(formData, ["email", "password", "next"]),
  );
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const redirectTo = await confirmUrl(parsed.data.next);
  if (!redirectTo) {
    return { status: "error", message: "Missing request origin." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { status: "error", message: authErrorMessage(error) };
  // With email confirmation off the account is ready now.
  if (data.session) redirect(safeNextPath(parsed.data.next));
  // Otherwise a confirmation email went out. Supabase answers the same way
  // for an email that already has an account, so the page says nothing
  // about whether it did.
  return { status: "sent", email: parsed.data.email, kind: "confirm" };
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = MagicLinkForm.safeParse(fields(formData, ["email", "next"]));
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const redirectTo = await confirmUrl(parsed.data.next);
  if (!redirectTo) {
    return { status: "error", message: "Missing request origin." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { status: "error", message: authErrorMessage(error) };
  return { status: "sent", email: parsed.data.email, kind: "confirm" };
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = MagicLinkForm.safeParse(fields(formData, ["email"]));
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const redirectTo = await confirmUrl("/reset-password");
  if (!redirectTo) {
    return { status: "error", message: "Missing request origin." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );
  // Only rate limits are worth reporting; anything else would say whether
  // the email has an account.
  if (error?.status === 429 || error?.code?.startsWith("over_")) {
    return { status: "error", message: authErrorMessage(error) };
  }
  return { status: "sent", email: parsed.data.email, kind: "reset" };
}

/**
 * Sets the signed-in user's password: after a reset link, or from Settings
 * for accounts that started with magic links. `from=reset` goes to Today.
 */
export async function setPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = SetPasswordForm.safeParse(
    fields(formData, ["password", "confirm"]),
  );
  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }
  const userId = await getUserId();
  if (!userId) {
    return {
      status: "error",
      message: "Your link expired. Request a new reset email.",
    };
  }
  // Everyone shares the demo account, so nobody may lock the others out.
  if ((await getProfile(userId)).isDemo) {
    return {
      status: "error",
      message: "The demo account's password cannot be changed.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { status: "error", message: authErrorMessage(error) };
  if (formData.get("from") === "reset") redirect("/today");
  return { status: "saved" };
}

/**
 * One-click sign-in to the shared demo account. The password lives only in
 * server env vars; the demo's data is reset by pnpm seed:demo.
 */
export async function signInAsDemo() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) redirect("/login?error=demo");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  redirect(error ? "/login?error=demo" : "/today");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
