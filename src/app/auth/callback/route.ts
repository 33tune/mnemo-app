import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/handles";
import { ensureProfile } from "@/server/ensureProfile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only a path on this site: `${origin}${next}` with next="@evil.com" would
  // send the user to another host (open redirect).
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeErr) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // ── Profile: the existing one, or created now (the name claimed at sign-up,
  // else a temp_ one for /setup) — ensureProfile.ts.
  const profile = await ensureProfile(supabase, user);
  if (!profile || profile.onboarding_completed === false) {
    return NextResponse.redirect(`${origin}/setup`);
  }

  // ── Fully onboarded — send to intended destination ────────────────────────
  return NextResponse.redirect(`${origin}${next}`);
}
