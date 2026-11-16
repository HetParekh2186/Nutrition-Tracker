// Fills in everyday names for USDA foods ("Olive oil" for "Oil, olive,
// salad or cooking"). Run after changing the rules in src/lib/foods/names.ts:
//   pnpm name:foods

import { commonName } from "../src/lib/foods/names";
import { chunk, scriptSql } from "./lib/db";

async function main() {
  const sql = scriptSql();
  const rows = await sql<
    { id: number; name: string; source: string; common_name: string | null }[]
  >`select id, name, source, common_name from foods where source like 'usda%'`;

  const changes = rows.flatMap((r) => {
    const plain = commonName(r.name, r.source);
    const next = plain === r.name ? null : plain;
    return next === r.common_name ? [] : [{ id: Number(r.id), name: next }];
  });
  for (const batch of chunk(changes, 1000)) {
    await sql`
      update foods set common_name = v.name
        from (select unnest(${sql.array(batch.map((c) => c.id))}::bigint[]) as id,
                     unnest(${sql.array(batch.map((c) => c.name ?? ""))}::text[]) as name) v
       where foods.id = v.id`;
  }
  await sql`update foods set common_name = null where common_name = ''`;
  console.log(`Named ${changes.length} of ${rows.length} USDA foods.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
