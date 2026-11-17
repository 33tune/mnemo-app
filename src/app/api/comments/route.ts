import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import { COMMENTS_PAGE, type CommentItem } from "@/lib/comments";
import type { CanvasState, ProfileCardData } from "@/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Comentarios (2026-11-17): one page of a profile's comments, newest first,
// each with its author's @, name and card photo (from the PUBLISHED card, like
// the shortcuts bar). Read as whoever asks (RLS hides banned accounts).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") ?? "";
  const before = url.searchParams.get("before");
  if (!UUID.test(owner)) return NextResponse.json({ error: "bad_owner" }, { status: 400 });
  const supabase = await createClient();

  let q = supabase.from("comments").select("id, author_user_id, body, owner_liked, created_at")
    .eq("profile_user_id", owner).order("created_at", { ascending: false }).limit(COMMENTS_PAGE + 1);
  if (before && !Number.isNaN(Date.parse(before))) q = q.lt("created_at", before);
  const [{ data: rows }, { data: prof }] = await Promise.all([
    q,
    supabase.from("profiles").select("comments_off").eq("user_id", owner).maybeSingle(),
  ]);
  const page = (rows ?? []).slice(0, COMMENTS_PAGE);
  const authors = [...new Set(page.map(r => r.author_user_id as string))];

  const [{ data: profiles }, { data: rooms }] = authors.length ? await Promise.all([
    supabase.from("profiles").select("user_id, handle, display_name").in("user_id", authors),
    supabase.from("canvases").select("user_id, data, created_at").in("user_id", authors).eq("type", "space").order("created_at", { ascending: true }),
  ]) : [{ data: [] }, { data: [] }];
  const roomOf = new Map<string, unknown>();
  for (const r of rooms ?? []) if (!roomOf.has(r.user_id as string)) roomOf.set(r.user_id as string, r.data);
  const who = new Map<string, { handle: string; name: string; photo: string | null; pfpRadius: string }>();
  for (const p of profiles ?? []) {
    const handle = (p.handle as string | null) ?? "";
    const data = roomOf.get(p.user_id as string);
    const state = data ? publicStateOf(data as CanvasState) : null;
    const og = state ? ogCardOf(state, handle) : null;
    const card = state ? ((state.profiles ?? []).find(c => c.isPublic) ?? (state.profiles ?? [])[0]) as ProfileCardData | undefined : undefined;
    const photo = typeof card?.photo === "string" && /^https?:\/\//.test(card.photo) ? card.photo : null;
    who.set(p.user_id as string, {
      handle: handle.startsWith("temp_") ? "" : handle,
      name: (og?.name || (p.display_name as string | null) || handle).slice(0, 60),
      photo, pfpRadius: og?.pfpRadius ?? "50%",
    });
  }

  const comments: CommentItem[] = page.map(r => {
    const a = who.get(r.author_user_id as string);
    return {
      id: r.id as string, authorId: r.author_user_id as string, body: r.body as string,
      ownerLiked: !!r.owner_liked, createdAt: r.created_at as string,
      handle: a?.handle ?? "", name: a?.name ?? "", photo: a?.photo ?? null, pfpRadius: a?.pfpRadius ?? "50%",
    };
  });
  return NextResponse.json(
    { comments, more: (rows ?? []).length > COMMENTS_PAGE, off: !!prof?.comments_off },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
