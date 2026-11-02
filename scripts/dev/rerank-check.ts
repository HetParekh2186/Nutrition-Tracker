// Phase 4 done-when: suggestions visibly change after you cook and rate a
// few recipes. Cooks and rates three Asian dishes for the demo, compares
// the dinner suggestions before and after, then removes what it added.
// Usage: pnpm tsx scripts/dev/rerank-check.ts

import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { recipeInteractions, recipes } from "@/lib/db/schema";
import { recordInteraction } from "@/lib/recommend/interactions";
import { getRecommendations } from "@/lib/recommend/service";
import { rebuildTasteProfile } from "@/lib/recommend/taste-repo";

process.loadEnvFile(".env.local");

const COOKED = [
  "Salmon teriyaki rice bowl",
  "Thai basil chicken",
  "Beef bulgogi bowl",
];

async function main() {
  const db = getDb();
  const [demo] = await db.execute<{ id: string }>(
    sql`select id from users where is_demo limit 1`,
  );
  const userId = demo!.id;
  const cooked = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(inArray(recipes.title, COOKED));

  const snapshot = async () =>
    (
      await getRecommendations(userId, "dinner", 10, { logImpressions: false })
    ).items.map(
      (i) =>
        `${i.recipe.title} ${i.score.toFixed(3)} [${i.reasons.join("; ")}]`,
    );

  const before = await snapshot();
  const started = new Date();
  try {
    for (const { id } of cooked) {
      await recordInteraction(userId, id, "cook_complete");
      await recordInteraction(userId, id, "log");
      await recordInteraction(userId, id, "rate", 5);
    }
    await rebuildTasteProfile(userId);
    const after = await snapshot();

    console.log("before:\n  " + before.join("\n  "));
    console.log("after:\n  " + after.join("\n  "));
    const order = (list: string[]) =>
      list.map((s) => s.split(" [")[0]!.replace(/ [\d.]+$/, ""));
    const reordered = order(before).some((t, i) => order(after)[i] !== t);
    console.log(
      reordered ? "Order changed." : "Order unchanged; scores and reasons:",
      before.join() !== after.join(),
    );
    process.exitCode = reordered ? 0 : 1;
  } finally {
    await db
      .delete(recipeInteractions)
      .where(
        and(
          eq(recipeInteractions.userId, userId),
          gte(recipeInteractions.createdAt, started),
        ),
      );
    await rebuildTasteProfile(userId);
  }
  process.exit();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
