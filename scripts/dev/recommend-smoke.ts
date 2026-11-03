// Dev check: what the demo account is recommended, and why.
// Usage: pnpm tsx scripts/dev/recommend-smoke.ts [slot]
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import type { MealSlot } from "@/lib/db/enums";
import { getRecommendations } from "@/lib/recommend/service";

process.loadEnvFile(".env.local");

async function main() {
  const slot = (process.argv[2] ?? "dinner") as MealSlot;
  const [demo] = await getDb().execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  const t = performance.now();
  const r = await getRecommendations(demo!.id, slot, 6, {
    logImpressions: false,
  });
  console.log(
    `${slot} in ${Math.round(performance.now() - t)} ms, personalized=${r.personalized}`,
  );
  console.log(
    "budget",
    Object.fromEntries(
      Object.entries(r.budget).map(([k, v]) => [k, Math.round(v)]),
    ),
  );
  for (const i of r.items) {
    const b = i.breakdown;
    console.log(
      `${i.score.toFixed(3)} ${i.recipe.title.padEnd(36)} M${b.M} T${b.T} C${b.C} N${b.N} R${b.R} D${b.D} | ${i.reasons.join(" · ")}`,
    );
  }
  process.exit(0);
}
main();
