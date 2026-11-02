"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const MagicLinkForm = z.object({
  email: z.email("Enter a valid email address."),
  next: z.string().optional(),
});

export async function sendMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = MagicLinkForm.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the form.",
    };
  }

  // Use the request origin so local, preview and production links all work.
  const origin = (await headers()).get("origin");
  if (!origin) return { status: "error", message: "Missing request origin." };

  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", safeNextPath(parsed.data.next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl.toString() },
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
  return { status: "sent", email: parsed.data.email };
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
