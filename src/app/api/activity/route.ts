import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import type { ActivityItem } from "@/lib/wall";

// Avisos (2026-11-25): who wrote on my wall, replied to me or liked my posts.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const { data } = await supabase.rpc("my_activity", { p_before: null, p_limit: 40 });
  const rows = (data ?? []) as { kind: ActivityItem["kind"]; actor: string; post_id: string; wall_owner: string; body: string; at: string }[];
  const who = await wallAuthors(supabase, [...rows.map(r => r.actor), ...rows.map(r => r.wall_owner)]);
  const items: ActivityItem[] = rows.map(r => ({
    kind: r.kind, postId: r.post_id, body: r.body, at: r.at,
    wallHandle: who.get(r.wall_owner)?.handle ?? "", actor: who.get(r.actor) ?? unknownAuthor(r.actor),
  }));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}
