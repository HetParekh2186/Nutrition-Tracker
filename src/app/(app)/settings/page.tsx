import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getUserId } from "@/lib/auth/session";
import { getPreferences, getProfile, getTargets } from "@/lib/profile/repo";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/settings");
  const [profile, preferences, targets] = await Promise.all([
    getProfile(userId),
    getPreferences(userId),
    getTargets(userId),
  ]);
  return (
    <SettingsView
      profile={profile}
      preferences={preferences}
      targets={targets}
      timezones={[
        ...new Set([profile.timezone, ...Intl.supportedValuesOf("timeZone")]),
      ]}
    />
  );
}
