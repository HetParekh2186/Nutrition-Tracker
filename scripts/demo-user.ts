// Creates the demo account, or resets its password to DEMO_PASSWORD.
// Usage: pnpm demo:user

import { scriptSql } from "./lib/db";
import { DEFAULT_DEMO_EMAIL, ensureDemoUser } from "./lib/demo-user";

const sql = scriptSql();
const email = process.env.DEMO_EMAIL ?? DEFAULT_DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;

if (!password || password.length < 12) {
  console.error("Set DEMO_PASSWORD (12+ characters) in .env.local first.");
  process.exit(1);
}

ensureDemoUser(sql, email, password)
  .then((id) => console.log(`Demo user ${email} ready (${id}).`))
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
