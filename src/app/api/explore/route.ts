import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { isExploreTab, publicCardOf, rankExplore, type ExploreCandidate } from "@/lib/explore";
import type { CanvasState, ProfileCardData } from "@/types";
import { thumbify } from "@/lib/thumbImages";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Explorar (2026-11-26): community cards, ranked by care and activity
// (src/lib/explore.ts). Everything read here is already public: published
// rooms, profiles, and aggregated numbers (explore_signals, no personal data).
// The candidate list (2026-11-27, load: every server instance re-read every
// room each minute) is read with the public key — the same rows a visitor
// without a session sees — and kept 5 min in Next's data cache, shared by all
// instances; plus a 5 min copy in this instance's memory.

type Cached = { at: number; list: ExploreCandidate[] };
let cache: Cached | null = null;
const TTL = 300_000;

const loadShared = unstable_cache(readCandidates, ["explore-candidates-v2"], { revalidate: 300 });

async function loadCandidates(): Promise<ExploreCandidate[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.list;
  const list = await loadShared();
  cache = { at: Date.now(), list };
  return list;
}

async function readCandidates(): Promise<ExploreCandidate[]> {
  const supabase = createPublicClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profiles } = await supabase.from("profiles")
    .select("user_id, handle, created_at, onboarding_completed")
    .not("handle", "like", "temp\\_%").limit(2000);
  const real = (profiles ?? []).filter(p => p.handle && p.onboarding_completed !== false);
  if (!real.length) return [];
  const ids = real.map(p => p.user_id as string);
  const [{ data: rooms }, { data: signals }] = await Promise.all([
    supabase.from("canvases").select("user_id, data, created_at, updated_at").in("user_id", ids).eq("type", "space").order("created_at", { ascending: true }),
    supabase.rpc("explore_signals", { targets: ids }),
  ]);
  const roomOf = new Map<string, { data: unknown; updatedAt?: string }>();
  for (const r of rooms ?? []) if (!roomOf.has(r.user_id as string)) roomOf.set(r.user_id as string, { data: r.data, updatedAt: (r.updated_at as string) ?? undefined });
  const sigOf = new Map(((signals as Record<string, unknown>[]) ?? []).map(s => [s.user_id as string, s]));
  const list: ExploreCandidate[] = [];
  for (const p of real) {
    const row = roomOf.get(p.user_id as string);
    const data = row?.data;
    if (!data) continue;
    const state = publicStateOf(data as CanvasState);
    const card = publicCardOf(state);
    if (!card) continue;
    const s = sigOf.get(p.user_id as string) ?? {};
    list.push({
      userId: p.user_id as string, handle: p.handle as string, createdAt: p.created_at as string, updatedAt: row.updatedAt, card, state: slimRoom(state),
      signals: {
        views14: Number(s.views14 ?? 0), favs: Number(s.favs ?? 0), favs14: Number(s.favs14 ?? 0),
        posts14: Number(s.posts14 ?? 0), editMinutes: Number(s.edit_minutes ?? 0), edits: Number(s.edits ?? 0),
      },
    });
  }
  return list;
}

/** Only what the ranking and the thumbnail read from the room (its
 * wallpaper, color and how many images / texts): the whole room would not fit
 * the shared cache and nobody needs it here. */
function slimRoom(state: CanvasState): CanvasState {
  const st = state as CanvasState & Record<string, unknown>;
  const n = (v: unknown, max: number) => new Array(Math.min(max, Array.isArray(v) ? v.length : 0)).fill(0);
  return { wallpaper: st.wallpaper, bgColor: st.bgColor, images: n(st.images, 6), texts: n(st.texts, 4) } as unknown as CanvasState;
}

/** The card as the thumbnail draws it: no stickers outside the card frame need
 * the room, so only the card itself travels (photos and texts are public). */
function cardForThumb(card: ProfileCardData): ProfileCardData {
  // Small, still pictures (src/lib/thumbImages.ts): full-size uploads and GIFs
  // in a grid made iPhone Safari run out of memory and reload the page.
  return thumbify({ ...card, x: 0, y: 0 } as ProfileCardData, 400, SB);
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

  // Para vos: a new mix each time Explorar opens (the panel sends one seed per
  // visit, kept while paging); without one, a new mix every hour.
  const seedRaw = url.searchParams.get("seed") ?? "";
  const seed = /^[a-z0-9]{1,24}$/i.test(seedRaw) ? seedRaw : new Date().toISOString().slice(0, 13);
  // The viewer's favorites are not suggested again (they are in Tus favoritos).
  let mine = new Set<string>();
  if (user && tab === "para") {
    const { data: favs } = await supabase.from("favorites").select("target_user_id").eq("user_id", user.id).limit(1000);
    mine = new Set((favs ?? []).map(f => f.target_user_id as string));
  }
  const ranked = rankExplore(list, { tab, now: Date.now(), seed: `${seed}:${user?.id ?? "anon"}`, excludeUserId: user?.id ?? null, excludeIds: mine });
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
      room: { wallpaper: typeof c.state.wallpaper === "string" && /^https?:\/\//.test(c.state.wallpaper) ? thumbify(c.state.wallpaper, 400, SB) : "", bgColor: typeof c.state.bgColor === "string" ? c.state.bgColor : "" },
    })),
    more: offset + limit < ranked.length,
  }, { headers: { "Cache-Control": "private, max-age=30" } });
}
