// Seeds the nutrients table from src/lib/nutrition/catalog.ts.
// Usage: pnpm db:seed:nutrients

import { scriptSql } from "./lib/db";
import { seedNutrients } from "./lib/nutrients";

const sql = scriptSql();
seedNutrients(sql)
  .then((count) => console.log(`Seeded ${count} nutrients.`))
  .finally(() => sql.end());
