import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isClaimableHandle } from "@/lib/handles";

export type ProfileRow = { handle: string | null; display_name: string | null; onboarding_completed: boolean | null };

/**
 * The signed-in user's profile row, created when it's missing (2026-10-27).
 * A user can end up signed in without one: the email confirmation opened on
 * another device (or from a re-sent mail) never reaches /auth/callback with a
 * code, so the row the callback creates never exists; signing in with the
 * password afterwards then led to /setup, whose update touched no row and
 * sent the user back to /setup forever.
 *  - the name claimed at sign-up (user metadata) → a finished profile;
 *  - otherwise (or if it was taken meanwhile) → a temp_ profile for /setup.
 * Returns null only if the row can't be read or created.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User): Promise<ProfileRow | null> {
  const cols = "handle, display_name, onboarding_completed";
  const { data: found, error: readErr } = await supabase.from("profiles").select(cols).eq("user_id", user.id).maybeSingle();
  if (found) return found as ProfileRow;
  if (readErr) return null;

  const claimed = String(user.user_metadata?.handle ?? "").toLowerCase();
  if (isClaimableHandle(claimed)) {
    const { data, error } = await supabase.from("profiles")
      .insert({ user_id: user.id, handle: claimed, display_name: claimed, onboarding_completed: true })
      .select(cols).single();
    if (!error && data) return data as ProfileRow;
  }

  // Temp handle: "temp_" + first 15 hex chars of the id = 20 chars; a suffix on collision.
  const tempHandle = `temp_${user.id.replace(/-/g, "").slice(0, 15)}`;
  const suggestedName = (user.user_metadata?.full_name as string | undefined) ?? null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle = `${tempHandle}${attempt === 0 ? "" : attempt}`.slice(0, 20);
    const { data, error } = await supabase.from("profiles")
      .insert({ user_id: user.id, handle, display_name: suggestedName, onboarding_completed: false })
      .select(cols).single();
    if (!error && data) return data as ProfileRow;
    if (error?.code !== "23505") break;
  }
  // Another request may have created it meanwhile.
  const { data: again } = await supabase.from("profiles").select(cols).eq("user_id", user.id).maybeSingle();
  return (again as ProfileRow | null) ?? null;
}
