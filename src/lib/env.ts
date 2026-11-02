import { z } from "zod";

// Parsed lazily so `next build` works without secrets (for example in CI).
// Public vars must be read as literal `process.env.NEXT_PUBLIC_*` expressions
// so Next.js can inline them into the browser bundle.

const PublicEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof PublicEnv>;

let publicEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  publicEnv ??= PublicEnv.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return publicEnv;
}

const ServerEnv = z.object({
  DATABASE_URL: z.string().startsWith("postgres"),
});

export type ServerEnv = z.infer<typeof ServerEnv>;

let serverEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  serverEnv ??= ServerEnv.parse({ DATABASE_URL: process.env.DATABASE_URL });
  return serverEnv;
}
