import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";

/** The signed-in user, or null — never waits more than `ms` (same idea as
 * middleware.ts: a slow Supabase must not hang the landing or the login). */
export async function currentUserFast(ms = 2500): Promise<User | null> {
  try {
    const supabase = await createClient();
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), ms));
    return await Promise.race([supabase.auth.getUser().then(r => r.data.user ?? null).catch(() => null), timeout]);
  } catch {
    return null;
  }
}
