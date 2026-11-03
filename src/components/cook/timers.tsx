"use client";

import { Pause, Play, Timer, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type KitchenTimer = {
  id: number;
  label: string;
  totalSeconds: number;
  /** Epoch ms when it ends; null while paused. */
  endsAt: number | null;
  /** Seconds left when paused. */
  remaining: number;
  done: boolean;
};

let nextId = 1;

/** Three short beeps with Web Audio, plus a vibration on phones. */
function alarm() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.35);
      osc.stop(ctx.currentTime + i * 0.35 + 0.18);
    }
  } catch {
    // Audio can be blocked; the toast still shows.
  }
  navigator.vibrate?.([200, 100, 200, 100, 200]);
}

export function useTimers() {
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [, tick] = useState(0);
  const fired = useRef(new Set<number>());

  useEffect(() => {
    if (!timers.some((t) => t.endsAt && !t.done)) return;
    const interval = setInterval(() => {
      tick((n) => n + 1);
      setTimers((list) =>
        list.map((t) => {
          if (t.done || !t.endsAt || Date.now() < t.endsAt) return t;
          if (!fired.current.has(t.id)) {
            fired.current.add(t.id);
            alarm();
            toast.success(`${t.label} is done`);
          }
          return { ...t, done: true, remaining: 0 };
        }),
      );
    }, 250);
    return () => clearInterval(interval);
  }, [timers]);

  const start = useCallback((seconds: number, label: string) => {
    setTimers((list) => [
      ...list,
      {
        id: nextId++,
        label,
        totalSeconds: seconds,
        endsAt: Date.now() + seconds * 1000,
        remaining: seconds,
        done: false,
      },
    ]);
  }, []);

  const toggle = useCallback((id: number) => {
    setTimers((list) =>
      list.map((t) => {
        if (t.id !== id || t.done) return t;
        if (t.endsAt) {
          return {
            ...t,
            endsAt: null,
            remaining: Math.max(0, (t.endsAt - Date.now()) / 1000),
          };
        }
        return { ...t, endsAt: Date.now() + t.remaining * 1000 };
      }),
    );
  }, []);

  const remove = useCallback((id: number) => {
    setTimers((list) => list.filter((t) => t.id !== id));
  }, []);

  return { timers, start, toggle, remove };
}

export function secondsLeft(t: KitchenTimer): number {
  if (t.done) return 0;
  return t.endsAt ? Math.max(0, (t.endsAt - Date.now()) / 1000) : t.remaining;
}

export function formatClock(seconds: number): string {
  const s = Math.ceil(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A running timer: label, countdown and a thin progress line. */
export function TimerPill({
  timer,
  onToggle,
  onRemove,
}: {
  timer: KitchenTimer;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const left = secondsLeft(timer);
  const progress = 1 - left / timer.totalSeconds;
  return (
    <div
      role="timer"
      aria-label={`${timer.label}: ${timer.done ? "done" : `${formatClock(left)} left`}`}
      className={cn(
        "relative flex items-center gap-2 overflow-hidden rounded-full border bg-surface py-1.5 pr-1.5 pl-3 shadow-float",
        timer.done ? "animate-pulse border-accent" : "border-border",
      )}
    >
      <Timer aria-hidden className="size-4 text-ink-muted" />
      <span className="max-w-28 truncate text-sm">{timer.label}</span>
      <span className="num text-sm" aria-hidden>
        {timer.done ? "done" : formatClock(left)}
      </span>
      {!timer.done ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            timer.endsAt ? `Pause ${timer.label}` : `Resume ${timer.label}`
          }
          className="grid size-7 place-items-center rounded-full hover:bg-surface-2"
        >
          {timer.endsAt ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Dismiss ${timer.label}`}
        className="grid size-7 place-items-center rounded-full hover:bg-surface-2"
      >
        <X className="size-3.5" />
      </button>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 bg-accent"
        style={{ width: `${Math.min(1, progress) * 100}%` }}
      />
    </div>
  );
}
