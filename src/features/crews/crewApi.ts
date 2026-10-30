"use client";
/** Every crew read and write from the browser: the database functions of
 * migrations/20261029000000_crews.sql + 20261031000000_crews_v3.sql (each one
 * checks who is calling). */
import { createClient } from "@/lib/supabase/client";
import type { CrewHouse, CrewHouseMember, CrewInboxItem, CrewPatch, MyCrew } from "./crewTypes";

const sb = () => createClient();

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const crewApi = {
  create: (slug: string, name: string) => rpc<string>("crew_create", { p_slug: slug, p_name: name }),
  update: (id: string, patch: CrewPatch) => rpc<void>("crew_update", { p_id: id, p: patch }),
  remove: (id: string) => rpc<void>("crew_delete", { p_id: id }),
  inviteCode: (id: string, renew = false) => rpc<string>("crew_invite_code", { p_id: id, p_renew: renew }),
  kick: (id: string, userId: string) => rpc<void>("crew_kick", { p_id: id, p_user: userId }),
  ban: (id: string, userId: string) => rpc<void>("crew_ban", { p_id: id, p_user: userId }),
  unban: (id: string, userId: string) => rpc<void>("crew_unban", { p_id: id, p_user: userId }),
  bans: (id: string) => rpc<{ user_id: string; handle: string | null; display_name: string | null; banned_at: string }[]>("crew_bans_list", { p_id: id }),
  setRole: (id: string, userId: string, role: "admin" | "member") => rpc<void>("crew_set_role", { p_id: id, p_user: userId, p_role: role }),
  join: (slug: string, code: string) => rpc<number>("crew_join", { p_slug: slug, p_code: code }),
  leave: (id: string) => rpc<void>("crew_leave", { p_id: id }),
  pin: (id: string, on: boolean) => rpc<void>("crew_pin", { p_id: id, p_on: on }),
  house: (slug: string) => rpc<CrewHouse | null>("crew_house", { p_slug: slug }),
  membersPage: (slug: string, q: string, order: "joined" | "role", offset: number) =>
    rpc<CrewHouseMember[]>("crew_members_page", { p_slug: slug, p_q: q, p_order: order, p_offset: offset }),
  mine: () => rpc<MyCrew[]>("crew_mine"),
  post: (id: string, body: string, link: string | null, isPublic: boolean) =>
    rpc<string>("crew_post_create", { p_id: id, p_body: body, p_link: link, p_public: isPublic }),
  deletePost: (postId: string) => rpc<void>("crew_post_delete", { p_post: postId }),
  markRead: (postIds: string[]) => rpc<void>("crew_mark_read", { p_posts: postIds }),
  inbox: () => rpc<CrewInboxItem[]>("crew_inbox"),

  /** Is myland.lol/c/<slug> free? */
  async slugFree(slug: string): Promise<boolean> {
    const { data, error } = await sb().from("crews").select("id").eq("slug", slug).maybeSingle();
    return !error && !data;
  },
};

/** A crew's invite link (what admins share). */
export const inviteUrl = (slug: string, code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://www.myland.lol"}/c/${slug}/unirme?k=${encodeURIComponent(code)}`;

/** After signing up from an invite, come back to it (SetupScreen reads this). */
export const PENDING_PACT_KEY = "mnemo_pending_pact";

/** Tell the editor (rail, messages) that the viewer's crews changed. */
export const CREWS_CHANGED_EVENT = "mnemo:crews-changed";
export const crewsChanged = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(CREWS_CHANGED_EVENT)); };
