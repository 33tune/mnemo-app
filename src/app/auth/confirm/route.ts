import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/handles";
import { ensureProfile } from "@/server/ensureProfile";

/**
 * The link in the confirmation email (2026-11-25): `/auth/confirm?token_hash=…&type=email`.
 * Unlike the PKCE `?code=` link, a token hash verifies in ANY browser and signs
 * in right there — the mail is often opened in Gmail / Chrome, not in the
 * TikTok browser where the account was created. The link also stays on
 * myland.lol (a link to another domain is a spam signal).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") || "email") as EmailOtpType;
  const next = safeNextPath(searchParams.get("next"));
  if (!tokenHash) return NextResponse.redirect(`${origin}/login?mode=login&error=confirmed`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return NextResponse.redirect(`${origin}/login?mode=login&error=confirmed`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?mode=login&error=confirmed`);
  // Google / mail link = the email is theirs: verified (the database reads how
  // the session was made, public.mark_verified). Never blocks the sign-in.
  try { await supabase.rpc("mark_verified"); } catch { /* optional */ }
  const profile = await ensureProfile(supabase, user);
  if (!profile || profile.onboarding_completed === false) return NextResponse.redirect(`${origin}/setup`);
  return NextResponse.redirect(`${origin}${next}`);
}
