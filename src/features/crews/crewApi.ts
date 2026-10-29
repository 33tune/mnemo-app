"use client";
/** Every crew read and write from the browser: the database functions of
 * migrations/20261029000000_crews.sql (each one checks who is calling). */
import { createClient } from "@/lib/supabase/client";
import type { Crew, CrewBadgeData, CrewPatch, MyCrew } from "./crewTypes";

const sb = () => createClient();

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
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
  join: (slug: string, code: string) => rpc<number>("crew_join", { p_slug: slug, p_code: code }),
  leave: (id: string) => rpc<void>("crew_leave", { p_id: id }),
  feature: (id: string | null) => rpc<void>("crew_feature", { p_id: id }),
  setBadge: (id: string, x: number, y: number, size: number) =>
    rpc<void>("crew_set_badge", { p_id: id, p_x: x, p_y: y, p_size: size }),
  badgeOf: (userId: string) => rpc<CrewBadgeData | null>("crew_badge_of", { p_user: userId }),

  /** Is myland.lol/c/<slug> free? */
  async slugFree(slug: string): Promise<boolean> {
    const { data, error } = await sb().from("crews").select("id").eq("slug", slug).maybeSingle();
    return !error && !data;
  },

  /** The signed-in user's crews, with their number and member counts. */
  async mine(userId: string): Promise<MyCrew[]> {
    const client = sb();
    const { data, error } = await client
      .from("crew_members").select("number, featured, badge_x, badge_y, badge_size, crew:crews(*)")
      .eq("user_id", userId).order("joined_at", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as unknown as { number: number; featured: boolean; badge_x: number; badge_y: number; badge_size: number; crew: Crew }[];
    const ids = rows.map(r => r.crew.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: all } = await client.from("crew_members").select("crew_id").in("crew_id", ids);
      for (const m of all ?? []) counts.set(m.crew_id as string, (counts.get(m.crew_id as string) ?? 0) + 1);
    }
    return rows.map(r => ({ crew: r.crew, number: r.number, featured: r.featured, badge_x: r.badge_x, badge_y: r.badge_y, badge_size: r.badge_size, members: counts.get(r.crew.id) ?? 1 }));
  },

  /** Members of a crew with their handles (for the owner's list). */
  async members(crewId: string): Promise<{ user_id: string; number: number; handle: string }[]> {
    const client = sb();
    const { data, error } = await client.from("crew_members").select("user_id, number").eq("crew_id", crewId).order("number");
    if (error) throw error;
    const ids = (data ?? []).map(m => m.user_id as string);
    const { data: profs } = ids.length ? await client.from("profiles").select("user_id, handle").in("user_id", ids) : { data: [] };
    const handle = new Map((profs ?? []).map(p => [p.user_id as string, p.handle as string]));
    return (data ?? []).map(m => ({ user_id: m.user_id as string, number: m.number as number, handle: handle.get(m.user_id as string) ?? "?" }));
  },
};

/** A crew's invite link (what the owner shares). */
export const inviteUrl = (slug: string, code: string) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://www.myland.lol"}/c/${slug}/unirme?k=${encodeURIComponent(code)}`;

/** After signing up from a pact, come back to it (SetupScreen reads this). */
export const PENDING_PACT_KEY = "mnemo_pending_pact";
