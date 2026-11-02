// Dev check: demo averages over 30 days and top protein sources.
// Usage: pnpm tsx scripts/dev/insights-smoke.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getRangeSummary, getSources } from "@/lib/insights/repo";
import { addDays, localDate } from "@/lib/nutrition/dates";

process.loadEnvFile(".env.local");

async function main() {
  const [demo] = await getDb().execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  const to = localDate(new Date(), "America/Chicago");
  const from = addDays(to, -29);
  const t = performance.now();
  const s = await getRangeSummary(demo!.id, from, to);
  console.log(
    `range ${Math.round(performance.now() - t)} ms, logged ${s.loggedDays}/30`,
  );
  console.log(
    "avg",
    Object.fromEntries(
      Object.entries(s.averageMacros).map(([k, v]) => [k, Math.round(v)]),
    ),
  );
  console.log(
    "target",
    Object.fromEntries(
      Object.entries(s.targetMacros).map(([k, v]) => [k, Math.round(v)]),
    ),
  );
  const low = s.nutrients
    .filter(
      (n) => n.target?.min && n.amount !== null && n.amount < n.target.min,
    )
    .map((n) => `${n.name} ${Math.round((n.amount! / n.target!.min!) * 100)}%`);
  console.log("below target:", low.join(", "));
  const src = await getSources(demo!.id, 1003, from, to);
  console.log(
    "protein sources:",
    src!.sources
      .slice(0, 4)
      .map((x) => `${x.name.slice(0, 30)} ${Math.round(x.share * 100)}%`)
      .join(" | "),
  );
  process.exit(0);
}
main();
