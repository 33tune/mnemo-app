/**
 * Profile names (myland.lol/<handle>): one rule for the landing, the auth page
 * and the server (/auth/callback creates the profile from the name the user
 * claimed — metadata the client controls, so the server checks it again).
 */
export const HANDLE_RE = /^[a-z0-9_-]{3,20}$/;

/** Routes a handle can't take (myland.lol/<handle> would shadow them). */
export const RESERVED_HANDLES = new Set([
  "login", "dashboard", "auth", "api", "admin", "settings", "myland", "browse", "setup", "space", "reset-password", "landing", "crews",
]);

export function isClaimableHandle(h: string): boolean {
  return HANDLE_RE.test(h) && !RESERVED_HANDLES.has(h) && !h.startsWith("temp_");
}

/** A post-login destination: only a path on this site ("/x", never "//x",
 * "/\x" or anything that is not a path) — no open redirect. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return /^[\x21-\x7e]*$/.test(next) ? next : fallback;
}
