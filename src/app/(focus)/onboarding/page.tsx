import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth/session";
import { getPreferences, getProfile } from "@/lib/profile/repo";

import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/onboarding");
  const [profile, preferences] = await Promise.all([
    getProfile(userId),
    getPreferences(userId),
  ]);
  return <OnboardingFlow profile={profile} preferences={preferences} />;
}
