/**
 * Recursos (2026-11-28) — PURE. "Compartí fragmentos de tu alma": the pictures a
 * card shows (its stickers and the room's public images / GIFs; never the
 * profile photo nor the card's background) are its RESOURCES. Nothing is copied:
 * a resource is identified by its owner + key ("st:<sticker id>" / "im:<image
 * id>") and shown from the owner's own file. What people do with them (repost,
 * like, comment, download, report) lives in the tables of
 * supabase/migrations/20261128000000_resources.sql.
 */
import type { CanvasImage, CardSticker } from "@/types";
import type { PostAuthor } from "@/lib/wall";
import { originalSrc } from "@/lib/thumbImages";

export interface Resource { key: string; src: string; kind: "sticker" | "image"; aspect: number }
export interface ResourceStats {
  key: string; caption: string | null; noDownload: boolean; hidden: boolean; removed: boolean;
  likes: number; reposts: number; comments: number; downloads: number; liked: boolean; reposted: boolean;
}
export interface RepostItem { id: string; ownerId: string; ownerHandle: string; key: string; src: string; at: string; owner?: PostAuthor }

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const KEY = /^(st|im):[A-Za-z0-9_-]{1,64}$/;
export const isResourceKey = (k: unknown): k is string => typeof k === "string" && KEY.test(k);
const httpSrc = (s: unknown): s is string => typeof s === "string" && /^https?:\/\//.test(s) && s.length <= 600;

/** The card's stickers, then the room's public images (newest last), without repeats. */
export function resourcesOf(stickers: CardSticker[] | undefined, images: CanvasImage[] | undefined): Resource[] {
  const out: Resource[] = [];
  const seen = new Set<string>();
  // The phone profile draws resized copies (thumbImages.ts › phonePictures):
  // a resource always names the owner's own file.
  for (const raw of stickers ?? []) {
    const s = raw && { ...raw, src: originalSrc(raw.src) };
    if (!s || s.hidden || !ID.test(s.id) || !httpSrc(s.src) || seen.has(s.src)) continue;
    seen.add(s.src);
    out.push({ key: `st:${s.id}`, src: s.src, kind: "sticker", aspect: s.aspect > 0 ? s.aspect : 1 });
  }
  for (const rawI of images ?? []) {
    const i = rawI && { ...rawI, src: originalSrc(rawI.src) };
    if (!i || i.isPublic === false || !ID.test(i.id) || !httpSrc(i.src) || seen.has(i.src)) continue;
    seen.add(i.src);
    out.push({ key: `im:${i.id}`, src: i.src, kind: "image", aspect: i.w > 0 && i.h > 0 ? i.w / i.h : 1 });
  }
  return out;
}

/** A stats row from resource_stats → the client shape. */
export function statsFromRow(r: Record<string, unknown>): ResourceStats {
  return {
    key: String(r.rkey ?? ""), caption: typeof r.caption === "string" ? r.caption : null,
    noDownload: !!r.no_download, hidden: !!r.hidden, removed: !!r.removed,
    likes: Number(r.likes ?? 0), reposts: Number(r.reposts ?? 0), comments: Number(r.comments ?? 0),
    downloads: Number(r.downloads ?? 0), liked: !!r.liked, reposted: !!r.reposted,
  };
}

/** What visitors see in the Recursos row: not hidden, not removed (the owner sees hidden ones, dimmed). */
export function visibleResources(list: Resource[], stats: Map<string, ResourceStats>, owner: boolean): Resource[] {
  return list.filter(r => { const s = stats.get(r.key); return !s?.removed && (owner || !s?.hidden); });
}

export const CAPTION_MAX = 200;
export const RESOURCE_COMMENT_MAX = 280;

/** A file name for a download ("myland-<handle>-<n>.<ext>"). */
export function downloadName(src: string, handle: string, key: string): string {
  const ext = (/\.(png|jpe?g|gif|webp|svg|avif)(?:$|[?#])/i.exec(src)?.[1] ?? "png").toLowerCase().replace("jpeg", "jpg");
  const tag = key.slice(3, 11).replace(/[^A-Za-z0-9]/g, "");
  return `myland-${(handle || "recurso").replace(/[^A-Za-z0-9_-]/g, "")}-${tag}.${ext}`;
}

/** Error code from the resource RPCs → what the person reads. */
export function resourceError(msg: string | undefined): string {
  if (!msg) return "No se pudo.";
  if (msg.includes("verify_required")) return "Verificá tu cuenta.";
  if (msg.includes("too_fast")) return "Más despacio: probá en un ratito.";
  if (msg.includes("own_resource")) return "Ya está en tu card.";
  if (msg.includes("unavailable") || msg.includes("bad_src")) return "Ya no está disponible.";
  if (msg.includes("comments_off")) return "Los comentarios están cerrados.";
  if (msg.includes("blocked")) return "No podés comentar acá.";
  if (msg.includes("not_signed_in")) return "Iniciá sesión.";
  if (msg.includes("bad_length")) return "Demasiado largo.";
  return "No se pudo.";
}
