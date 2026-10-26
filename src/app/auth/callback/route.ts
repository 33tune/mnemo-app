import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isClaimableHandle, safeNextPath } from "@/lib/handles";

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

  // ── Profile check ─────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    // ── Email sign-up confirmed: the name claimed in /login travels in the
    // user's metadata — create the profile with it (onboarding done). If it
    // was taken meanwhile, fall through to the temp profile + /setup.
    const claimed = String(user.user_metadata?.handle ?? "").toLowerCase();
    if (isClaimableHandle(claimed)) {
      const { error: claimErr } = await supabase.from("profiles").insert({
        user_id:              user.id,
        handle:               claimed,
        display_name:         claimed,
        onboarding_completed: true,
      });
      if (!claimErr) return NextResponse.redirect(`${origin}${next}`);
    }

    // ── New OAuth user — create a temporary profile ──────────────────────────
    // User will choose their real handle in /setup.
    // Temp handle: "temp_" + first 15 hex chars of UUID (no hyphens) = 20 chars max.
    const tempHandle = `temp_${user.id.replace(/-/g, "").slice(0, 15)}`;
    const suggestedName = (user.user_metadata?.full_name as string | undefined) ?? null;

    // Retry handle collision (unlikely but possible if two users share the same prefix)
    for (let attempt = 0; attempt < 3; attempt++) {
      const suffix  = attempt === 0 ? "" : String(attempt);
      const handle  = `${tempHandle}${suffix}`.slice(0, 20);
      const { error: insertErr } = await supabase.from("profiles").insert({
        user_id:              user.id,
        handle,
        display_name:         suggestedName,
        onboarding_completed: false,
      });
      if (!insertErr) break;
      if (insertErr.code !== "23505") break; // non-recoverable
      // "23505" = duplicate key — try next suffix
    }

    return NextResponse.redirect(`${origin}/setup`);
  }

  // ── Existing profile — check onboarding status ────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((profile as any).onboarding_completed === false) {
    return NextResponse.redirect(`${origin}/setup`);
  }

  // ── Fully onboarded — send to intended destination ────────────────────────
  return NextResponse.redirect(`${origin}${next}`);
}
