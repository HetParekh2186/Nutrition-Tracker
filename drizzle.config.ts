import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local ourselves.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No file (CI): rely on the real environment.
}

// Migrations need a session connection (port 5432); the app uses the
// transaction pooler (port 6543), which cannot run some DDL safely.
const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: url ?? "" },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
