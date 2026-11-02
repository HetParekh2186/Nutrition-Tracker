// Database access for one-off scripts. Uses the session pooler
// (MIGRATION_DATABASE_URL) because bulk loads and long transactions do not
// suit the transaction pooler.

import postgres from "postgres";

export function loadEnv(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No file: rely on the real environment (CI, Vercel).
  }
}

export function scriptSql() {
  loadEnv();
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL in .env.local");
  }
  return postgres(url, { max: 4, onnotice: () => {} });
}

/** Split an array into chunks for batched inserts. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}
