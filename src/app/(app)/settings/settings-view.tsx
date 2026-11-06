"use client";

import { SignOutButton } from "@/components/shell/app-shell";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BodyFields, type BodyDraft } from "@/components/profile/body-fields";
import { ChoiceCards } from "@/components/profile/choice-cards";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { PreferencesFields } from "@/components/profile/preferences-fields";
import { TargetPreview } from "@/components/profile/target-preview";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client/api";
import type { ActivityLevel, Goal } from "@/lib/nutrition/targets";
import { ACTIVITY_CHOICES, GOAL_CHOICES } from "@/lib/profile/options";
import { targetInputFrom } from "@/lib/profile/target-input";
import type {
  PreferencesDTO,
  ProfileDTO,
  TargetRowDTO,
} from "@/lib/profile/types";

import { TargetsEditor } from "./targets-editor";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-6 border-t border-border pt-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsView({
  profile,
  preferences,
  targets,
  timezones,
  email,
  signOut,
}: {
  profile: ProfileDTO;
  preferences: PreferencesDTO;
  targets: TargetRowDTO[];
  /** Built on the server so server and browser render the same list. */
  timezones: string[];
  email: string | null;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const qc = useQueryClient();
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
  const [proteinPerKg, setProteinPerKg] = useState(
    String(profile.proteinGPerKg),
  );
  const [fatPct, setFatPct] = useState(
    String(Math.round(profile.fatPctOfKcal * 100)),
  );
  const [timezone, setTimezone] = useState(profile.timezone);
  const [prefs, setPrefs] = useState(preferences);
  const [targetsKey, setTargetsKey] = useState(0);

  const protein = Number(proteinPerKg);
  const fat = Number(fatPct) / 100;
  const draftInput = targetInputFrom(
    {
      ...body,
      activityLevel: activity,
      goal,
      proteinGPerKg: Number.isFinite(protein) ? protein : profile.proteinGPerKg,
      fatPctOfKcal: Number.isFinite(fat) ? fat : profile.fatPctOfKcal,
    },
    "2000-01-01",
  );

  const saveProfile = useMutation({
    mutationFn: () =>
      api.updateProfile({
        sex: body.sex ?? undefined,
        birthDate: body.birthDate ?? undefined,
        heightCm: body.heightCm ?? undefined,
        weightKg: body.weightKg ?? undefined,
        unitSystem: body.unitSystem,
        activityLevel: activity ?? undefined,
        goal: goal ?? undefined,
        proteinGPerKg: protein,
        fatPctOfKcal: fat,
        timezone,
      }),
    onSuccess: () => {
      toast.success("Profile saved. Targets you have not edited were updated.");
      setTargetsKey((k) => k + 1);
      void qc.invalidateQueries();
      router.refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const savePrefs = useMutation({
    mutationFn: () => api.updatePreferences(prefs),
    onSuccess: (next) => {
      setPrefs(next);
      toast.success("Food rules saved");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="grid gap-10">
      <header>
        <h1 className="text-2xl">Settings</h1>
        {profile.isDemo ? (
          <p className="mt-2 text-sm text-ink-muted">
            This is the shared demo account. Changes are reset every night.
          </p>
        ) : null}
      </header>

      <Section
        id="profile-heading"
        title="Profile"
        description="Body stats and goal set your calorie and macro targets."
      >
        <form
          className="grid gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <BodyFields value={body} onChange={setBody} />
          <ChoiceCards
            legend="Activity"
            name="activity"
            columns={1}
            choices={ACTIVITY_CHOICES}
            value={activity}
            onChange={setActivity}
          />
          <ChoiceCards
            legend="Goal"
            name="goal"
            choices={GOAL_CHOICES}
            value={goal}
            onChange={setGoal}
          />
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="grid gap-1.5">
              <Label htmlFor="protein-per-kg">Protein (g per kg)</Label>
              <Input
                id="protein-per-kg"
                inputMode="decimal"
                className="num"
                value={proteinPerKg}
                onChange={(e) => setProteinPerKg(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fat-pct">Fat (% of calories)</Label>
              <Input
                id="fat-pct"
                inputMode="numeric"
                className="num"
                value={fatPct}
                onChange={(e) => setFatPct(e.target.value)}
              />
            </div>
          </div>
          <div className="grid max-w-md gap-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-8 rounded-lg border border-input bg-surface-2 px-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-muted">
              Diary days follow this timezone.
            </p>
          </div>
          <TargetPreview input={draftInput} />
          <div>
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving" : "Save profile"}
            </Button>
          </div>
        </form>
      </Section>

      <Section
        id="targets-heading"
        title="Targets"
        description="Every target is editable. Your edits are kept when your profile changes; reset one to go back to the computed value."
      >
        <TargetsEditor key={targetsKey} initial={targets} />
      </Section>

      <Section
        id="rules-heading"
        title="Food rules"
        description="Used to filter and rank recipe suggestions."
      >
        <form
          className="grid gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            savePrefs.mutate();
          }}
        >
          <PreferencesFields value={prefs} onChange={setPrefs} />
          <div>
            <Button type="submit" disabled={savePrefs.isPending}>
              {savePrefs.isPending ? "Saving" : "Save food rules"}
            </Button>
          </div>
        </form>
      </Section>

      {profile.isDemo ? null : (
        <Section
          id="password-heading"
          title="Password"
          description="Set or change the password you sign in with. Email sign-in links keep working either way."
        >
          <SetPasswordForm from="settings" submitLabel="Save password" />
        </Section>
      )}

      <Section
        id="display-heading"
        title="Display"
        description="Theme follows your device unless you pick one."
      >
        <ThemeToggle />
      </Section>

      <Section
        id="account-heading"
        title="Account"
        description={email ? `Signed in as ${email}.` : "Signed in."}
      >
        <SignOutButton signOut={signOut} />
      </Section>
    </div>
  );
}
