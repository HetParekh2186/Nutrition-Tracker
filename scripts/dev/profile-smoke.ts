// Dev check: profile update recomputes targets and keeps user edits.
// Usage: pnpm tsx scripts/dev/profile-smoke.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getTargets, updateProfile, updateTargets } from "@/lib/profile/repo";

process.loadEnvFile(".env.local");

async function main() {
  const [demo] = await getDb().execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  if (!demo) throw new Error("Run pnpm demo:user first");
  const id = demo.id;
  await updateProfile(id, {
    sex: "male",
    birthDate: "2006-01-15",
    heightCm: 178,
    weightKg: 75,
    activityLevel: "moderate",
    goal: "maintain",
    completeOnboarding: true,
  });
  const pick = async (n: number) =>
    (await getTargets(id)).find((t) => t.nutrientId === n);
  console.log("energy", await pick(1008));
  await updateTargets(id, [{ nutrientId: 1003, min: 160, max: null }]);
  await updateProfile(id, { goal: "lose" });
  console.log(
    "after goal=lose energy",
    (await pick(1008))?.min,
    "protein (user)",
    (await pick(1003))?.min,
    (await pick(1003))?.source,
  );
  await updateTargets(id, [{ nutrientId: 1003, reset: true }]);
  await updateProfile(id, { goal: "maintain" });
  console.log(
    "reset protein",
    (await pick(1003))?.min,
    (await pick(1003))?.source,
  );
  process.exit(0);
}
main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
