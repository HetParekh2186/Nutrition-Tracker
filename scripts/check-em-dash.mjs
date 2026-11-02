// Fails if any given file contains an em dash (SPEC.md README requirements).
// Usage: node scripts/check-em-dash.mjs README.md [more files]
import { readFileSync } from "node:fs";

const EM_DASH = String.fromCharCode(0x2014);
let found = false;

for (const file of process.argv.slice(2)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes(EM_DASH)) {
        console.error(`${file}:${i + 1}: em dash found`);
        found = true;
      }
    });
}

process.exit(found ? 1 : 0);
