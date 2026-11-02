// Dev check: how ingredient-style queries resolve.
// Usage: pnpm tsx scripts/dev/resolve-smoke.ts
import { resolveFoodQuery } from "@/lib/foods/resolve";

process.loadEnvFile(".env.local");
const USER = "00000000-0000-0000-0000-000000000000";
const QUERIES = [
  "garlic, raw",
  "chicken thigh, boneless, raw",
  "olive oil",
  "quinoa, uncooked",
  "greek yogurt, plain",
  "cilantro",
  "basmati rice, dry",
  "egg, whole, raw",
  "sourdough bread",
  "black coffee",
  "butter",
  "red lentils, dry",
  "chickpeas, canned",
  "garam masala",
];

async function main() {
  for (const q of QUERIES) {
    const r = await resolveFoodQuery(USER, q);
    console.log(
      q.padEnd(30),
      r.confidence.toFixed(2),
      "|",
      r.best?.name.slice(0, 60),
    );
  }
  process.exit(0);
}
main();
