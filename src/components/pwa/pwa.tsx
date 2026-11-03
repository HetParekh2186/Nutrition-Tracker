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
