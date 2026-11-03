"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { readNdjson } from "@/lib/api/stream";
import { api } from "@/lib/client/api";
import type { AssistantEvent } from "@/lib/cook/assistant";
import type { ChatMessageDTO, CookSessionDTO } from "@/lib/cook/types";
import { cn } from "@/lib/utils";

import { SubstitutionDiff } from "./substitution-diff";

const STARTERS = [
  "Can I use Greek yogurt instead of cream?",
  "How do I know when it is done?",
  "Set a timer for this step",
  "Convert this to cups",
];

export function AssistantPanel({
  session,
  enabled,
  onSession,
  onTimer,
  onStep,
}: {
  session: CookSessionDTO;
  enabled: boolean;
  /** Called with the refreshed session after tools or decisions. */
  onSession: (s: CookSessionDTO) => void;
  onTimer: (seconds: number, label: string) => void;
  onStep: (step: number) => void;
}) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>(session.messages);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  async function refresh() {
    onSession(
      await api.patchCook(session.id, { currentStep: session.currentStep }),
    );
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    setMessages((m) => [
      ...m,
      {
        id: -Date.now(),
        role: "user",
        text: question,
        step: session.currentStep,
      },
    ]);
    setStreaming("");
    let reply = "";
    let changedSession = false;
    try {
      const res = await api.cookMessage(session.id, question);
      await readNdjson<AssistantEvent>(res, (event) => {
        switch (event.type) {
          case "text":
            reply += event.delta;
            setStreaming(reply);
            break;
          case "timer":
            onTimer(event.seconds, event.label);
            break;
          case "step":
            onStep(event.step);
            break;
          case "servings":
            changedSession = true;
            break;
          case "proposal":
            setMessages((m) => [
              ...m,
              {
                id: event.proposal.id,
                role: "proposal",
                proposal: event.proposal,
                step: session.currentStep,
              },
            ]);
            break;
          case "error":
            setError(event.message);
            break;
          case "done":
            if (reply.trim()) {
              setMessages((m) => [
                ...m,
                {
                  id: event.messageId ?? -Date.now(),
                  role: "assistant",
                  text: reply.trim(),
                  step: session.currentStep,
                },
              ]);
            }
            break;
        }
      });
      if (changedSession) await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStreaming(null);
      setBusy(false);
    }
  }

  async function decide(id: number, accept: boolean) {
    setBusy(true);
    try {
      const next = await api.patchCook(session.id, {
        proposal: { id, accept },
      });
      onSession(next);
      setMessages((m) =>
        m.map((msg) =>
          msg.role === "proposal" && msg.id === id
            ? {
                ...msg,
                proposal: {
                  ...msg.proposal,
                  status: accept ? "accepted" : "rejected",
                },
              }
            : msg,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <p className="p-5 text-sm text-ink-muted">
        The cooking assistant is not set up on this server yet. Add an
        ANTHROPIC_API_KEY to enable it. Timers and the checklist still work.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        aria-live="polite"
      >
        {messages.length === 0 && streaming === null ? (
          <div className="grid gap-2">
            <p className="text-sm text-ink-muted">
              Ask anything while you cook. Swaps show their macro change before
              you accept them.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-left text-xs text-ink-muted hover:border-ink-muted hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m) =>
          m.role === "proposal" ? (
            <SubstitutionDiff
              key={`p${m.id}`}
              proposal={m.proposal}
              busy={busy}
              onDecide={(accept) => void decide(m.proposal.id, accept)}
            />
          ) : (
            <p
              key={m.id}
              className={cn(
                "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user" ? "ml-auto bg-ink text-bg" : "bg-surface-2",
              )}
            >
              {m.text}
            </p>
          ),
        )}
        {streaming !== null ? (
          <p className="max-w-[90%] rounded-xl bg-surface-2 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
            {streaming || (
              <span className="animate-pulse text-ink-muted">Thinking</span>
            )}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-over">
            {error}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ask the cooking assistant
        </label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this step"
          maxLength={1000}
          disabled={busy}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-surface-2 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Send"
          disabled={busy || !draft.trim()}
        >
          <Send />
        </Button>
      </form>
    </div>
  );
}
