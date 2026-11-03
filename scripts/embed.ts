// Fill in missing recipe embeddings, or re-embed everything with --all
// (do that after adding a VOYAGE_API_KEY so all vectors share one space),
// then rebuild every taste profile.
// Usage: pnpm embed [--all]

import { embeddingProvider } from "@/lib/embeddings";
import { embedRecipes } from "@/lib/recommend/embed-repo";
import { rebuildAllTasteProfiles } from "@/lib/recommend/taste-repo";

import { loadEnv } from "./lib/db";

loadEnv();

async function main() {
  const all = process.argv.includes("--all");
  const n = await embedRecipes({ all });
  const users = await rebuildAllTasteProfiles();
  console.log(
    `Embedded ${n} recipes with the ${embeddingProvider()} provider; rebuilt ${users} taste profiles.`,
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
