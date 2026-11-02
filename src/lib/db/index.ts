import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

// Reuse one pool across hot reloads in dev and warm serverless invocations.
const globalForDb = globalThis as unknown as { db?: Db };

export function getDb(): Db {
  if (!globalForDb.db) {
    // `prepare: false` is required by Supabase's transaction pooler (port 6543).
    const client = postgres(getServerEnv().DATABASE_URL, { prepare: false });
    globalForDb.db = drizzle(client, { schema, casing: "snake_case" });
  }
  return globalForDb.db;
}
