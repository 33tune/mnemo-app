"use client";
/**
 * Recursos (2026-11-28): the data side of a card's Recursos tab and of the
 * resource viewer. Reads go through /api/resources; writes are RPCs
 * (toggle_resource_repost, toggle_resource_like, post_resource_comment,
 * resource_download, report_resource, set_resource_meta, set_resource_settings,
 * delete_resource_data) — see supabase/migrations/20261128000000_resources.sql.
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";
import { isVerifyError, requestVerify } from "@/lib/verify";
import { track } from "@/lib/track";
import { downloadName, resourceError, type RepostItem, type Resource, type ResourceStats } from "@/lib/resources";
import type { PostAuthor } from "@/lib/wall";

const json = async <T,>(url: string): Promise<T | null> => {
  const r = await fetch(url, { cache: "no-store" }).catch(() => null);
  return r?.ok ? ((await r.json()) as T) : null;
};
type Resp = { settings: { hidden: boolean; locked: boolean } | null; stats: ResourceStats[]; reposts: RepostItem[]; more: boolean };

export interface ResourcesState {
  loaded: boolean;
  settings: { hidden: boolean; locked: boolean };
  stats: Map<string, ResourceStats>;
  reposts: RepostItem[];
  more: boolean;
  loadMore: () => void;
  reload: () => void;
  /** The viewer changed something of one resource (keep the row in sync). */
  patch: (key: string, s: Partial<ResourceStats>) => void;
}

export function useResources(owner: string | undefined, resources: Resource[], open: boolean): ResourcesState {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({ hidden: false, locked: false });
  const [stats, setStats] = useState<Map<string, ResourceStats>>(new Map());
  const [reposts, setReposts] = useState<RepostItem[]>([]);
  const [more, setMore] = useState(false);
  const keys = resources.map(r => r.key).join(",");

  const reload = useCallback(() => {
    if (!owner) return;
    const q = new URLSearchParams({ owner, keys });
    json<Resp>(`/api/resources?${q}`).then(d => {
      if (!d) { setLoaded(true); return; }
      if (d.settings) setSettings(d.settings);
      setStats(new Map(d.stats.map(s => [s.key, s])));
      setReposts(d.reposts); setMore(d.more); setLoaded(true);
    });
  }, [owner, keys]);
  useEffect(() => { if (open) reload(); }, [open, reload]);

  const loadMore = useCallback(() => {
    const last = reposts[reposts.length - 1];
    if (!owner || !last) return;
    json<Resp>(`/api/resources?${new URLSearchParams({ owner, before: last.at })}`).then(d => {
      if (!d) return;
      setReposts(prev => [...prev, ...d.reposts.filter(x => !prev.some(p => p.id === x.id))]);
      setMore(d.more);
    });
  }, [owner, reposts]);

  const patch = useCallback((key: string, s: Partial<ResourceStats>) => {
    setStats(prev => { const m = new Map(prev); const cur = m.get(key); m.set(key, { ...(cur ?? emptyStats(key)), ...s }); return m; });
  }, []);
  return { loaded, settings, stats, reposts, more, loadMore, reload, patch };
}

export const emptyStats = (key: string): ResourceStats => ({
  key, caption: null, noDownload: false, hidden: false, removed: false, likes: 0, reposts: 0, comments: 0, downloads: 0, liked: false, reposted: false,
});

/** One resource's stats (the viewer). */
export function useResourceStats(owner: string, key: string, initial?: ResourceStats) {
  const [s, setS] = useState<ResourceStats>(initial ?? emptyStats(key));
  const [loaded, setLoaded] = useState(!!initial);
  useEffect(() => {
    json<Resp>(`/api/resources?${new URLSearchParams({ owner, keys: key, only: "1" })}`).then(d => {
      const row = d?.stats.find(x => x.key === key);
      if (row) setS(row);
      setLoaded(true);
    });
  }, [owner, key]);
  return { s, setS, loaded };
}

export interface ResourceComment { id: string; body: string; at: string; author: PostAuthor }
export function useResourceComments(owner: string, key: string) {
  const [list, setList] = useState<ResourceComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => {
    json<{ comments: ResourceComment[] }>(`/api/resources?${new URLSearchParams({ owner, rkey: key, comments: "1" })}`)
      .then(d => { setList(d?.comments ?? []); setLoaded(true); });
  }, [owner, key]);
  useEffect(() => { reload(); }, [reload]);
  return { list, setList, loaded, reload };
}

