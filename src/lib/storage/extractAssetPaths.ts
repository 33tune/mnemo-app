/**
 * Which Supabase Storage files a piece of saved data uses.
 *
 * The old version listed fields by hand (images, card backgrounds, photo,
 * wallpaper) and missed the logo, Music MP3s, the room's music, fonts and
 * cursors, link-button icons… — a garbage collector trusting it would have
 * deleted files still in use. This one scans EVERYTHING: any string anywhere
 * in the value that is a public Storage URL counts, whatever field holds it,
 * so new fields are covered without touching this file.
 *
 * Paths are "<bucket>/<path in the bucket>", e.g. "canvas-assets/<uid>/<id>.png".
 */

// Marker that distinguishes Supabase Storage public URLs from external URLs.
export const STORAGE_MARKER = "/storage/v1/object/public/";

/** A public Storage URL → "<bucket>/<path>"; null for anything else. */
export function toStoragePath(url: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) return null;
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return null;
  // Strip query params / fragments (cache-busting) and CSS url(...) leftovers.
  const path = decodeURIComponentSafe(url.slice(idx + STORAGE_MARKER.length).split(/[?#"')\s]/)[0]);
  return path && path.includes("/") ? path : null;
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Every Storage path used anywhere inside `value` (any depth, any field). */
export function collectStoragePaths(value: unknown, into: Set<string> = new Set()): Set<string> {
  const seen = new Set<object>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (!v.includes(STORAGE_MARKER)) return;
      // A string may hold several URLs (CSS, HTML): take each one.
      let from = 0;
      for (;;) {
        const at = v.indexOf(STORAGE_MARKER, from);
        if (at === -1) break;
        const p = toStoragePath(v.slice(at));
        if (p) into.add(p);
        from = at + STORAGE_MARKER.length;
      }
      return;
    }
    if (!v || typeof v !== "object") return;
    if (seen.has(v as object)) return;
    seen.add(v as object);
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    for (const x of Object.values(v as Record<string, unknown>)) walk(x);
  };
  walk(value);
  return into;
}

/** The Storage paths a saved canvas uses (deduplicated). */
export function extractAssetPaths(state: unknown): string[] {
  return [...collectStoragePaths(state)];
}
