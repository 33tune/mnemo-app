import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { isExploreTab, publicCardOf, rankExplore, type ExploreCandidate } from "@/lib/explore";
import type { CanvasState, ProfileCardData } from "@/types";

// Explorar (2026-11-26): community cards, ranked by care and activity
// (src/lib/explore.ts). Everything read here is already public: published
// rooms, profiles, and aggregated numbers (explore_signals, no personal data).
// The candidate list is kept for a minute per server instance.

type Cached = { at: number; list: ExploreCandidate[] };
let cache: Cached | null = null;
const TTL = 60_000;

async function loadCandidates(): Promise<ExploreCandidate[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.list;
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, handle, created_at, onboarding_completed")
    .not("handle", "like", "temp\\_%").limit(2000);
  const real = (profiles ?? []).filter(p => p.handle && p.onboarding_completed !== false);
  if (!real.length) return [];
  const ids = real.map(p => p.user_id as string);
  const [{ data: rooms }, { data: signals }] = await Promise.all([
    supabase.from("canvases").select("user_id, data, created_at").in("user_id", ids).eq("type", "space").order("created_at", { ascending: true }),
    supabase.rpc("explore_signals", { targets: ids }),
  ]);
  const roomOf = new Map<string, unknown>();
  for (const r of rooms ?? []) if (!roomOf.has(r.user_id as string)) roomOf.set(r.user_id as string, r.data);
  const sigOf = new Map(((signals as Record<string, unknown>[]) ?? []).map(s => [s.user_id as string, s]));
  const list: ExploreCandidate[] = [];
  for (const p of real) {
    const data = roomOf.get(p.user_id as string);
    if (!data) continue;
    const state = publicStateOf(data as CanvasState);
    const card = publicCardOf(state);
    if (!card) continue;
    const s = sigOf.get(p.user_id as string) ?? {};
    list.push({
      userId: p.user_id as string, handle: p.handle as string, createdAt: p.created_at as string, card, state,
      signals: {
        views14: Number(s.views14 ?? 0), favs: Number(s.favs ?? 0), favs14: Number(s.favs14 ?? 0),
        posts14: Number(s.posts14 ?? 0), editMinutes: Number(s.edit_minutes ?? 0), edits: Number(s.edits ?? 0),
      },
    });
  }
  cache = { at: Date.now(), list };
  return list;
}

/** The card as the thumbnail draws it: no stickers outside the card frame need
 * the room, so only the card itself travels (photos and texts are public). */
function cardForThumb(card: ProfileCardData): ProfileCardData {
  return { ...card, x: 0, y: 0 } as ProfileCardData;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tabRaw = url.searchParams.get("tab");
  const tab = isExploreTab(tabRaw) ? tabRaw : "para";
  const offset = Math.max(0, Math.min(500, Number(url.searchParams.get("offset")) || 0));
  const limit = Math.max(1, Math.min(24, Number(url.searchParams.get("limit")) || 12));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let list: ExploreCandidate[];
  try { list = await loadCandidates(); }
  catch { return NextResponse.json({ items: [], more: false, error: "explore_failed" }, { status: 500 }); }

  const day = new Date().toISOString().slice(0, 10);
  const ranked = rankExplore(list, { tab, now: Date.now(), seed: `${day}:${user?.id ?? "anon"}`, excludeUserId: user?.id ?? null });
  const page = ranked.slice(offset, offset + limit);

  let favSet = new Set<string>();
  if (user && page.length) {
    const { data: favs } = await supabase.from("favorites").select("target_user_id").eq("user_id", user.id).in("target_user_id", page.map(c => c.userId));
    favSet = new Set((favs ?? []).map(f => f.target_user_id as string));
  }
  const newCut = Date.now() - 7 * 86400000;
  return NextResponse.json({
    items: page.map(c => ({
      userId: c.userId, handle: c.handle, name: (c.card.name || c.handle).slice(0, 60),
      isNew: Date.parse(c.createdAt) > newCut, favorite: favSet.has(c.userId), card: cardForThumb(c.card),
    })),
    more: offset + limit < ranked.length,
  }, { headers: { "Cache-Control": "private, max-age=30" } });
}
