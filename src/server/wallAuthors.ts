import type { SupabaseClient } from "@supabase/supabase-js";
import { publicStateOf } from "@/lib/publishedState";
import { ogCardOf } from "@/lib/ogCard";
import type { CanvasState, ProfileCardData } from "@/types";
import type { PostAuthor } from "@/lib/wall";

/** @, name, card photo and colors of each user (from the PUBLISHED card). */
export async function wallAuthors(supabase: SupabaseClient, ids: string[]): Promise<Map<string, PostAuthor>> {
  const out = new Map<string, PostAuthor>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return out;
  const [{ data: profiles }, { data: rooms }] = await Promise.all([
    supabase.from("profiles").select("user_id, handle, display_name").in("user_id", uniq),
    supabase.from("canvases").select("user_id, data, created_at").in("user_id", uniq).eq("type", "space").order("created_at", { ascending: true }),
  ]);
  const roomOf = new Map<string, unknown>();
  for (const r of rooms ?? []) if (!roomOf.has(r.user_id as string)) roomOf.set(r.user_id as string, r.data);
  for (const p of profiles ?? []) {
    const handle = (p.handle as string | null) ?? "";
    const data = roomOf.get(p.user_id as string);
    const state = data ? publicStateOf(data as CanvasState) : null;
    const og = state ? ogCardOf(state, handle) : null;
    const card = state ? ((state.profiles ?? []).find(c => c.isPublic) ?? (state.profiles ?? [])[0]) as ProfileCardData | undefined : undefined;
    const photo = typeof card?.photo === "string" && /^https?:\/\//.test(card.photo) ? card.photo : null;
    out.set(p.user_id as string, {
      id: p.user_id as string,
      handle: handle.startsWith("temp_") ? "" : handle,
      name: (og?.name || (p.display_name as string | null) || handle).slice(0, 60),
      photo, pfpRadius: og?.pfpRadius ?? "50%", bg: og?.bg ?? "#17151c", nameColor: og?.nameColor ?? "#f6f3f8",
    });
  }
  return out;
}
export const unknownAuthor = (id: string): PostAuthor => ({ id, handle: "", name: "", photo: null, pfpRadius: "50%", bg: "#17151c", nameColor: "#f6f3f8" });
