"use client";
/**
 * Verificación opcional (2026-11-27): an account is verified once its owner
 * proves the email is theirs (a 6-digit code by mail) or signed in with
 * Google (public.verified_users, set by public.mark_verified() from how the
 * session was made). Verified cards appear in Explorar and can recover the
 * account by mail. Never throws.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCaptchaToken } from "@/lib/captcha";

export const VERIFY_EVENT = "ml-verified";

type State = { verified: boolean | null; email: string | null; userId: string | null };
let cache: State | null = null;
let loading: Promise<State> | null = null;

async function load(): Promise<State> {
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { verified: null, email: null, userId: null };
    const { data } = await sb.from("verified_users").select("user_id").eq("user_id", user.id).maybeSingle();
    if (data) return { verified: true, email: user.email ?? null, userId: user.id };
    // A Google / code session marks itself (the database checks how it was made).
    const { data: marked } = await sb.rpc("mark_verified");
    return { verified: marked === true, email: user.email ?? null, userId: user.id };
  } catch {
    return { verified: null, email: null, userId: null };
  }
}

/** null = unknown / signed out (show nothing). */
export function useVerified(): State {
  const [s, setS] = useState<State>(cache ?? { verified: null, email: null, userId: null });
  useEffect(() => {
    let alive = true;
    if (!cache) {
      loading ??= load().then(r => { cache = r; return r; }).finally(() => { loading = null; });
      loading.then(r => { if (alive) setS(r); });
    }
    const on = () => { if (cache && alive) setS({ ...cache }); };
    window.addEventListener(VERIFY_EVENT, on);
    return () => { alive = false; window.removeEventListener(VERIFY_EVENT, on); };
  }, []);
  return s;
}

/** Sends the 6-digit code to the account's email. */
export async function sendVerifyCode(email: string): Promise<string | null> {
  try {
    const captchaToken = await getCaptchaToken();
    const { error } = await createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false, captchaToken } });
    if (!error) return null;
    const m = error.message.toLowerCase();
    if (m.includes("rate") || m.includes("seconds") || m.includes("security")) return "Esperá un minuto y pedí otro código.";
    return "No pudimos mandar el código. Probá de nuevo en un rato.";
  } catch { return "No pudimos conectarnos. Revisá tu internet."; }
}

/** Checks the code; on success the account is verified. */
export async function confirmVerifyCode(email: string, code: string): Promise<string | null> {
  try {
    const sb = createClient();
    let { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) ({ error } = await sb.auth.verifyOtp({ email, token: code, type: "magiclink" }));
    if (error) return "Ese código no es o ya venció. Pedí uno nuevo.";
    const { data } = await sb.rpc("mark_verified");
    if (data !== true) return "No pudimos verificarte. Probá de nuevo.";
    cache = { ...(cache ?? { email, userId: null }), verified: true };
    window.dispatchEvent(new Event(VERIFY_EVENT));
    return null;
  } catch { return "No pudimos conectarnos. Revisá tu internet."; }
}

/** The pill can be put away for this visit. */
const HIDE_KEY = "ml_verify_pill_hidden";
export function verifyPillHidden(): boolean { try { return sessionStorage.getItem(HIDE_KEY) === "1"; } catch { return false; } }
export function hideVerifyPill() { try { sessionStorage.setItem(HIDE_KEY, "1"); } catch { /* blocked */ } window.dispatchEvent(new Event(VERIFY_EVENT)); }

/** Something needs a verified account: opens the verify dialog (VerifyGate). */
export const NEED_VERIFY_EVENT = "ml-need-verify";
export function requestVerify() { if (typeof window !== "undefined") window.dispatchEvent(new Event(NEED_VERIFY_EVENT)); }
/** True for the database's "verify first" answers (post / like / favorite / upload). */
export function isVerifyError(e: { message?: string; code?: string } | null | undefined): boolean {
  if (!e) return false;
  return (e.message ?? "").includes("verify_required") || e.code === "42501" || /row-level security/i.test(e.message ?? "");
}
