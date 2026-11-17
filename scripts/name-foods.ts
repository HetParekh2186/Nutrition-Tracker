// Fills in everyday names and restaurant brands for USDA foods ("Olive oil"
// for "Oil, olive, salad or cooking"; "Big Mac" from McDonald's). Run after
// changing the rules in src/lib/foods/names.ts:
//   pnpm name:foods

import { everydayFood } from "../src/lib/foods/names";
import { chunk, scriptSql } from "./lib/db";

async function main() {
  const sql = scriptSql();
  const rows = await sql<
    {
      id: number;
      name: string;
      source: string;
      common_name: string | null;
      brand: string | null;
    }[]
  >`select id, name, source, common_name, brand from foods where source like 'usda%'`;

  const changes = rows.flatMap((r) => {
    const plain = everydayFood(r.name, r.source);
    const name = plain.name === r.name ? null : plain.name;
    return name === r.common_name && plain.brand === r.brand
      ? []
      : [{ id: Number(r.id), name, brand: plain.brand }];
  });
  for (const batch of chunk(changes, 1000)) {
    await sql`
      update foods set common_name = nullif(v.name, ''), brand = nullif(v.brand, '')
        from (select unnest(${sql.array(batch.map((c) => c.id))}::bigint[]) as id,
                     unnest(${sql.array(batch.map((c) => c.name ?? ""))}::text[]) as name,
                     unnest(${sql.array(batch.map((c) => c.brand ?? ""))}::text[]) as brand) v
       where foods.id = v.id`;
  }
  console.log(`Renamed ${changes.length} of ${rows.length} USDA foods.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
