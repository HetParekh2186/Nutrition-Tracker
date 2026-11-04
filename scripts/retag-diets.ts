// Recomputes every recipe's diet tags from its ingredients and their USDA
// names. Run after changing the rules in src/lib/recipes/diet.ts:
//   pnpm retag:diets

import { withDietTags } from "../src/lib/recipes/diet";
import { scriptSql } from "./lib/db";

async function main() {
  const sql = scriptSql();
  const rows = await sql<
    { id: string; tags: string[]; texts: string[] | null }[]
  >`
    select r.id, r.tags,
           array_agg(ri.display_text || ' ' || coalesce(f.name, ''))
             filter (where ri.id is not null) as texts
      from recipes r
      left join recipe_ingredients ri on ri.recipe_id = r.id
      left join foods f on f.id = ri.food_id
     group by r.id`;

  let changed = 0;
  for (const r of rows) {
    const tags = withDietTags(r.tags, r.texts ?? []);
    if (tags.join(",") === r.tags.join(",")) continue;
    await sql`update recipes set tags = ${tags} where id = ${r.id}`;
    changed++;
  }
  console.log(`Retagged ${changed} of ${rows.length} recipes.`);
  await sql.end();
}

void main();
