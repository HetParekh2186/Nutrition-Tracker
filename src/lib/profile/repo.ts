// Profile, dietary preferences and nutrient targets.

import { and, desc, eq, ne } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db";
import {
  EQUIPMENT,
  bodyMetrics,
  dietaryPreferences,
  nutrientTargets,
  userProfiles,
  users,
} from "@/lib/db/schema";
import { NUTRIENTS } from "@/lib/nutrition/catalog";
import { DIET_PRESETS, normalizeEats, presetFor } from "@/lib/recipes/diet";
import { localDate } from "@/lib/nutrition/dates";
import {
  computeTargets,
  mergeTargets,
  type ComputedTarget,
} from "@/lib/nutrition/dri";

import { targetInputFrom } from "./target-input";
import type { PreferencesDTO, ProfileDTO, TargetRowDTO } from "./types";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function latestWeight(db: Db | Tx, userId: string) {
  const [row] = await db
    .select({ weightKg: bodyMetrics.weightKg })
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.measuredOn))
    .limit(1);
  return row?.weightKg ?? null;
}

export async function getProfile(userId: string): Promise<ProfileDTO> {
  const db = getDb();
  const [[profile], [user], weightKg] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.userId, userId)),
    db.select({ isDemo: users.isDemo }).from(users).where(eq(users.id, userId)),
    latestWeight(db, userId),
  ]);
  return {
    sex: profile?.sex ?? null,
    birthDate: profile?.birthDate ?? null,
    heightCm: profile?.heightCm ?? null,
    weightKg,
    activityLevel: profile?.activityLevel ?? null,
    goal: profile?.goal ?? null,
    proteinGPerKg: profile?.proteinGPerKg ?? 1.8,
    fatPctOfKcal: profile?.fatPctOfKcal ?? 0.25,
    unitSystem: profile?.unitSystem ?? "metric",
    timezone: profile?.timezone ?? "America/Chicago",
    onboarded: profile?.onboardedAt != null,
    isDemo: user?.isDemo ?? false,
  };
}

/**
 * Recompute every target the user has not edited (rule 5: a user edit is
 * never overwritten). Runs inside the caller's transaction.
 */
async function writeComputedTargets(
  tx: Tx,
  userId: string,
  computed: Record<number, ComputedTarget>,
) {
  const stored = await tx
    .select()
    .from(nutrientTargets)
    .where(eq(nutrientTargets.userId, userId));
  const merged = mergeTargets(
    Object.fromEntries(
      stored.map((t) => [
        t.nutrientId,
        { min: t.minAmount, max: t.maxAmount, source: t.source },
      ]),
    ),
    computed,
  );
  await tx
    .delete(nutrientTargets)
    .where(
      and(
        eq(nutrientTargets.userId, userId),
        ne(nutrientTargets.source, "user"),
      ),
    );
  const rows = Object.entries(merged)
    .filter(([, t]) => t.source !== "user")
    .map(([id, t]) => ({
      userId,
      nutrientId: Number(id),
      minAmount: t.min,
      maxAmount: t.max,
      source: t.source,
    }));
  if (rows.length) await tx.insert(nutrientTargets).values(rows);
}

export type ProfileUpdate = Partial<
  Omit<ProfileDTO, "onboarded" | "isDemo">
> & { completeOnboarding?: boolean | undefined };

export async function updateProfile(
  userId: string,
  patch: ProfileUpdate,
): Promise<ProfileDTO> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const { weightKg, completeOnboarding, ...fields } = patch;
    const timezone =
      fields.timezone ??
      (
        await tx
          .select({ tz: userProfiles.timezone })
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
      )[0]?.tz ??
      "America/Chicago";

    await tx
      .insert(userProfiles)
      .values({ userId, ...fields })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...fields,
          updatedAt: new Date(),
          ...(completeOnboarding ? { onboardedAt: new Date() } : {}),
        },
      });

    if (weightKg !== undefined && weightKg !== null) {
      const today = localDate(new Date(), timezone);
      await tx
        .insert(bodyMetrics)
        .values({ userId, measuredOn: today, weightKg })
        .onConflictDoUpdate({
          target: [bodyMetrics.userId, bodyMetrics.measuredOn],
          set: { weightKg },
        });
    }
  });

  const profile = await getProfile(userId);
  const input = targetInputFrom(
    profile,
    localDate(new Date(), profile.timezone),
  );
  if (input) {
    await db.transaction((tx) =>
      writeComputedTargets(tx, userId, computeTargets(input)),
    );
  }
  return profile;
}

