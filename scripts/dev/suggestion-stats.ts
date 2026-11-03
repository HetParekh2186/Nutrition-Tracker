// Dev check: the demo's top-5 suggestion save-or-cook rate.
// Usage: pnpm tsx scripts/dev/suggestion-stats.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getSuggestionStats } from "@/lib/insights/repo";

process.loadEnvFile(".env.local");

async function main() {
  const [demo] = await getDb().execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  console.log(await getSuggestionStats(demo!.id, 4));
  process.exit(0);
}
main();
