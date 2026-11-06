import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import { sortShortcuts, type Shortcut } from "@/lib/shortcuts";
import type { CanvasState, ProfileCardData } from "@/types";

// Acceso directo (2026-11-06): the profiles I gave a favorite, each with its
// published card's look, its active note (and whether I saw it) and how often
// I visit it. Everything is read as the signed-in user (RLS): my favorites
// rows, public profiles / rooms / notes, my own visit counts.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ shortcuts: [] }, { status: 401 });

  const { data: favs } = await supabase
    .from("favorites").select("target_user_id, pinned, hidden, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  const targets = (favs ?? []).map(f => f.target_user_id as string);
  if (!targets.length) return NextResponse.json({ shortcuts: [] });

  const [{ data: profiles }, { data: rooms }, { data: notes }, { data: visits }] = await Promise.all([
    supabase.from("profiles").select("user_id, handle, display_name, onboarding_completed").in("user_id", targets),
    supabase.from("canvases").select("user_id, data, created_at").in("user_id", targets).eq("type", "space").order("created_at", { ascending: true }),
    supabase.from("notes").select("id, user_id, body, created_at, expires_at").in("user_id", targets).gt("expires_at", new Date().toISOString()),
    supabase.rpc("my_visit_counts", { targets }),
  ]);
  const noteIds = (notes ?? []).map(n => n.id as string);
  const { data: seen } = noteIds.length ? await supabase.rpc("my_seen_notes", { p_notes: noteIds }) : { data: [] };
  const seenSet = new Set(((seen as unknown[]) ?? []).map(x => (typeof x === "string" ? x : (x as { my_seen_notes?: string }).my_seen_notes ?? String(x))));
  const roomOf = new Map<string, unknown>();
  for (const r of rooms ?? []) if (!roomOf.has(r.user_id as string)) roomOf.set(r.user_id as string, r.data);
  const visitsOf = new Map<string, number>(((visits as { profile_user_id: string; n: number }[]) ?? []).map(v => [v.profile_user_id, Number(v.n)]));
  const noteOf = new Map((notes ?? []).map(n => [n.user_id as string, n]));
  const favOf = new Map((favs ?? []).map(f => [f.target_user_id as string, f]));

  const out: Shortcut[] = [];
  for (const p of profiles ?? []) {
    const handle = p.handle as string | null;
    if (!handle || handle.startsWith("temp_") || p.onboarding_completed === false) continue;
    const data = roomOf.get(p.user_id as string);
    const state = data ? publicStateOf(data as CanvasState) : null;
    const og = state ? ogCardOf(state, handle) : null;
    const card = state ? ((state.profiles ?? []).find(c => c.isPublic) ?? (state.profiles ?? [])[0]) as ProfileCardData | undefined : undefined;
    const photo = typeof card?.photo === "string" && /^https?:\/\//.test(card.photo) ? card.photo : null;
    const f = favOf.get(p.user_id as string)!;
    const n = noteOf.get(p.user_id as string);
    out.push({
      userId: p.user_id as string, handle,
      name: (og?.name || (p.display_name as string | null) || handle).slice(0, 60),
      photo, pfpRadius: og?.pfpRadius ?? "50%", bg: og?.bg ?? "#17151c", nameColor: og?.nameColor ?? "#f6f3f8",
      pinned: !!f.pinned, hidden: !!f.hidden, visits: visitsOf.get(p.user_id as string) ?? 0, favoritedAt: f.created_at as string,
      note: n ? { id: n.id as string, body: n.body as string, created_at: n.created_at as string, expires_at: n.expires_at as string } : null,
      noteSeen: n ? seenSet.has(n.id as string) : false,
      noteStyle: card?.noteBox,
      sig: state ? createHash("sha1").update(JSON.stringify(state)).digest("base64url").slice(0, 16) : undefined,
    });
  }
  return NextResponse.json({ shortcuts: sortShortcuts(out) }, { headers: { "Cache-Control": "private, no-store" } });
}
