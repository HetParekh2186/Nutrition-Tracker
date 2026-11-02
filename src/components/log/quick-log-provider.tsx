"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MealSlot } from "@/lib/db/enums";

import { QuickLog } from "./quick-log";

type OpenOptions = { slot?: MealSlot };

type QuickLogContextValue = {
  open: (options?: OpenOptions) => void;
  /** The diary day the palette logs into; pages set it. */
  date: string;
  setDate: (date: string) => void;
};

const QuickLogContext = createContext<QuickLogContextValue | null>(null);

export function useQuickLog(): QuickLogContextValue {
  const ctx = useContext(QuickLogContext);
  if (!ctx) throw new Error("useQuickLog must be used inside QuickLogProvider");
  return ctx;
}

export function QuickLogProvider({
  today,
  children,
}: {
  today: string;
  children: ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);
  const [slot, setSlot] = useState<MealSlot | undefined>();
  const [date, setDate] = useState(today);

  const open = useCallback((options?: OpenOptions) => {
    setSlot(options?.slot);
    setOpen(true);
  }, []);

  // Cmd+K on macOS, Ctrl+K elsewhere, toggles the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSlot(undefined);
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open, date, setDate }), [open, date]);

  return (
    <QuickLogContext.Provider value={value}>
      {children}
      <QuickLog
        open={isOpen}
        onOpenChange={setOpen}
        date={date}
        initialSlot={slot}
      />
    </QuickLogContext.Provider>
  );
}
