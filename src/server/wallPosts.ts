import type { createClient } from "@/lib/supabase/server";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import type { WallPost, PostStyle } from "@/lib/wall";

export type PostRow = { id: string; profile_user_id: string; author_user_id: string; parent_id: string | null; body: string; style: PostStyle | null; created_at: string; pinned?: boolean;
  /** Recursos (2026-11-28): the row is on a wall because its owner reposted it. */
  repost_id?: string; repost_at?: string };
type Row = PostRow;

/** Rows → posts with author, counters and "did I like it" (shared by /api/feed). */
export async function hydratePosts(supabase: Awaited<ReturnType<typeof createClient>>, rows: Row[], withWallHandle = false): Promise<WallPost[]> {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const tops = [...new Set(rows.filter(r => !r.parent_id).map(r => r.id))];
  const [authors, { data: stats }, { data: rstats }] = await Promise.all([
    wallAuthors(supabase, [...rows.map(r => r.author_user_id), ...(withWallHandle || rows.some(r => r.repost_id) ? rows.map(r => r.profile_user_id) : [])]),
    supabase.rpc("post_stats", { ids: [...new Set(ids)] }),
    tops.length ? supabase.rpc("post_repost_stats", { ids: tops }) : Promise.resolve({ data: [] }),
  ]);
  const st = new Map(((stats as { id: string; likes: number; replies: number; liked: boolean }[]) ?? []).map(s => [s.id, s]));
  const rs = new Map(((rstats as { id: string; reposts: number; reposted: boolean }[]) ?? []).map(s => [s.id, s]));
  return rows.map(r => {
    const s = st.get(r.id);
    return {
      id: r.id, wallOwner: r.profile_user_id, parentId: r.parent_id, body: r.body, style: r.style, createdAt: r.created_at, pinned: !!r.pinned,
      author: authors.get(r.author_user_id) ?? unknownAuthor(r.author_user_id),
      wallHandle: withWallHandle || r.repost_id ? authors.get(r.profile_user_id)?.handle : undefined,
      likes: Number(s?.likes ?? 0), replies: Number(s?.replies ?? 0), liked: !!s?.liked,
      ...(r.parent_id ? {} : { reposts: Number(rs.get(r.id)?.reposts ?? 0), reposted: !!rs.get(r.id)?.reposted }),
      ...(r.repost_id && r.repost_at ? { repost: { id: r.repost_id, at: r.repost_at } } : {}),
    };
  });
}

