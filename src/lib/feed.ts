/**
 * Feed (2026-11-28; its own panel next to Explorar) — what one item is, and the
 * PURE rules for showing them:
 *   - groupFeed: someone who reposts many pictures in a short time shows as ONE
 *     block ("@luna reposteó 7 cosas"), so the feed is not flooded;
 *   - withSuggested: now and then (1 every 6) a post from someone you don't
 *     keep in favorites, picked by the database for its interactions.
 */
import type { PostAuthor, WallPost } from "@/lib/wall";

export interface FeedResource { ownerId: string; ownerHandle: string; key: string; src: string; owner?: PostAuthor }
export interface FeedItem {
  kind: "post" | "repost_post" | "repost_resource";
  at: string;
  actor: PostAuthor;
  post?: WallPost;
  resource?: FeedResource;
}
export interface SuggestedPost { post: WallPost; likedByFavs: number }

export type FeedEntry =
  | { type: "item"; key: string; item: FeedItem }
  | { type: "group"; key: string; actor: PostAuthor; at: string; resources: FeedResource[] }
  | { type: "suggested"; key: string; s: SuggestedPost };

/** Reposts of pictures by the same person less than this apart join one block. */
export const GROUP_WINDOW_MS = 30 * 60_000;
export const SUGGEST_EVERY = 6;

const itemKey = (it: FeedItem) => `${it.kind}:${it.actor.id}:${it.post?.id ?? it.resource?.key ?? ""}:${it.at}`;

export function groupFeed(items: FeedItem[], windowMs = GROUP_WINDOW_MS): FeedEntry[] {
  const out: FeedEntry[] = [];
  // Open block per person: where it is in `out` and the time of its oldest picture.
  const open = new Map<string, { idx: number; oldest: number }>();
  for (const it of items) {
    if (it.kind === "repost_resource" && it.resource) {
      const t = Date.parse(it.at);
      const g = open.get(it.actor.id);
      if (g && g.oldest - t <= windowMs) {
        const e = out[g.idx];
        if (e.type === "group") { e.resources.push(it.resource); g.oldest = t; continue; }
      }
      open.set(it.actor.id, { idx: out.length, oldest: t });
      out.push({ type: "group", key: `g:${itemKey(it)}`, actor: it.actor, at: it.at, resources: [it.resource] });
      continue;
    }
    out.push({ type: "item", key: itemKey(it), item: it });
  }
  return out;
}

/** Sprinkles suggested posts (not already in the feed) after every `every` entries. */
export function withSuggested(entries: FeedEntry[], sugg: SuggestedPost[], every = SUGGEST_EVERY): FeedEntry[] {
  const shown = new Set(entries.flatMap(e => (e.type === "item" && e.item.post ? [e.item.post.id] : [])));
  const pool = sugg.filter(s => !shown.has(s.post.id));
  if (!pool.length) return entries;
  const out: FeedEntry[] = [];
  let n = 0, k = 0;
  for (const e of entries) {
    out.push(e);
    if (++n % every === 0 && k < pool.length) { out.push({ type: "suggested", key: `s:${pool[k].post.id}`, s: pool[k] }); k++; }
  }
  // A short (or empty) feed still shows some: one after the 2nd entry, the rest at the end.
  if (k === 0) {
    out.splice(Math.min(2, out.length), 0, { type: "suggested", key: `s:${pool[0].post.id}`, s: pool[0] });
    for (const s of pool.slice(1, 4)) out.push({ type: "suggested", key: `s:${s.post.id}`, s });
  }
  return out;
}
