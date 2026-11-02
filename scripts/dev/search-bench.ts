// Dev check: search quality and latency against the real database.
// Usage: pnpm tsx scripts/dev/search-bench.ts
import { searchFoods } from "@/lib/foods/repo";

process.loadEnvFile(".env.local");
const USER = "00000000-0000-0000-0000-000000000000";
const QUERIES = [
  "chicken breast",
  "egg",
  "chick",
  "greek yogurt",
  "brocoli",
  "basmati rice",
  "banana",
  "olive oil",
  "sourdough",
  "oats",
];

async function main() {
  const times: number[] = [];
  for (let round = 0; round < 3; round++) {
    for (const q of QUERIES) {
      const t = performance.now();
      const hits = await searchFoods(USER, q, 8);
      times.push(performance.now() - t);
      if (round === 2)
        console.log(
          q.padEnd(15),
          hits
            .slice(0, 3)
            .map((h) => h.name)
            .join(" | "),
        );
    }
  }
  times.sort((a, b) => a - b);
  const p = (x: number) => times[Math.floor(times.length * x)]!.toFixed(0);
  console.log(`n=${times.length} p50=${p(0.5)}ms p95=${p(0.95)}ms`);
  process.exit(0);
}
main();
