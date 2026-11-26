import type { createClient } from "@/lib/supabase/server";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import type { WallPost, PostStyle } from "@/lib/wall";

export type PostRow = { id: string; profile_user_id: string; author_user_id: string; parent_id: string | null; body: string; style: PostStyle | null; created_at: string; pinned?: boolean };
type Row = PostRow;

/** Rows → posts with author, counters and "did I like it" (shared by /api/feed). */
export async function hydratePosts(supabase: Awaited<ReturnType<typeof createClient>>, rows: Row[], withWallHandle = false): Promise<WallPost[]> {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const [authors, { data: stats }] = await Promise.all([
    wallAuthors(supabase, [...rows.map(r => r.author_user_id), ...(withWallHandle ? rows.map(r => r.profile_user_id) : [])]),
    supabase.rpc("post_stats", { ids }),
  ]);
  const st = new Map(((stats as { id: string; likes: number; replies: number; liked: boolean }[]) ?? []).map(s => [s.id, s]));
  return rows.map(r => {
    const s = st.get(r.id);
    return {
      id: r.id, wallOwner: r.profile_user_id, parentId: r.parent_id, body: r.body, style: r.style, createdAt: r.created_at, pinned: !!r.pinned,
      author: authors.get(r.author_user_id) ?? unknownAuthor(r.author_user_id),
      wallHandle: withWallHandle ? authors.get(r.profile_user_id)?.handle : undefined,
      likes: Number(s?.likes ?? 0), replies: Number(s?.replies ?? 0), liked: !!s?.liked,
    };
  });
}

