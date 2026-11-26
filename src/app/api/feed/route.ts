import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydratePosts } from "@/server/wallPosts";
import type { PostStyle } from "@/lib/wall";

// Feed (2026-11-25): the latest posts written by the cards I gave a heart to.
export async function GET(req: Request) {
  const before = new URL(req.url).searchParams.get("before");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ posts: [] }, { status: 401 });
  const { data } = await supabase.rpc("my_feed", { p_before: before && !Number.isNaN(Date.parse(before)) ? before : null, p_limit: 31 });
  const rows = ((data ?? []) as { id: string; profile_user_id: string; author_user_id: string; parent_id: string | null; body: string; style: PostStyle | null; created_at: string }[]);
  return NextResponse.json({ posts: await hydratePosts(supabase, rows.slice(0, 30), true), more: rows.length > 30 }, { headers: { "Cache-Control": "private, no-store" } });
}
