"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BodyFields, type BodyDraft } from "@/components/profile/body-fields";
import { ChoiceCards } from "@/components/profile/choice-cards";
import { PreferencesFields } from "@/components/profile/preferences-fields";
import { TargetPreview } from "@/components/profile/target-preview";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import type { ActivityLevel, Goal } from "@/lib/nutrition/targets";
import { ACTIVITY_CHOICES, GOAL_CHOICES } from "@/lib/profile/options";
import { targetInputFrom } from "@/lib/profile/target-input";
import type { PreferencesDTO, ProfileDTO } from "@/lib/profile/types";

const STEPS = ["About you", "Activity and goal", "Food rules"] as const;

export function OnboardingFlow({
  profile,
  preferences,
}: {
  profile: ProfileDTO;
  preferences: PreferencesDTO;
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
        <ol className="grid grid-cols-3 gap-1.5" aria-label="Progress">
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
