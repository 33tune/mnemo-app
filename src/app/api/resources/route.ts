import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wallAuthors, unknownAuthor } from "@/server/wallAuthors";
import { isResourceKey, statsFromRow, type RepostItem } from "@/lib/resources";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "private, no-store" };
const PAGE = 30;

// Recursos (2026-11-28).
//   ?owner=<uuid>&keys=st:a,im:b[&before=iso] → the owner's settings, the stats
//     of the given resources (the client finds them in the card / room) and the
//     card's reposts (its grid).
//   …&only=1 → without the reposts.
//   ?owner=<uuid>&rkey=<key>&comments=1 → that resource's comments.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") ?? "";
  if (!UUID.test(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const supabase = await createClient();

  if (url.searchParams.get("comments")) {
    const rkey = url.searchParams.get("rkey") ?? "";
    if (!isResourceKey(rkey)) return NextResponse.json({ error: "bad_key" }, { status: 400 });
    const { data } = await supabase.rpc("resource_comments_of", { p_owner: owner, p_rkey: rkey });
    const rows = (data ?? []) as { id: string; author_id: string; body: string; created_at: string }[];
    const who = await wallAuthors(supabase, rows.map(r => r.author_id));
    return NextResponse.json({
      comments: rows.map(r => ({ id: r.id, body: r.body, at: r.created_at, author: who.get(r.author_id) ?? unknownAuthor(r.author_id) })),
    }, { headers: NO_STORE });
  }

  const keys = (url.searchParams.get("keys") ?? "").split(",").filter(isResourceKey).slice(0, 120);
  const before = url.searchParams.get("before");
  const later = !!before && !Number.isNaN(Date.parse(before));
  // ?only=1: just the stats (the viewer opened from somewhere else).
  const only = !!url.searchParams.get("only");
  const [{ data: settings }, { data: stats }, { data: reps }] = await Promise.all([
    later ? Promise.resolve({ data: null }) : supabase.rpc("resource_settings", { p_owner: owner }),
    later || !keys.length ? Promise.resolve({ data: [] }) : supabase.rpc("resource_stats", { p_owner: owner, p_keys: keys }),
    only ? Promise.resolve({ data: [] }) : supabase.rpc("reposts_of", { p_user: owner, p_before: later ? before : null, p_limit: PAGE + 1 }),
  ]);
  const rows = ((reps ?? []) as { id: string; owner_id: string; rkey: string; src: string; created_at: string }[]);
  const who = await wallAuthors(supabase, rows.map(r => r.owner_id));
  const reposts: RepostItem[] = rows.slice(0, PAGE).map(r => ({
    id: r.id, ownerId: r.owner_id, ownerHandle: who.get(r.owner_id)?.handle ?? "", key: r.rkey, src: r.src, at: r.created_at, owner: who.get(r.owner_id),
  }));
  const s = (Array.isArray(settings) ? settings[0] : settings) as { hidden?: boolean; locked?: boolean } | null;
  return NextResponse.json({
    settings: s ? { hidden: !!s.hidden, locked: !!s.locked } : null,
    stats: ((stats ?? []) as Record<string, unknown>[]).map(statsFromRow),
    reposts, more: rows.length > PAGE,
  }, { headers: NO_STORE });
}
