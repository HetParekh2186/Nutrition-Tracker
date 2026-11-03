// Dev check: sample USDA portion labels for common foods.
// Usage: pnpm tsx scripts/dev/portion-labels.ts
import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";

process.loadEnvFile(".env.local");
async function main() {
  const rows = await getDb().execute(sql`
  select f.name, p.label, p.grams from food_portions p join foods f on f.id = p.food_id
  where f.name ilike any (array['Egg, whole, raw, fresh','Bread, %sourdough%','Butter, salted','Milk, whole%','Banana%raw','Oil, olive%'])
  order by f.name limit 40`);
  for (const r of rows) console.log(r.name, "|", r.label, "|", r.grams);
  process.exit(0);
}
void main();
