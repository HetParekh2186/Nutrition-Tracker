import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { QuickLogProvider } from "@/components/log/quick-log-provider";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { getTimezone } from "@/lib/diary/repo";
import { localDate } from "@/lib/nutrition/dates";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "../login/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");
  const today = localDate(new Date(), await getTimezone(userId));

  return (
    <Providers>
      <QuickLogProvider today={today}>
        <AppShell email={data.claims.email ?? null} signOut={signOut}>
          {children}
        </AppShell>
      </QuickLogProvider>
    </Providers>
  );
}
