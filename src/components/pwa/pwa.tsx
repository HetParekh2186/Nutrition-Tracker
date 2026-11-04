"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

/** Register the service worker in production builds. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Without a worker the app still works, just not offline.
    });
  }, []);
  return null;
}

/** Drop the diary copies saved for offline use, on sign out. */
export function clearOfflineData() {
  navigator.serviceWorker?.controller?.postMessage("clear-data");
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-border bg-surface-2 px-4 py-2 text-xs text-ink"
    >
      <WifiOff aria-hidden className="size-3.5" />
      You are offline. Today shows the copy saved on this device; changes need a
      connection.
    </div>
  );
}

/**
 * Expose the part of the screen the on-screen keyboard leaves visible, as
 * CSS variables on <html>. iOS Safari draws the keyboard over fixed
 * elements instead of resizing the page, so sheets and dialogs use these
 * to sit above it: --vv-top and --vv-height are the visible area, and
 * --vv-bottom is how much of the page the keyboard covers.
 */
export function TrackVisibleViewport() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const layoutHeight = root.clientHeight;
      const covered = Math.max(0, layoutHeight - vv.offsetTop - vv.height);
      root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      root.style.setProperty("--vv-height", `${vv.height}px`);
      root.style.setProperty("--vv-bottom", `${covered}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      for (const name of ["--vv-top", "--vv-height", "--vv-bottom"]) {
        root.style.removeProperty(name);
      }
    };
  }, []);
  return null;
}
