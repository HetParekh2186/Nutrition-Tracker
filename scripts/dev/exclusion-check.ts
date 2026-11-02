// Dev check: the demo excludes shellfish, so no shrimp dish may appear.
// Usage: pnpm tsx scripts/dev/exclusion-check.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getRecommendations } from "@/lib/recommend/service";

process.loadEnvFile(".env.local");

async function main() {
  const [demo] = await getDb().execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  const r = await getRecommendations(demo!.id, "dinner", 30, {
    logImpressions: false,
  });
  const shrimp = r.items.some((i) => /shrimp/i.test(i.recipe.title));
  console.log(
    `dinner candidates: ${r.items.length}, shrimp present: ${shrimp}`,
  );
  process.exit(shrimp ? 1 : 0);
}
main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
