import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import type { ActivityItem } from "@/lib/wall";

// Avisos (2026-11-25): who wrote on my wall, replied to me or liked my posts;
// and (2026-11-26) who added me to their favorites.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const { data } = await supabase.rpc("my_activity", { p_before: null, p_limit: 40 });
  const rows = (data ?? []) as { kind: ActivityItem["kind"]; actor: string; post_id: string; wall_owner: string; body: string; at: string }[];
  const who = await wallAuthors(supabase, [...rows.map(r => r.actor), ...rows.map(r => r.wall_owner)]);
  // Favoritos (2026-11-26): who added me — and whether I already added them back.
  const favActors = [...new Set(rows.filter(r => r.kind === "favorite").map(r => r.actor))];
  let mine = new Set<string>();
  if (favActors.length) {
    const { data: back } = await supabase.from("favorites").select("target_user_id").eq("user_id", user.id).in("target_user_id", favActors);
    mine = new Set((back ?? []).map(b => b.target_user_id as string));
  }
  const items: ActivityItem[] = rows.map(r => ({
    kind: r.kind, postId: r.post_id ?? "", body: r.kind === "favorite" ? "te agregó a favoritos" : r.body, at: r.at,
    wallHandle: who.get(r.wall_owner)?.handle ?? "", actor: who.get(r.actor) ?? unknownAuthor(r.actor),
    ...(r.kind === "favorite" ? { mutual: mine.has(r.actor) } : {}),
  }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}