// ── Actions ──────────────────────────────────────────────────────────────────
const one = <T,>(data: unknown) => (Array.isArray(data) ? data[0] : data) as T | undefined;
const fail = (error: { message?: string; code?: string }) => { if (isVerifyError(error)) requestVerify(); return resourceError(error.message); };

export async function toggleResourceRepost(owner: string, key: string, src: string): Promise<{ reposted: boolean; n: number } | string> {
  const { data, error } = await createClient().rpc("toggle_resource_repost", { p_owner: owner, p_rkey: key, p_src: src });
  if (error) return fail(error);
  const r = one<{ reposted: boolean; n: number }>(data);
  if (r?.reposted) track("repost", { kind: "resource" });
  return { reposted: !!r?.reposted, n: Number(r?.n ?? 0) };
}
export async function toggleResourceLike(owner: string, key: string): Promise<{ liked: boolean; n: number } | string> {
  const { data, error } = await createClient().rpc("toggle_resource_like", { p_owner: owner, p_rkey: key });
  if (error) return fail(error);
  const r = one<{ liked: boolean; n: number }>(data);
  if (r?.liked) track("resource_like");
  return { liked: !!r?.liked, n: Number(r?.n ?? 0) };
}
export async function postResourceComment(owner: string, key: string, body: string): Promise<string | null> {
  const { error } = await createClient().rpc("post_resource_comment", { p_owner: owner, p_rkey: key, p_body: body });
  if (error) return fail(error);
  track("resource_comment");
  return null;
}
export async function deleteResourceComment(id: string): Promise<boolean> {
  const { error } = await createClient().rpc("delete_resource_comment", { p_id: id });
  return !error;
}
export async function reportResource(owner: string, key: string, src: string): Promise<boolean> {
  const { error } = await createClient().rpc("report_resource", { p_owner: owner, p_rkey: key, p_src: src });
  if (error && isVerifyError(error)) requestVerify();
  return !error;
}
export async function setResourceMeta(key: string, m: { caption?: string | null; noDownload?: boolean | null; hidden?: boolean }): Promise<boolean> {
  const { error } = await createClient().rpc("set_resource_meta", {
    p_rkey: key,
    p_caption: m.caption ?? null, p_set_caption: m.caption !== undefined,
    p_no_download: m.noDownload ?? null, p_set_download: m.noDownload !== undefined,
    p_hidden: m.hidden ?? null,
  });
  return !error;
}
export async function deleteResourceData(key: string): Promise<boolean> {
  const { error } = await createClient().rpc("delete_resource_data", { p_rkey: key });
  return !error;
}

/** Download (when the owner allows it): counted, then saved / shared. */
export async function downloadResource(owner: string, ownerHandle: string, key: string, src: string): Promise<string | null> {
  const { data, error } = await createClient().rpc("resource_download", { p_owner: owner, p_rkey: key });
  if (error) return resourceError(error.message);
  if (!data) return "El dueño no permite descargarla.";
  track("resource_download");
  const name = downloadName(src, ownerHandle, key);
  try {
    const blob = await (await fetch(src, { mode: "cors" })).blob();
    const file = new File([blob], name, { type: blob.type || "image/png" });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => undefined);
      return null;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return null;
  } catch {
    window.open(src, "_blank", "noopener");
    return null;
  }
}

// ── The owner's global switches (Muro editor) ────────────────────────────────
export function useResourceSettings(): { hidden: boolean; locked: boolean; loaded: boolean; set: (p: { hidden?: boolean; locked?: boolean }) => void } {
  const viewer = useViewerId();
  const [st, setSt] = useState({ hidden: false, locked: false, loaded: false });
  useEffect(() => {
    if (!viewer) return;
    createClient().rpc("resource_settings", { p_owner: viewer }).then(({ data }) => {
      const r = one<{ hidden: boolean; locked: boolean }>(data);
      setSt({ hidden: !!r?.hidden, locked: !!r?.locked, loaded: true });
    });
  }, [viewer]);
  const set = useCallback((p: { hidden?: boolean; locked?: boolean }) => {
    setSt(prev => ({ ...prev, ...p }));
    createClient().rpc("set_resource_settings", { p_hidden: p.hidden ?? null, p_locked: p.locked ?? null }).then(({ error }) => {
      if (error) setSt(prev => ({ ...prev, ...(p.hidden !== undefined ? { hidden: !p.hidden } : {}), ...(p.locked !== undefined ? { locked: !p.locked } : {}) }));
    });
  }, []);
  return { ...st, set };
}
