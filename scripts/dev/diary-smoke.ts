// Dev check: exercise the diary data layer against the real database on a
// throwaway date, compare totals with a hand calculation, then clean up.
// Usage: pnpm tsx scripts/dev/diary-smoke.ts

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  addEntry,
  copyEntries,
  deleteEntry,
  getDaySummary,
  getDiaryDay,
  updateEntry,
} from "@/lib/diary/repo";
import { searchFoods } from "@/lib/foods/repo";

process.loadEnvFile(".env.local");

const DAY = "2000-01-01";
const NEXT = "2000-01-02";

async function main() {
  const db = getDb();
  const [user] = await db.execute<{ id: string }>(
    sql`select id from users order by created_at limit 1`,
  );
  if (!user) throw new Error("No users yet; sign in once first.");
  const userId = user.id;
  await db.execute(
    sql`delete from diary_entries where user_id = ${userId} and entry_date in (${DAY}, ${NEXT})`,
  );

  const [chicken] = await searchFoods(userId, "chicken breast roasted", 1);
  const [egg] = await searchFoods(userId, "egg whole raw fresh", 1);
  if (!chicken || !egg) throw new Error("Search found nothing");
  console.log("foods:", chicken.name, "|", egg.name);

  const a = await addEntry(userId, {
    date: DAY,
    mealSlot: "lunch",
    loggedVia: "search",
    item: { kind: "food", foodId: chicken.id, quantityG: 180 },
  });
  await addEntry(userId, {
    date: DAY,
    mealSlot: "breakfast",
    loggedVia: "search",
    item: {
      kind: "food",
      foodId: egg.id,
      quantityG: 100,
      portionLabel: "2 large",
    },
  });

  const summary = await getDaySummary(userId, DAY);
  const expectedProtein =
    ((chicken.per100g[1003] ?? 0) * 180) / 100 + (egg.per100g[1003] ?? 0);
  const expectedKcal =
    ((chicken.per100g[1008] ?? 0) * 180) / 100 + (egg.per100g[1008] ?? 0);
  console.log(
    "protein",
    summary.consumed.proteinG.toFixed(3),
    "expected",
    expectedProtein.toFixed(3),
  );
  console.log(
    "kcal",
    summary.consumed.kcal.toFixed(3),
    "expected",
    expectedKcal.toFixed(3),
  );
  if (Math.abs(summary.consumed.proteinG - expectedProtein) > 1e-9)
    throw new Error("protein mismatch");
  if (Math.abs(summary.consumed.kcal - expectedKcal) > 1e-9)
    throw new Error("kcal mismatch");

  const vitK = summary.nutrients.find((n) => n.id === 1185);
  console.log(
    "vitamin K coverage",
    vitK?.known,
    "of",
    vitK?.total,
    "targets default:",
    summary.targetsAreDefaults,
  );

  await updateEntry(userId, a, { quantityG: 200, mealSlot: "dinner" });
  const day = await getDiaryDay(userId, DAY);
  console.log(
    "dinner:",
    day.slots.dinner.map((e) => `${e.name} ${e.quantityG} g`),
  );

  console.log("copied:", await copyEntries(userId, DAY, NEXT));
  console.log(
    "copied breakfast to snack:",
    await copyEntries(userId, DAY, DAY, "breakfast", "snack"),
  );
  console.log(
    "deleted:",
    await deleteEntry(userId, a),
    "again:",
    await deleteEntry(userId, a),
  );
  console.log(
    "other user cannot delete:",
    await deleteEntry("00000000-0000-0000-0000-000000000000", a),
  );

  await db.execute(
    sql`delete from diary_entries where user_id = ${userId} and entry_date in (${DAY}, ${NEXT})`,
  );
  console.log("OK");
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
