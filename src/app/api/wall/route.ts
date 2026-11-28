import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts, type PostRow as Row } from "@/server/wallPosts";
import { WALL_PAGE } from "@/lib/wall";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Muro (2026-11-25): ?owner=<uuid>[&before=iso] → the wall's posts (newest first);
// ?parent=<uuid> → that post's replies (oldest first). Read as whoever asks (RLS).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") ?? "";
  const parent = url.searchParams.get("parent") ?? "";
  const before = url.searchParams.get("before");
  const supabase = await createClient();
  const cols = "id, profile_user_id, author_user_id, parent_id, body, style, created_at, pinned";
  if (UUID.test(parent)) {
    const { data } = await supabase.from("comments").select(cols).eq("parent_id", parent).order("created_at", { ascending: true }).limit(100);
    return NextResponse.json({ posts: await hydratePosts(supabase, (data ?? []) as Row[]) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!UUID.test(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  // The pinned post goes first on the first page; later pages skip it.
  const later = !!before && !Number.isNaN(Date.parse(before));
  let q = supabase.from("comments").select(cols).eq("profile_user_id", owner).is("parent_id", null);
  q = later ? q.eq("pinned", false).lt("created_at", before!) : q.order("pinned", { ascending: false });
  q = q.order("created_at", { ascending: false }).limit(WALL_PAGE + 1);
  const [{ data: rows }, { data: prof }, { data: reps }] = await Promise.all([
    q, supabase.from("profiles").select("comments_off").eq("user_id", owner).maybeSingle(),
    // Recursos (2026-11-28): the posts this card reposted show on its wall too, at the time they were reposted.
    supabase.rpc("post_reposts_of", { p_user: owner, p_before: later ? before : null, p_limit: WALL_PAGE + 1 }),
  ]);
  const own = (rows ?? []) as Row[];
  const reposted = ((reps ?? []) as Row[]).filter(r => r.repost_id && r.repost_at);
  const at = (r: Row) => r.repost_at ?? r.created_at;
  const pinned = !later ? own.filter(r => r.pinned) : [];
  const merged = [...own.filter(r => !pinned.includes(r)), ...reposted].sort((a, b) => (at(a) < at(b) ? 1 : at(a) > at(b) ? -1 : 0));
  const rest = WALL_PAGE - pinned.length;
  const page = [...pinned, ...merged.slice(0, rest)];
  return NextResponse.json(
    { posts: await hydratePosts(supabase, page), more: merged.length > rest, off: !!prof?.comments_off },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
