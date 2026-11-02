import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id, verified from the JWT, or null. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
