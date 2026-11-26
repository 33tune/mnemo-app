/**
 * Explorar (2026-11-26): the grid draws many real cards at once. Their
 * pictures (photo, card background, stickers, logos, the room wallpaper) are
 * full-size uploads and GIFs — dozens of megapixels decoded together made
 * iPhone Safari reload the page ("ocurrió un problema"). Every picture of our
 * own storage goes through /api/thumb instead: small, and GIFs / animated
 * WebP become their first frame.
 */
import { STORAGE_MARKER } from "@/lib/storage/extractAssetPaths";

export const THUMB_PATH = "/api/thumb";

/** Our storage, and only that (the thumb route fetches it server side). */
export function isOwnStorageUrl(u: string, supabaseUrl: string): boolean {
  if (!supabaseUrl) return false;
  try {
    const a = new URL(u), b = new URL(supabaseUrl);
    return a.protocol === "https:" && a.host === b.host && a.pathname.startsWith(STORAGE_MARKER);
  } catch { return false; }
}

export function thumbUrl(u: string, w: number): string {
  return `${THUMB_PATH}?w=${w}&u=${encodeURIComponent(u)}`;
}

/** Every string anywhere in `value` that is a picture of our storage becomes
 * its thumbnail; everything else is kept as is (a new object, never mutated). */
export function thumbify<T>(value: T, w: number, supabaseUrl: string): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return isOwnStorageUrl(v, supabaseUrl) ? thumbUrl(v, w) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x);
      return out;
    }
    return v;
  };
  return walk(value) as T;
}

/** Phones: the card's look without the layers that weigh (particles, canvases,
 * motion, retro, entrance, backdrop blur). Holo and the reflection stay quiet. */
const LITE_KEEP = new Set(["bg", "border", "glow", "shadow", "text", "textRoles", "pfp", "gradient", "holo", "glare", "edge", "paused"]);
export function liteEffects<E extends Record<string, unknown> | undefined>(fx: E): E {
  if (!fx || typeof fx !== "object") return fx;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fx)) {
    if (!LITE_KEEP.has(k)) continue;
    if (k === "glow" && v && typeof v === "object") out[k] = { ...(v as object), animation: undefined };
    else if (k === "holo" && v && typeof v === "object") out[k] = { ...(v as object), idle: false };
    else if (k === "bg" && v && typeof v === "object") out[k] = { ...(v as object), blur: 0, glass: false };
    else out[k] = v;
  }
  return out as E;
}