export async function getPreferences(userId: string): Promise<PreferencesDTO> {
  const [row] = await getDb()
    .select()
    .from(dietaryPreferences)
    .where(eq(dietaryPreferences.userId, userId));
  const eats = row ? normalizeEats(row.eats) : [...DIET_PRESETS.omnivore];
  return {
    dietType: presetFor(eats),
    eats,
    excludedIngredients: row?.excludedIngredients ?? [],
    dislikedIngredients: row?.dislikedIngredients ?? [],
    likedCuisines: row?.likedCuisines ?? [],
    maxCookMinutes: row?.maxCookMinutes ?? null,
    equipment: (row?.equipment ?? []).filter(
      (e): e is (typeof EQUIPMENT)[number] =>
        (EQUIPMENT as readonly string[]).includes(e),
    ),
    spiceLevel: row?.spiceLevel ?? null,
    notes: row?.notes ?? null,
    pantry: row?.pantry ?? [],
  };
}

export async function updatePreferences(
  userId: string,
  input: Partial<PreferencesDTO>,
): Promise<PreferencesDTO> {
  // eats is the rule; dietType is kept as the preset it matches. A bare
  // dietType (older clients) expands to its preset.
  const { dietType, eats: rawEats, ...rest } = input;
  const eats =
    rawEats !== undefined
      ? normalizeEats(rawEats)
      : dietType !== undefined
        ? [...DIET_PRESETS[dietType ?? "omnivore"]]
        : undefined;
  const patch = {
    ...rest,
    ...(eats ? { eats, dietType: presetFor(eats) } : {}),
  };
  await getDb()
    .insert(dietaryPreferences)
    .values({ userId, ...patch })
    .onConflictDoUpdate({
      target: dietaryPreferences.userId,
      set: { ...patch, updatedAt: new Date() },
    });
  return getPreferences(userId);
}

export async function getTargets(userId: string): Promise<TargetRowDTO[]> {
  const [stored, profile] = await Promise.all([
    getDb()
      .select()
      .from(nutrientTargets)
      .where(eq(nutrientTargets.userId, userId)),
    getProfile(userId),
  ]);
  const input = targetInputFrom(
    profile,
    localDate(new Date(), profile.timezone),
  );
  const computed = input ? computeTargets(input) : {};
  const byId = new Map(stored.map((t) => [t.nutrientId, t]));
  return NUTRIENTS.map((n) => {
    const t = byId.get(n.id);
    const c = computed[n.id];
    return {
      nutrientId: n.id,
      name: n.name,
      unit: n.unit,
      category: n.category,
      min: t?.minAmount ?? null,
      max: t?.maxAmount ?? null,
      source: t?.source ?? "default",
      computed: c ? { min: c.min, max: c.max } : null,
    };
  });
}

export type TargetEdit =
  | { nutrientId: number; min: number | null; max: number | null }
  | { nutrientId: number; reset: true };

/** Save user edits (source "user"), or reset targets to computed values. */
export async function updateTargets(
  userId: string,
  edits: TargetEdit[],
): Promise<TargetRowDTO[]> {
  const profile = await getProfile(userId);
  const input = targetInputFrom(
    profile,
    localDate(new Date(), profile.timezone),
  );
  const computed = input ? computeTargets(input) : {};
  await getDb().transaction(async (tx) => {
    for (const edit of edits) {
      const where = and(
        eq(nutrientTargets.userId, userId),
        eq(nutrientTargets.nutrientId, edit.nutrientId),
      );
      if ("reset" in edit) {
        const c = computed[edit.nutrientId];
        await tx.delete(nutrientTargets).where(where);
        if (c) {
          await tx.insert(nutrientTargets).values({
            userId,
            nutrientId: edit.nutrientId,
            minAmount: c.min,
            maxAmount: c.max,
            source: c.source,
          });
        }
        continue;
      }
      await tx
        .insert(nutrientTargets)
        .values({
          userId,
          nutrientId: edit.nutrientId,
          minAmount: edit.min,
          maxAmount: edit.max,
          source: "user",
        })
        .onConflictDoUpdate({
          target: [nutrientTargets.userId, nutrientTargets.nutrientId],
          set: { minAmount: edit.min, maxAmount: edit.max, source: "user" },
        });
    }
  });
  return getTargets(userId);
}
