// Dev check: food counts by source.
// Usage: pnpm tsx scripts/dev/count-foods.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";

process.loadEnvFile(".env.local");
async function main() {
  const rows = await getDb().execute(
    sql`select source, count(*)::int as n from foods group by source order by n desc`,
  );
  for (const r of rows) console.log(r.source, r.n);
  process.exit(0);
}
void main();
