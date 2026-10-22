"use client";
/**
 * The landing's and the auth page's connection to Supabase (Claude Design
 * "Landing v9" / "Auth v4"): the real name check and every auth action, in
 * the design's own words. The pages call these through props.
 */
import { createClient } from "@/lib/supabase/client";

/** Routes a handle can't take (myland.lol/<handle> would shadow them). */
export const RESERVED_HANDLES = new Set([
  "login", "dashboard", "auth", "api", "admin", "settings", "myland", "browse", "setup", "space", "reset-password", "landing",
]);
const HANDLE_RE = /^[a-z0-9_-]{3,20}$/;

export type HandleStatus = "ok" | "taken" | "invalid";
type Result = { error?: string; kind?: "exists" | "creds" | "network" | ""; sent?: boolean; next?: string };

/** Resolves with `fallback` when `p` takes longer than `ms` — the UI never
 * waits forever on a slow network. */
function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);
}
const SLOW: Result = { error: "No pudimos conectarnos. Revisá tu internet y probá de nuevo.", kind: "network" };

/** Is myland.lol/<h> free? (profiles.handle, reserved routes, temp_ handles) */
export async function checkHandle(h: string): Promise<HandleStatus> {
  if (!HANDLE_RE.test(h)) return "invalid";
  if (RESERVED_HANDLES.has(h) || h.startsWith("temp_")) return "taken";
  // Never block a sign-up on a failed or slow read; the insert is the real guard.
  const read = (async (): Promise<HandleStatus> => {
    try {
      const { data, error } = await createClient().from("profiles").select("id").eq("handle", h).maybeSingle();
      return error ? "ok" : data ? "taken" : "ok";
    } catch {
      return "ok";
    }
  })();
  return within(read, 4000, "ok");
}

const callback = (next?: string) =>
  `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

function friendly(message: string): Result {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return { error: "Ese email ya tiene una cuenta.", kind: "exists" };
  if (m.includes("invalid login credentials")) return { error: "Email o contraseña incorrectos.", kind: "creds" };
  if (m.includes("email not confirmed")) return { error: "Confirmá tu email: te mandamos un link para activar tu cuenta.", kind: "" };
  if (m.includes("for security purposes") || m.includes("rate limit")) return { error: "Demasiados intentos. Esperá un minuto y probá de nuevo.", kind: "" };
  if (m.includes("password")) return { error: "La contraseña no es válida: usá al menos 8 caracteres.", kind: "" };
  if (m.includes("fetch") || m.includes("network")) return { error: "No pudimos conectarnos. Revisá tu internet y probá de nuevo.", kind: "network" };
  return { error: message, kind: "" };
}

const actions = {
  /** Create the account with the claimed name. With email confirmation on, the
   * profile is created by /auth/callback from the name kept in the user's
   * metadata; without it, right here. */
  async register({ email, pass, handle }: { email: string; pass: string; handle: string }): Promise<Result> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { handle }, emailRedirectTo: callback() },
    });
    if (error) return friendly(error.message);
    // Supabase answers an existing (confirmed) email with a user without identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: "Ese email ya tiene una cuenta.", kind: "exists" };
    }
    if (!data.session) return { sent: true };
    if (data.user) {
      const { error: profErr } = await supabase.from("profiles").insert({
        user_id: data.user.id, handle, display_name: handle, onboarding_completed: true,
      });
      if (profErr && profErr.code === "23505") return { error: "Ese nombre se acaba de ocupar. Probá con otro.", kind: "" };
      if (profErr) return { error: "No pudimos crear tu sala: " + profErr.message, kind: "network" };
    }
    return { next: "/dashboard" };
  },

  async login({ email, pass }: { email: string; pass: string }): Promise<Result> {
    const { error } = await createClient().auth.signInWithPassword({ email, password: pass });
    if (error) return friendly(error.message);
    return { next: "/dashboard" };
  },

  /** "¿Te la olvidaste?": the email's link signs in and opens /reset-password. */
  async reset({ email }: { email: string }): Promise<Result> {
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") });
    if (error) return friendly(error.message);
    return { sent: true };
  },

  /** Resolves with an error message, or never (the browser leaves for Google). */
  async google(): Promise<string | null> {
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    return error ? friendly(error.message).error ?? error.message : null;
  },

  async resend(mode: string, email: string): Promise<string | null> {
    const supabase = createClient();
    const { error } = mode === "reset"
      ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") })
      : await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback() } });
    return error ? friendly(error.message).error ?? error.message : null;
  },
};

const guard = <A,>(fn: (a: A) => Promise<Result>) => (a: A) => within(fn(a).catch(() => SLOW), 20000, SLOW);

export const siteAuth = {
  register: guard(actions.register),
  login: guard(actions.login),
  reset: guard(actions.reset),
  google: () => within(actions.google().catch(() => SLOW.error!), 20000, SLOW.error!),
  resend: (mode: string, email: string) => within(actions.resend(mode, email).catch(() => SLOW.error!), 20000, SLOW.error!),
};
