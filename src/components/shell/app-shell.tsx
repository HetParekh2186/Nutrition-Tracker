"use client";

import {
  CalendarDays,
  BookOpen,
  ChartColumn,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { useQuickLog } from "@/components/log/quick-log-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: ReactNode };

export const NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: <CalendarDays aria-hidden /> },
  { href: "/recipes", label: "Recipes", icon: <BookOpen aria-hidden /> },
  { href: "/insights", label: "Insights", icon: <ChartColumn aria-hidden /> },
  { href: "/settings", label: "Settings", icon: <Settings aria-hidden /> },
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

function MobileLogButton() {
  const { open } = useQuickLog();
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Log food"
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-float outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
    >
      <Plus aria-hidden className="size-6" />
    </button>
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

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
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
            <form action={signOut}>
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

      <MobileLogButton />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex h-16 items-stretch justify-around">
          {NAV.map((item) => (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-w-16 flex-col items-center justify-center gap-1 px-3 text-xs [&_svg]:size-5",
                  active(item.href) ? "text-ink" : "text-ink-muted",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
