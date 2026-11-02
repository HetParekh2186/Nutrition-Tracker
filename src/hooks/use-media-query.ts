"use client";

import { useSyncExternalStore } from "react";

/** True while a CSS media query matches. False during server render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const DESKTOP = "(min-width: 768px)";
