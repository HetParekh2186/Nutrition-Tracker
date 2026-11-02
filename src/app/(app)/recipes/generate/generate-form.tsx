"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SlotPicker } from "@/components/log/slot-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readNdjson } from "@/lib/api/stream";
import { api } from "@/lib/client/api";
import type { MealSlot } from "@/lib/db/enums";

const IDEAS = [
  "High-protein Indian dinner, ready in 30 minutes",
  "Vegetarian lunch I can meal prep for 4 days",
  "Something cozy with lentils",
  "A quick breakfast with eggs and spinach",
];

export function GenerateForm({
  initialSlot,
  initialRequest,
}: {
  initialSlot: MealSlot;
  initialRequest: string;
}) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [servings, setServings] = useState("2");
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(servings);
    if (request.trim().length < 3 || !(n >= 1 && n <= 12)) return;
    setRunning(true);
    setError(null);
    setStatus([]);
    try {
      const res = await api.generateRecipe({
        request: request.trim(),
        slot,
        servings: Math.round(n),
      });
      let result: Record<string, unknown> | null = null;
      await readNdjson(res, (event) => {
        if (event.type === "status") setStatus((s) => [...s, event.message]);
        if (event.type === "error") setError(event.message);
        if (event.type === "done") result = event;
      });
      if (result) {
        const r = result as {
          recipeId: string;
          offTarget?: boolean;
          unmatched?: string[];
        };
        toast.success("Recipe ready", {
          description: r.offTarget
            ? "It is still more than 10% off one of your targets."
            : r.unmatched?.length
              ? `${r.unmatched.length} ingredient(s) need a food match.`
              : "Macros computed from USDA data.",
        });
        router.push(`/recipes/${r.recipeId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form onSubmit={run} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="gen-request">What do you feel like?</Label>
        <textarea
          id="gen-request"
          rows={3}
          maxLength={500}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          disabled={running}
          autoFocus
          placeholder="High-protein Indian dinner, ready in 30 minutes"
          className="rounded-lg border border-input bg-surface-2 px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              disabled={running}
              onClick={() => setRequest(idea)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-ink-muted outline-none hover:border-ink-muted hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Meal</span>
        <SlotPicker value={slot} onChange={setSlot} name="gen-slot" />
        <p className="text-xs text-ink-muted">
          Targets default to what you have left for this meal today.
        </p>
      </div>

      <div className="grid max-w-[8rem] gap-1.5">
        <Label htmlFor="gen-servings">Servings</Label>
        <Input
          id="gen-servings"
          inputMode="numeric"
          className="num"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          disabled={running}
        />
      </div>

      {status.length ? (
        <ol
          aria-live="polite"
          className="grid gap-1.5 rounded-xl border border-border bg-surface p-4 text-sm"
        >
          {status.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${i === status.length - 1 && running ? "animate-pulse bg-ink" : "bg-good"}`}
              />
              {s}
            </li>
          ))}
        </ol>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-over">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={running || request.trim().length < 3}
        >
          <Sparkles aria-hidden />
          {running ? "Writing your recipe" : "Generate recipe"}
        </Button>
      </div>
    </form>
  );
}
