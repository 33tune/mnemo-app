import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isExploreTab, rankExplore, type ExploreCandidate } from "@/lib/explore";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Explorar v2 (2026-11-27): the list comes from public.explore_list() — one
// small row per card (its picture and the numbers computed when its owner
// saved, explore_cards) — never from every room. Pictures only: the grid
// shows <img>, not live cards. Kept 2 min in Next's shared data cache.

type Row = {
  user_id: string; handle: string; created_at: string; updated_at: string; thumb: string; content: number;
  finished: boolean; collection: boolean; name: string | null; views14: number; favs: number; favs14: number;
  posts14: number; edit_minutes: number; edits: number;
};
type Candidate = ExploreCandidate & { thumb: string; name: string };

async function readCandidates(): Promise<Candidate[]> {
  const sb = createPublicClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("explore_list");
  // Throwing keeps an empty answer out of the cache (a failed read is not "no cards").
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(r => ({
    userId: r.user_id, handle: r.handle, createdAt: r.created_at, updatedAt: r.updated_at, thumb: r.thumb, name: (r.name || r.handle).slice(0, 60),
    content: Number(r.content), finished: !!r.finished, collection: !!r.collection,
    signals: { views14: Number(r.views14), favs: Number(r.favs), favs14: Number(r.favs14), posts14: Number(r.posts14), editMinutes: Number(r.edit_minutes), edits: Number(r.edits) },
  }));
}
const loadShared = unstable_cache(readCandidates, ["explore-list-v1"], { revalidate: 120 });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tabRaw = url.searchParams.get("tab");
  const tab = isExploreTab(tabRaw) ? tabRaw : "para";
  const offset = Math.max(0, Math.min(2000, Number(url.searchParams.get("offset")) || 0));
  const limit = Math.max(1, Math.min(30, Number(url.searchParams.get("limit")) || 18));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let list: Candidate[];
  try { list = await loadShared(); }
  catch {
    try { list = await readCandidates(); }
    catch { return NextResponse.json({ items: [], more: false, error: "explore_failed" }, { status: 503 }); }
  }

  // Para vos: a new mix each time Explorar opens (one seed per visit, kept
  // while paging); without one, a new mix every hour.
  const seedRaw = url.searchParams.get("seed") ?? "";
  const seed = /^[a-z0-9]{1,24}$/i.test(seedRaw) ? seedRaw : new Date().toISOString().slice(0, 13);
  let mine = new Set<string>();
  if (user) {
    const { data: favs } = await supabase.from("favorites").select("target_user_id").eq("user_id", user.id).limit(2000);
    mine = new Set((favs ?? []).map(f => f.target_user_id as string));
  }
  // The viewer's favorites are not suggested again in Para vos (they are in Tus favoritos).
  const ranked = rankExplore(list, { tab, now: Date.now(), seed: `${seed}:${user?.id ?? "anon"}`, excludeUserId: user?.id ?? null, excludeIds: mine }) as Candidate[];
  const page = ranked.slice(offset, offset + limit);
  const newCut = Date.now() - 7 * 86400000;
  return NextResponse.json({
    items: page.map(c => ({
      userId: c.userId, handle: c.handle, name: c.name, thumb: c.thumb,
      isNew: Date.parse(c.createdAt) > newCut, favorite: mine.has(c.userId),
    })),
    more: offset + limit < ranked.length,
  }, { headers: { "Cache-Control": "private, max-age=30" } });
}
