// Email and password rules shared by the auth actions. Pure, so tested.

import { z } from "zod";

export const PASSWORD_MIN = 8;
// bcrypt, which Supabase Auth uses, ignores bytes after the 72nd.
export const PASSWORD_MAX_BYTES = 72;

export const EmailField = z.email("Enter a valid email address.");

export const NewPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .refine(
    (p) => new TextEncoder().encode(p).length <= PASSWORD_MAX_BYTES,
    "Use 72 characters or fewer.",
  )
  .refine((p) => p.trim().length > 0, "A password cannot be only spaces.");

export const SignInForm = z.object({
  email: EmailField,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const SignUpForm = z.object({
  email: EmailField,
  password: NewPassword,
  next: z.string().optional(),
});

/** Setting a password: typed twice, since there is no old one to check. */
export const SetPasswordForm = z
  .object({ password: NewPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

/** First problem in a failed parse, as one sentence for the form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form.";
}

/**
 * A Supabase Auth error as a sentence for the person. Sign-in failures stay
 * vague on purpose, so the form does not reveal which emails have accounts.
 */
export function authErrorMessage(error: {
  code?: string | undefined;
  status?: number | undefined;
  message?: string;
}): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password do not match. Check both, or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email first. Open the link we sent when you signed up.";
    case "weak_password":
      return "Pick a stronger password: longer, and not a common one.";
    case "same_password":
      return "That is your current password. Pick a new one.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "signup_disabled":
      return "New accounts are switched off right now.";
    case "reauthentication_needed":
    case "session_not_found":
    case "session_expired":
      return "Your session ended. Sign in again, then set the password.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries. Wait a minute and try again.";
  }
  if (error.status === 429)
    return "Too many tries. Wait a minute and try again.";
  return "Something went wrong. Try again.";
}
