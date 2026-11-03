import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CookView } from "@/components/cook/cook-view";
import { getUserId } from "@/lib/auth/session";
import { CookSessionNotFound, getSession } from "@/lib/cook/repo";
import { llmConfigured } from "@/lib/llm/client";

export const metadata: Metadata = { title: "Cook Mode" };

export default async function CookPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const userId = await getUserId();
  const { sessionId } = await params;
  if (!userId) redirect(`/login?next=/cook/${sessionId}`);
  if (!z.uuid().safeParse(sessionId).success) notFound();
  try {
    const session = await getSession(userId, sessionId);
    return <CookView initial={session} aiEnabled={llmConfigured()} />;
  } catch (err) {
    if (err instanceof CookSessionNotFound) notFound();
    throw err;
  }
}
