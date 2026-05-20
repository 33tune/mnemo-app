import type { CanvasState } from "@/types";

// Marker that distinguishes Supabase Storage public URLs from external URLs.
const STORAGE_MARKER = "/storage/v1/object/public/";

/**
 * Convert a raw URL to its storage path (bucket/filename).
 * Returns null for blob:, data:, external URLs, and empty strings.
 */
function toStoragePath(url: unknown): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) return null;
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx === -1) return null;
  // Strip query params — public URLs occasionally have cache-busting params
  const path = url.slice(idx + STORAGE_MARKER.length).split("?")[0];
  return path || null;
}

/**
 * Scan every asset-bearing field in a CanvasState and return the deduplicated
 * list of Supabase Storage paths (e.g. "canvas-assets/uuid.png").
 *
 * Add new element types or fields here as the schema grows.
 */
export function extractAssetPaths(state: CanvasState): string[] {
  const paths = new Set<string>();

  const add = (url?: string | null) => {
    const p = toStoragePath(url);
    if (p) paths.add(p);
  };

  // ── images ─────────────────────────────────────────────────────────────────
  for (const img of state.images ?? []) {
    add(img.src);
  }

  // ── cards ──────────────────────────────────────────────────────────────────
  for (const card of state.cards ?? []) {
    add(card.bgImage);
  }

  // ── galleries ──────────────────────────────────────────────────────────────
  for (const gallery of state.galleries ?? []) {
    for (const gi of gallery.images ?? []) {
      add(gi.src);
    }
  }

  // ── profiles ───────────────────────────────────────────────────────────────
  for (const profile of state.profiles ?? []) {
    add(profile.photo);
    add(profile.bgImage);
  }

  // ── postItBoards ───────────────────────────────────────────────────────────
  for (const board of state.postItBoards ?? []) {
    add(board.bgImageUrl);
    for (const post of board.posts ?? []) {
      add(post.photo);
    }
  }

  // ── wallpaper ──────────────────────────────────────────────────────────────
  add(state.wallpaper);

  // NOTE: medias[].url is an external embed link (Spotify / YouTube / SoundCloud).
  // NOTE: texts have no asset references.

  return Array.from(paths);
}
