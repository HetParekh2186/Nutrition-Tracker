"use client";

import {
  Apple,
  CalendarDays,
  BookOpen,
  ChartColumn,
  LogOut,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useSyncExternalStore, type ReactNode } from "react";

import { useQuickLog } from "@/components/log/quick-log-provider";
import {
  clearOfflineData,
  OfflineNotice,
  RegisterServiceWorker,
  TrackVisibleViewport,
} from "@/components/pwa/pwa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Left out of the phone's bottom bar, which has room for four and Log. */
  desktopOnly?: boolean;
  /** Other sections this tab stands for where it is the only way in. */
  phoneAlso?: string[];
};

export const NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: <CalendarDays aria-hidden /> },
  { href: "/for-you", label: "For You", icon: <Sparkles aria-hidden /> },
  {
    href: "/foods",
    label: "Foods",
    icon: <Apple aria-hidden />,
    phoneAlso: ["/recipes"],
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: <BookOpen aria-hidden />,
    desktopOnly: true,
  },
  { href: "/insights", label: "Insights", icon: <ChartColumn aria-hidden /> },
  // On a phone, Settings is the gear in the header.
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings aria-hidden />,
    desktopOnly: true,
  },
];

/** "⌘K" on Apple devices, "Ctrl K" elsewhere. */
function useShortcutLabel(): string {
  return useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

function LogButton() {
  const shortcut = useShortcutLabel();
  const { open } = useQuickLog();
  return (
    <Button onClick={() => open()} className="hidden md:inline-flex">
      <Plus aria-hidden />
      Log food
      <kbd className="ml-1 rounded border border-on-accent/30 px-1 num text-xs">
        {shortcut}
      </kbd>
    </Button>
  );
}

/** The middle of the phone's tab bar: the one thing done every day. */
function TabBarLogButton() {
  const { open } = useQuickLog();
  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => open()}
        aria-label="Log food"
        className="flex min-w-16 flex-col items-center justify-center gap-1 px-2 text-xs font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* Raised so its label lines up with the other tabs'. */}
        <span className="-mt-4 grid size-9 place-items-center rounded-full bg-accent text-on-accent shadow-float">
          <Plus aria-hidden className="size-5" />
        </span>
        Log
      </button>
    </li>
  );
}

/** Sign out, clearing what was cached for offline use first. */
export function SignOutButton({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <form action={signOut} onSubmit={clearOfflineData}>
      <Button type="submit" variant="outline">
        <LogOut aria-hidden />
        Sign out
      </Button>
    </form>
  );
}

export function AppShell({
  email,
  signOut,
  children,
}: {
  email: string | null;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const activeOnPhone = (item: NavItem) =>
    active(item.href) || (item.phoneAlso ?? []).some(active);
  const phoneTabs = NAV.filter((item) => !item.desktopOnly);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <RegisterServiceWorker />
      <TrackVisibleViewport />
      <OfflineNotice />
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/today" className="font-display text-xl tracking-tight">
            Mise
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active(item.href)
                    ? "bg-surface-2 text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LogButton />
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "md:hidden",
                active("/settings")
                  ? "bg-surface-2 text-ink"
                  : "text-ink-muted",
              )}
            >
              <Link
                href="/settings"
                aria-label="Settings"
                aria-current={active("/settings") ? "page" : undefined}
              >
                <Settings aria-hidden />
              </Link>
            </Button>
            {/* On a phone, Sign out lives in Settings, away from the thumb. */}
            <form
              action={signOut}
              onSubmit={clearOfflineData}
              className="hidden md:block"
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label={email ? `Sign out ${email}` : "Sign out"}
                title={email ? `Signed in as ${email}` : undefined}
              >
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex h-16 items-stretch justify-around">
          {phoneTabs.map((item, i) => (
            <Fragment key={item.href}>
              {i === Math.floor(phoneTabs.length / 2) ? (
                <TabBarLogButton />
              ) : null}
              <li className="flex">
                <Link
                  href={item.href}
                  aria-current={activeOnPhone(item) ? "page" : undefined}
                  className={cn(
                    "relative flex min-w-16 flex-col items-center justify-center gap-1 px-2 text-xs [&_svg]:size-5",
                    activeOnPhone(item)
                      ? "font-medium text-ink before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:bg-accent [&_svg]:text-accent"
                      : "text-ink-muted",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
      </nav>
    </div>
  );
}
