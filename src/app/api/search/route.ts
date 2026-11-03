import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import { cleanSearchQuery, ilikeEscape, rankSearchHits, type SearchHit } from "@/lib/userSearch";
import type { CanvasState } from "@/types";

// The user search (rail › Buscar, 2026-11-03): profiles whose @handle or name
// contains what was typed, each with its published card's look (photo, name,
// colors). Only real, finished profiles — the same ones /<handle> shows.
export async function GET(req: Request) {
  const q = cleanSearchQuery(new URL(req.url).searchParams.get("q") ?? "");
  if (!q) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const pat = `%${ilikeEscape(q)}%`;
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, handle, display_name, onboarding_completed")
    .or(`handle.ilike.${pat},display_name.ilike.${pat}`)
    .not("handle", "like", "temp\\_%")
    .limit(40);
  if (error) return NextResponse.json({ results: [], error: "search_failed" }, { status: 500 });
  const real = (profiles ?? []).filter(p => p.onboarding_completed !== false && p.handle);
  if (!real.length) return NextResponse.json({ results: [] });

  const { data: rooms } = await supabase
    .from("canvases")
    .select("user_id, data, created_at")
    .in("user_id", real.map(p => p.user_id))
    .eq("type", "space")
    .order("created_at", { ascending: true });
  const firstRoom = new Map<string, unknown>();
  for (const r of rooms ?? []) if (!firstRoom.has(r.user_id as string)) firstRoom.set(r.user_id as string, r.data);

  const hits: SearchHit[] = [];
  for (const p of real) {
    const data = firstRoom.get(p.user_id as string);
    if (!data) continue; // no room yet: /<handle> wouldn't show anything
    const card = ogCardOf(publicStateOf(data as CanvasState), p.handle as string);
    hits.push({
      handle: p.handle as string,
      name: (card?.name || (p.display_name as string | null) || (p.handle as string)).slice(0, 60),
      photo: card?.photo ?? null,
      pfpRadius: card?.pfpRadius ?? "50%",
      bg: card?.bg ?? "#17151c",
      nameColor: card?.nameColor ?? "#f6f3f8",
    });
  }
  return NextResponse.json({ results: rankSearchHits(hits, q) }, { headers: { "Cache-Control": "private, max-age=20" } });
}
