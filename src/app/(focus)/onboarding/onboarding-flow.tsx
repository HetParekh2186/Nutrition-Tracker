"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BodyFields, type BodyDraft } from "@/components/profile/body-fields";
import { ChoiceCards } from "@/components/profile/choice-cards";
import { PreferencesFields } from "@/components/profile/preferences-fields";
import { TargetPreview } from "@/components/profile/target-preview";
import { TypographicCover } from "@/components/recipes/typographic-cover";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import type { ActivityLevel, Goal } from "@/lib/nutrition/targets";
import { ACTIVITY_CHOICES, GOAL_CHOICES } from "@/lib/profile/options";
import { targetInputFrom } from "@/lib/profile/target-input";
import type { PreferencesDTO, ProfileDTO } from "@/lib/profile/types";
import { suitsDiet } from "@/lib/recipes/diet";
import type { RecipeSummaryDTO } from "@/lib/recipes/types";
import { cn } from "@/lib/utils";

const STEPS = [
  "About you",
  "Activity and goal",
  "Food rules",
  "Meals you like",
] as const;

const PICKS = 5;

export function OnboardingFlow({
  profile,
  preferences,
  starters,
}: {
  profile: ProfileDTO;
  preferences: PreferencesDTO;
  /** Starter recipes to pick favourites from (cold start). */
  starters: RecipeSummaryDTO[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [body, setBody] = useState<BodyDraft>({
    sex: profile.sex,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    unitSystem: profile.unitSystem,
  });
  const [activity, setActivity] = useState<ActivityLevel | null>(
    profile.activityLevel,
  );
  const [goal, setGoal] = useState<Goal | null>(profile.goal);
  const [prefs, setPrefs] = useState<PreferencesDTO>({
    ...preferences,
    dietType: preferences.dietType ?? "omnivore",
  });

  const [picked, setPicked] = useState<string[]>([]);
  // Only offer meals that fit the diet chosen in step 3.
  const pickable = starters.filter((r) => suitsDiet(r.tags, prefs.dietType));

  const draft = {
    ...body,
    activityLevel: activity,
    goal,
    proteinGPerKg: profile.proteinGPerKg,
    fatPctOfKcal: profile.fatPctOfKcal,
  };
  const targetInput = targetInputFrom(draft, "2000-01-01");
  const bodyComplete =
    body.sex && body.birthDate && body.heightCm && body.weightKg;

  const finish = useMutation({
    mutationFn: async () => {
      await api.updatePreferences({
        dietType: prefs.dietType,
        excludedIngredients: prefs.excludedIngredients,
        likedCuisines: prefs.likedCuisines,
      });
      await api.updateProfile({
        sex: body.sex ?? undefined,
        birthDate: body.birthDate ?? undefined,
        heightCm: body.heightCm ?? undefined,
        weightKg: body.weightKg ?? undefined,
        unitSystem: body.unitSystem,
        activityLevel: activity ?? undefined,
        goal: goal ?? undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        completeOnboarding: true,
      });
      // Cold start: picks are saves that count as cooked today until real
      // history exists (SPEC.md "Taste profile").
      for (const id of picked) await api.interact(id, { event: "save" });
    },
    onSuccess: () => {
      router.push("/today");
      router.refresh();
    },
  });

  const canContinue =
    step === 0
      ? Boolean(bodyComplete)
      : step === 1
        ? Boolean(activity && goal)
        : true;

  return (
    <main className="mx-auto grid min-h-dvh max-w-2xl content-start gap-8 px-4 py-10 sm:py-16">
      <header className="grid gap-4">
        <p className="num text-xs tracking-widest text-ink-muted uppercase">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="text-2xl">{STEPS[step]}</h1>
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={`h-1 rounded-full ${i <= step ? "bg-ink" : "bg-border"}`}
            >
              <span className="sr-only">
                {label}
                {i < step ? " (done)" : ""}
              </span>
            </li>
          ))}
        </ol>
      </header>

      <form
        className="grid gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canContinue) return;
          if (step < STEPS.length - 1) setStep(step + 1);
          else finish.mutate();
        }}
      >
        {step === 0 ? (
          <>
            <p className="-mt-4 text-ink-muted">
              Mise turns these into daily calorie, macro and micronutrient
              targets. They stay private to your account.
            </p>
            <BodyFields value={body} onChange={setBody} />
          </>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-8">
              <ChoiceCards
                legend="How active are you?"
                name="activity"
                columns={1}
                choices={ACTIVITY_CHOICES}
                value={activity}
                onChange={setActivity}
              />
              <ChoiceCards
                legend="What is your goal?"
                name="goal"
                choices={GOAL_CHOICES}
                value={goal}
                onChange={setGoal}
              />
            </div>
            <div className="md:sticky md:top-8 md:self-start">
              <TargetPreview input={targetInput} />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <p className="-mt-4 text-ink-muted">
              Suggestions follow these rules. You can add dislikes, cooking time
              and equipment later in Settings.
            </p>
            <PreferencesFields value={prefs} onChange={setPrefs} compact />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="-mt-4 text-ink-muted">
              Pick up to {PICKS} that sound good. Suggestions start from these
              and learn from what you actually cook. You can skip this.
            </p>
            <fieldset>
              <legend className="sr-only">Meals you like</legend>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pickable.map((r) => {
                  const on = picked.includes(r.id);
                  const full = picked.length >= PICKS && !on;
                  return (
                    <li key={r.id}>
                      <label
                        className={cn(
                          "block cursor-pointer overflow-hidden rounded-xl border bg-surface transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                          on
                            ? "border-ink"
                            : "border-border hover:border-ink-muted",
                          full && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          disabled={full}
                          onChange={() =>
                            setPicked((p) =>
                              on ? p.filter((x) => x !== r.id) : [...p, r.id],
                            )
                          }
                        />
                        <TypographicCover
                          title={r.title}
                          cuisine={r.cuisine}
                          seed={r.coverSeed}
                          className="aspect-[3/2] p-3 [&_span.font-display]:text-lg"
                        />
                        <span className="flex items-center justify-between px-3 py-2 text-xs text-ink-muted">
                          {on ? "Picked" : "Pick"}
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-4 place-items-center rounded-full border",
                              on
                                ? "border-ink bg-ink text-bg"
                                : "border-ink-muted",
                            )}
                          >
                            {on ? "✓" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <p aria-live="polite" className="num text-sm text-ink-muted">
              {picked.length} of {PICKS} picked
            </p>
          </>
        ) : null}

        {finish.isError ? (
          <p role="alert" className="text-sm text-over">
            {finish.error.message}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft aria-hidden />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            size="lg"
            disabled={!canContinue || finish.isPending}
          >
            {step < STEPS.length - 1
              ? "Continue"
              : finish.isPending
                ? "Setting up"
                : "Finish and see today"}
          </Button>
        </div>
      </form>
    </main>
  );
}
