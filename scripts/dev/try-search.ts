import { loadEnv } from "../lib/db";
loadEnv();
async function main() {
  const { searchFoodsPlanned } = await import("../../src/lib/foods/repo");
  const uid = "00000000-0000-0000-0000-000000000000";
  for (const q of process.argv.slice(2)) {
    const r = await searchFoodsPlanned(uid, q, 6);
    console.log(`\n# ${q}${r.corrected ? ` -> ${r.corrected}` : ""}`);
    for (const h of r.hits)
      console.log(`  ${h.name}${h.brand ? `  [${h.brand}]` : ""}`);
  }
  process.exit(0);
}
main();
