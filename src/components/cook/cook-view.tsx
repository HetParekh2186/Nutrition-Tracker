"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  MessageCircle,
  Timer,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";

import { MacroLine } from "@/components/nutrition/macro-chip";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import type { CookSessionDTO } from "@/lib/cook/types";
import { defaultSlotForHour } from "@/lib/foods/units";
import { formatAmount } from "@/lib/nutrition/format";
import { FADE, SPRING } from "@/lib/motion";
import { scaledIngredientText, shownFactor } from "@/lib/recipes/display";
import { cn } from "@/lib/utils";

import { AssistantPanel } from "./assistant-panel";
import { formatClock, TimerPill, useTimers } from "./timers";

function SidePanel({
  open,
  onOpenChange,
  side,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "left" | "right";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={side}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(26rem,92vw)] flex-col border-border bg-bg shadow-float outline-none",
            side === "left" ? "left-0 border-r" : "right-0 border-l",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Drawer.Title className="font-display text-lg">
              {title}
            </Drawer.Title>
            <Drawer.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Close ${title.toLowerCase()}`}
              >
                <X />
              </Button>
            </Drawer.Close>
          </div>
          <Drawer.Description className="sr-only">{title}</Drawer.Description>
          <div className="min-h-0 flex-1">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** Keep the phone screen on while cooking, where supported. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    void request();
    const onVisible = () =>
      document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);
}

/**
 * Full-screen Cook Mode: one step at a time, arrow keys or swipe to move,
 * timers from the step, an ingredient checklist and the assistant.
 */
export function CookView({
  initial,
  aiEnabled,
}: {
  initial: CookSessionDTO;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [session, setSession] = useState(initial);
  const [step, setStep] = useState(
    Math.min(initial.currentStep, initial.recipe.steps.length) || 1,
  );
  const [direction, setDirection] = useState(1);
  const [panel, setPanel] = useState<"checklist" | "assistant" | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const { timers, start, toggle, remove } = useTimers();
  useWakeLock();

  const steps = session.recipe.steps;
  const total = steps.length;
  const current = steps.find((s) => s.position === step);
  const last = step >= total;
  const byId = new Map(session.recipe.ingredients.map((i) => [i.id, i]));

  // Persist the step so a reload or the assistant picks up where you are.
  const saveStep = useRef<ReturnType<typeof setTimeout> | null>(null);
  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(total, next));
      setDirection(clamped >= step ? 1 : -1);
      setStep(clamped);
      if (saveStep.current) clearTimeout(saveStep.current);
      saveStep.current = setTimeout(() => {
        void api
          .patchCook(session.id, { currentStep: clamped })
          .catch(() => {});
      }, 400);
    },
    [session.id, step, total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (panel || target?.closest("input, textarea, [contenteditable]"))
        return;
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, panel, step]);

  // Checklist ticks survive a reload of this session.
  const storageKey = `mise-cook-${session.id}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setChecked(new Set(JSON.parse(saved) as number[]));
    } catch {
      // Storage can be unavailable; the checklist just starts empty.
    }
  }, [storageKey]);
  function toggleChecked(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }

  const swipeStart = useRef<number | null>(null);

  const complete = useMutation({
    mutationFn: () =>
      api.completeCook(session.id, {
        servings: 1,
        mealSlot: defaultSlotForHour(new Date().getHours()),
      }),
    onSuccess: () => {
      toast.success("Logged 1 serving", {
        description:
          session.substitutions.length > 0
            ? "Your version, with swaps, was saved and logged."
            : session.recipe.title,
      });
      router.push("/today");
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Leave Cook Mode"
        >
          <Link href={`/recipes/${session.recipe.id}`}>
            <X />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base sm:text-lg">
            {session.recipe.title}
          </p>
          <p className="num text-xs text-ink-muted">
            Step {step} of {total} · {session.servings}{" "}
            {session.servings === 1 ? "serving" : "servings"}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => setPanel("checklist")}
          aria-label={`Ingredients, ${checked.size} of ${session.recipe.ingredients.length} checked`}
        >
          <ListChecks aria-hidden />
          <span className="hidden sm:inline">Ingredients</span>
          <span aria-hidden className="num text-xs text-ink-muted">
            {checked.size}/{session.recipe.ingredients.length}
          </span>
        </Button>
        <Button
          variant="outline"
          onClick={() => setPanel("assistant")}
          aria-label="Ask the cooking assistant"
        >
          <MessageCircle aria-hidden />
          <span className="hidden sm:inline">Ask</span>
        </Button>
      </header>

      {timers.length ? (
        <div
          className="flex flex-wrap justify-center gap-2 px-4 pt-3"
          aria-label="Timers"
        >
          {timers.map((t) => (
            <TimerPill
              key={t.id}
              timer={t}
              onToggle={() => toggle(t.id)}
              onRemove={() => remove(t.id)}
            />
          ))}
        </div>
      ) : null}

      <main
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden px-6 sm:px-12"
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? step + 1 : step - 1);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.section
            key={step}
            aria-live="polite"
            aria-label={`Step ${step}`}
            className="grid w-full max-w-4xl gap-8"
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, x: 40 * direction }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 * direction }}
            transition={reduce ? FADE : SPRING}
          >
            <p className="num text-sm tracking-widest text-ink-muted uppercase">
              Step {step}
            </p>
            <p className="font-display text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.12] text-balance">
              {current?.instruction ?? "This recipe has no steps yet."}
            </p>
            {current && current.ingredientIds.length ? (
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Ingredients for this step"
              >
                {current.ingredientIds.flatMap((id) => {
                  const ing = byId.get(id);
                  return ing
                    ? [
                        <li
                          key={id}
                          className="rounded-full bg-surface-2 px-3 py-1.5 text-sm"
                        >
                          <span className="num">
                            {formatAmount(ing.scaledG, "g")} g
                          </span>{" "}
                          <span className="text-ink-muted">
                            {scaledIngredientText(
                              ing.displayText,
                              shownFactor(ing),
                            )}
                          </span>
                        </li>,
                      ]
                    : [];
                })}
              </ul>
            ) : null}
            {current?.timerSeconds ? (
              <div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => start(current.timerSeconds!, `Step ${step}`)}
                >
                  <Timer aria-hidden />
                  Start {formatClock(current.timerSeconds)} timer
                </Button>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="grid gap-3 border-t border-border px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
        <ol className="flex gap-1" aria-label="Progress">
          {steps.map((s) => (
            <li key={s.position} className="flex-1">
              <button
                type="button"
                onClick={() => go(s.position)}
                aria-label={`Go to step ${s.position}`}
                aria-current={s.position === step ? "step" : undefined}
                className={cn(
                  "block h-1.5 w-full rounded-full transition-colors",
                  s.position <= step ? "bg-ink" : "bg-border",
                )}
              />
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => go(step - 1)}
            disabled={step <= 1}
          >
            <ChevronLeft aria-hidden />
            Back
          </Button>
          <div className="hidden text-xs text-ink-muted md:block">
            <MacroLine macros={session.perServing} /> per serving
          </div>
          {last ? (
            <Button
              size="lg"
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
            >
              <ChefHat aria-hidden />
              {complete.isPending ? "Logging" : "Done, log 1 serving"}
            </Button>
          ) : (
            <Button size="lg" variant="outline" onClick={() => go(step + 1)}>
              Next
              <ChevronRight aria-hidden />
            </Button>
          )}
        </div>
      </footer>

      <SidePanel
        open={panel === "checklist"}
        onOpenChange={(o) => setPanel(o ? "checklist" : null)}
        side="left"
        title="Ingredients"
      >
        <ul className="h-full overflow-y-auto p-2">
          {session.recipe.ingredients.map((ing) => (
            <li key={ing.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={checked.has(ing.id)}
                  onChange={() => toggleChecked(ing.id)}
                  className="mt-0.5 size-4 accent-ink"
                />
                <span
                  className={cn(
                    "grid text-sm",
                    checked.has(ing.id) && "text-ink-muted line-through",
                  )}
                >
                  <span>
                    {scaledIngredientText(ing.displayText, shownFactor(ing))}
                  </span>
                  <span className="num text-xs text-ink-muted">
                    {formatAmount(ing.scaledG, "g")} g for {session.servings}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </SidePanel>

      <SidePanel
        open={panel === "assistant"}
        onOpenChange={(o) => setPanel(o ? "assistant" : null)}
        side="right"
        title="Cooking assistant"
      >
        <AssistantPanel
          session={{ ...session, currentStep: step }}
          enabled={aiEnabled}
          onSession={setSession}
          onTimer={start}
          onStep={go}
        />
      </SidePanel>
    </div>
  );
}
