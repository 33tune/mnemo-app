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

/**
 * The phone profile (2026-11-28, @valo reloaded Safari on an iPhone 14 Pro): a
 * card with many GIF stickers, an animated logo and an animated wall button
 * decoded ~220 MB of frames, most of them far bigger than they are shown (a
 * 2048 px sticker drawn at 100 px). Every picture of our storage the phone
 * draws goes through /api/thumb?anim=1 at about twice the size it is shown on
 * the widest phone, keeping its animation. Resources keep their original URL
 * (`originalSrc`): reposts and downloads name the owner's file.
 */
const PHONE_W = 430;           // the widest phone, CSS px
const PHONE_DPR = 2;           // sharp enough for decorations; 3 would cost 2.25×
const ANIM_SIZES = [160, 240, 400, 640, 960, 1280];

export function animThumbUrl(u: string, px: number): string {
  const w = ANIM_SIZES.find(s => s >= px) ?? ANIM_SIZES[ANIM_SIZES.length - 1];
  return `${THUMB_PATH}?anim=1&w=${w}&u=${encodeURIComponent(u)}`;
}

/** A thumb URL back to the file it was made from (anything else unchanged). */
export function originalSrc(src: string): string {
  if (!src.startsWith(THUMB_PATH + "?")) return src;
  try { return new URL(src, "https://x.invalid").searchParams.get("u") || src; } catch { return src; }
}

type Pics = {
  profiles?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
  wallpaper?: string;
};

export function phonePictures<T extends Pics>(state: T, supabaseUrl: string): T {
  const card = (state.profiles ?? [])[0] as Record<string, unknown> | undefined;
  const cw = Number(card?.w) || 360;
  const ch = Number(card?.h) || 480;
  // Same zoom rule as the phone view (mobileFit.ts: margin 16, at most 1.6×).
  const k = Math.min(1.6, (PHONE_W - 32) / cw) * PHONE_DPR;
  const pic = (u: unknown, cssPx: number) =>
    typeof u === "string" && isOwnStorageUrl(u, supabaseUrl) ? animThumbUrl(u, Math.ceil(cssPx * k)) : u;
  const big = Math.max(cw, ch, 380, 600);

  const profiles = (state.profiles ?? []).map(p => {
    const out: Record<string, unknown> = { ...p };
    out.photo = pic(p.photo, Number(p.pfpSizePx) || 160);
    const logo = p.logo as Record<string, unknown> | undefined;
    if (logo) out.logo = { ...logo, url: pic(logo.url, Math.max(Number(logo.w) || 120, Number(logo.h) || 120)) };
    if (Array.isArray(p.stickers)) {
      out.stickers = (p.stickers as Array<Record<string, unknown>>).map(s => {
        const w = (Number(s.w) || 0.3) * cw;
        const a = Number(s.aspect) > 0 ? Number(s.aspect) : 1;
        return { ...s, src: pic(s.src, Math.max(w, w / a)) };
      });
    }
    const box = p.commentsBox as Record<string, unknown> | undefined;
    const btn = box?.button as Record<string, unknown> | undefined;
    if (box && btn) out.commentsBox = { ...box, button: { ...btn, image: pic(btn.image, Number(btn.size) || 40) } };
    for (const key of ["effects", "wallEffects"] as const) {
      const fx = p[key] as Record<string, unknown> | undefined;
      const bg = fx?.bg as Record<string, unknown> | undefined;
      if (fx && bg) out[key] = { ...fx, bg: { ...bg, image: pic(bg.image, big) } };
    }
    return out;
  });
  const images = (state.images ?? []).map(i => ({ ...i, src: pic(i.src, Math.max(Number(i.w) || 200, Number(i.h) || 200)) }));
  const wallpaper = pic(state.wallpaper, 900) as string | undefined;
  return { ...state, profiles, images, ...(state.wallpaper !== undefined ? { wallpaper } : {}) } as T;
}
