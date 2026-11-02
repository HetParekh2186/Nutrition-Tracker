import { NUTRIENTS } from "../../src/lib/nutrition/catalog";

import type { scriptSql } from "./db";

/** Upsert the nutrient catalog. Safe to re-run. */
export async function seedNutrients(sql: ReturnType<typeof scriptSql>) {
  const rows = NUTRIENTS.map((n, i) => ({
    id: n.id,
    name: n.name,
    unit: n.unit,
    category: n.category,
    display_order: i,
  }));
  await sql`
    insert into nutrients ${sql(rows)}
    on conflict (id) do update set
      name = excluded.name,
      unit = excluded.unit,
      category = excluded.category,
      display_order = excluded.display_order
  `;
  return rows.length;
}
