import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts, type PostRow } from "@/server/wallPosts";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import type { FeedItem, SuggestedPost } from "@/lib/feed";

const PAGE = 30;

// Feed (2026-11-25; v2 2026-11-28, now in Explorar): from the cards I keep in
// favorites — what they wrote on their own walls and what they reposted (posts
// and resources). Who favorites whom is not shown (2026-11-28).
export async function GET(req: Request) {
  const before = new URL(req.url).searchParams.get("before");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const { data } = await supabase.rpc("my_feed_v2", { p_before: before && !Number.isNaN(Date.parse(before)) ? before : null, p_limit: PAGE + 1 });
  const rows = ((data ?? []) as { kind: FeedItem["kind"]; actor: string; at: string; post_id: string | null; owner_id: string | null; rkey: string | null; src: string | null; target: string | null }[]);
  const page = rows.slice(0, PAGE);
  const postIds = [...new Set(page.map(r => r.post_id).filter((x): x is string => !!x))];
  const [{ data: postRows }, who] = await Promise.all([
    postIds.length
      ? supabase.from("comments").select("id, profile_user_id, author_user_id, parent_id, body, style, created_at, pinned").in("id", postIds)
      : Promise.resolve({ data: [] }),
    wallAuthors(supabase, page.flatMap(r => [r.actor, r.owner_id ?? "", r.target ?? ""])),
  ]);
  const posts = new Map((await hydratePosts(supabase, (postRows ?? []) as PostRow[], true)).map(p => [p.id, p]));
  const author = (id: string | null) => (id ? who.get(id) ?? unknownAuthor(id) : undefined);
  const items: FeedItem[] = [];
  for (const r of page) {
    const base = { kind: r.kind, at: r.at, actor: author(r.actor)! };
    if (r.kind === "post" || r.kind === "repost_post") {
      const post = r.post_id ? posts.get(r.post_id) : undefined;
      if (post) items.push({ ...base, post });
    } else if (r.kind === "repost_resource" && r.owner_id && r.rkey && r.src) {
      items.push({ ...base, resource: { ownerId: r.owner_id, ownerHandle: who.get(r.owner_id)?.handle ?? "", key: r.rkey, src: r.src, owner: who.get(r.owner_id) } });
    }
  }
  // Sugeridos (2026-11-28): with the first page, a few posts from people I don't
  // keep in favorites (feed_suggested), sprinkled by the app (lib/feed.ts).
  let suggested: SuggestedPost[] = [];
  if (!before) {
    const { data: sg } = await supabase.rpc("feed_suggested", { p_limit: 8 });
    const sgRows = (sg ?? []) as { id: string; liked_by_favs: number }[];
    if (sgRows.length) {
      const { data: sp } = await supabase.from("comments").select("id, profile_user_id, author_user_id, parent_id, body, style, created_at, pinned").in("id", sgRows.map(r => r.id));
      const hyd = new Map((await hydratePosts(supabase, (sp ?? []) as PostRow[], true)).map(p => [p.id, p]));
      suggested = sgRows.flatMap(r => { const post = hyd.get(r.id); return post ? [{ post, likedByFavs: Number(r.liked_by_favs) }] : []; });
    }
  }
  return NextResponse.json({ items, suggested, more: rows.length > PAGE, cursor: page[page.length - 1]?.at ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
