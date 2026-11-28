"use client";
/**
 * Muro (2026-11-25): the data side of the wall (the back of each card), of "tu
 * celular" (Feed, Mi muro, Avisos) and of the post style remembered between
 * posts. Reads go through /api/wall, /api/feed, /api/activity, /api/me;
 * writes are RPCs (post_wall, toggle_post_like, report_post, set_post_style).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";
import { bumpCommentCount } from "@/hooks/useComments";
import { cleanPostStyle, wallError, postSortAt, type ActivityItem, type PostAuthor, type PostStyle, type WallPost } from "@/lib/wall";
import { isVerifyError, requestVerify } from "@/lib/verify";
import { track } from "@/lib/track";

const json = async <T,>(url: string): Promise<T | null> => {
  const r = await fetch(url, { cache: "no-store" }).catch(() => null);
  return r?.ok ? ((await r.json()) as T) : null;
};

// ── Shared post actions (wall, replies, feed) ────────────────────────────────

/** Like / unlike with an optimistic update; `apply` patches the post everywhere it shows. */
export async function togglePostLike(id: string): Promise<{ liked: boolean; n: number } | null> {
  const { data, error } = await createClient().rpc("toggle_post_like", { p_id: id });
  if (error) { if (isVerifyError(error)) requestVerify(); return null; }
  track("wall_like");
  const row = (Array.isArray(data) ? data[0] : data) as { liked: boolean; n: number } | undefined;
  return row ? { liked: !!row.liked, n: Number(row.n) } : null;
}
export async function reportPost(id: string): Promise<boolean> {
  const { error } = await createClient().rpc("report_post", { p_id: id });
  return !error;
}
export async function deletePost(id: string): Promise<boolean> {
  const { error } = await createClient().from("comments").delete().eq("id", id);
  return !error;
}
export async function blockFromWall(owner: string, who: string): Promise<boolean> {
  const { error } = await createClient().from("wall_blocks").insert({ owner_user_id: owner, blocked_user_id: who });
  return !error || /duplicate/i.test(error.message);
}

// ── One wall ─────────────────────────────────────────────────────────────────

export interface WallState {
  posts: WallPost[];
  loaded: boolean;
  more: boolean;
  off: boolean;
  viewer: string | null | undefined;
  isOwner: boolean;
  canWrite: boolean;
  replies: Record<string, WallPost[] | undefined>;
  loadMore: () => void;
  loadReplies: (id: string) => void;
  post: (body: string, style: PostStyle, parent?: string | null) => Promise<string | null>;
  like: (id: string) => void;
  remove: (id: string) => void;
  report: (id: string) => Promise<boolean>;
  block: (authorId: string) => Promise<boolean>;
  pin: (id: string, on: boolean) => void;
  repost: (id: string) => void;
}

const patchPost = (list: WallPost[], id: string, f: (p: WallPost) => WallPost) => list.map(p => (p.id === id ? f(p) : p));
/** A post's place in a list (the same post can show once written and once reposted). */
export const postKey = (p: WallPost) => (p.repost ? `r:${p.repost.id}` : p.id);

/** Repost / un-repost a wall post on my own wall (Recursos, 2026-11-28). */
export async function togglePostRepost(id: string): Promise<{ reposted: boolean; n: number } | null> {
  const { data, error } = await createClient().rpc("toggle_post_repost", { p_post: id });
  if (error) { if (isVerifyError(error)) requestVerify(); return null; }
  track("repost", { kind: "post" });
  const row = (Array.isArray(data) ? data[0] : data) as { reposted: boolean; n: number } | undefined;
  return row ? { reposted: !!row.reposted, n: Number(row.n) } : null;
}

export function useWall(owner: string | undefined, open: boolean): WallState {
  const viewer = useViewerId();
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [off, setOff] = useState(false);
  const [replies, setReplies] = useState<Record<string, WallPost[] | undefined>>({});
  const isOwner = !!viewer && viewer === owner;

  const fetchPage = useCallback((before?: string) => {
    if (!owner) return Promise.resolve(null);
    const q = new URLSearchParams({ owner });
    if (before) q.set("before", before);
    return json<{ posts: WallPost[]; more: boolean; off: boolean }>(`/api/wall?${q}`);
  }, [owner]);

  const reload = useCallback(() => fetchPage().then(d => {
    if (!d) return;
    setPosts(d.posts); setMore(d.more); setOff(d.off); setLoaded(true);
  }), [fetchPage]);

  const loadReplies = useCallback((id: string) => {
    json<{ posts: WallPost[] }>(`/api/wall?parent=${id}`).then(d => { if (d) setReplies(r => ({ ...r, [id]: d.posts })); });
  }, []);

  useEffect(() => {
    if (!open || !owner) return;
    setLoaded(false);
    reload();
  }, [open, owner, reload]);

  // Live: someone wrote on this wall → reload the first page (and open threads).
  const openThreads = useRef<string[]>([]);
  openThreads.current = Object.keys(replies);
  useEffect(() => {
    if (!open || !owner) return;
    const sb = createClient();
    const ch = sb.channel(`wall-${owner}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `profile_user_id=eq.${owner}` }, payload => {
        const row = payload.new as { parent_id?: string | null };
        if (row.parent_id) { if (openThreads.current.includes(row.parent_id)) loadReplies(row.parent_id); }
        reload();
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [open, owner, reload, loadReplies]);

  const loadMore = useCallback(() => {
    const last = posts[posts.length - 1];
    if (!last) return;
    fetchPage(postSortAt(last)).then(d => {
      if (!d) return;
      setPosts(prev => [...prev, ...d.posts.filter(c => !prev.some(p => postKey(p) === postKey(c)))]);
      setMore(d.more);
    });
  }, [posts, fetchPage]);

  const post = useCallback(async (body: string, style: PostStyle, parent?: string | null): Promise<string | null> => {
    if (!owner) return wallError(undefined);
    const st = cleanPostStyle(style);
    const { error } = await createClient().rpc("post_wall", { p_owner: owner, p_body: body, p_parent: parent ?? null, p_style: Object.keys(st).length ? st : null });
    if (error) { if (isVerifyError(error)) requestVerify(); return wallError(error.message); }
    track("wall_post", { owner, reply: !!parent, fx: st.fx ?? null });
    if (parent) {
      loadReplies(parent);
      setPosts(prev => patchPost(prev, parent, p => ({ ...p, replies: p.replies + 1 })));
    } else {
      await reload();
      bumpCommentCount(owner, 1);
    }
    return null;
  }, [owner, reload, loadReplies]);

  const like = useCallback((id: string) => {
    const flip = (p: WallPost) => ({ ...p, liked: !p.liked, likes: Math.max(0, p.likes + (p.liked ? -1 : 1)) });
    setPosts(prev => patchPost(prev, id, flip));
    setReplies(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ? patchPost(v, id, flip) : v])));
    togglePostLike(id).then(res => {
      if (!res) { setPosts(prev => patchPost(prev, id, flip)); return; }
      const fix = (p: WallPost) => ({ ...p, liked: res.liked, likes: res.n });
      setPosts(prev => patchPost(prev, id, fix));
      setReplies(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ? patchPost(v, id, fix) : v])));
    });
  }, []);

  const remove = useCallback((id: string) => {
    const top = posts.some(p => p.id === id);
    setPosts(prev => prev.filter(p => p.id !== id));
    setReplies(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v?.filter(p => p.id !== id)])));
    if (!top) setPosts(prev => prev.map(p => (replies[p.id]?.some(x => x.id === id) ? { ...p, replies: Math.max(0, p.replies - 1) } : p)));
    deletePost(id).then(ok => {
      if (!ok) reload();
      else if (top && owner) bumpCommentCount(owner, -1);
    });
  }, [posts, replies, reload, owner]);

  const report = useCallback((id: string) => reportPost(id), []);
  const block = useCallback(async (authorId: string) => {
    if (!owner || !isOwner) return false;
    const ok = await blockFromWall(owner, authorId);
    return ok;
  }, [owner, isOwner]);

  const pin = useCallback((id: string, on: boolean) => {
    if (!isOwner) return;
    setPosts(prev => {
      const next = prev.map(p => ({ ...p, pinned: p.id === id ? on : on ? false : p.pinned }));
      return [...next.filter(p => p.pinned), ...next.filter(p => !p.pinned)];
    });
    createClient().rpc("pin_post", { p_id: id, p_on: on }).then(({ error }) => { if (error) reload(); });
  }, [isOwner, reload]);

  const repost = useCallback((id: string) => {
    const flip = (p: WallPost) => ({ ...p, reposted: !p.reposted, reposts: Math.max(0, (p.reposts ?? 0) + (p.reposted ? -1 : 1)) });
    setPosts(prev => patchPost(prev, id, flip));
    togglePostRepost(id).then(res => {
      if (!res) { setPosts(prev => patchPost(prev, id, flip)); return; }
      setPosts(prev => patchPost(prev, id, p => ({ ...p, reposted: res.reposted, reposts: res.n })));
      // My own wall shows what I repost: reload it.
      if (isOwner) reload();
    });
  }, [isOwner, reload]);

  return {
    posts, loaded, more, off, viewer, isOwner, canWrite: !!viewer && (isOwner || !off), replies,
    loadMore, loadReplies, post, like, remove, report, block, pin, repost,
  };
}

// ── The owner's wall settings (who can write) ────────────────────────────────

export function useWallSettings(): { off: boolean; setOff: (v: boolean) => void } {
  const viewer = useViewerId();
  const [off, setOffState] = useState(false);
  useEffect(() => {
    if (!viewer) return;
    createClient().from("profiles").select("comments_off").eq("user_id", viewer).maybeSingle()
      .then(({ data }) => setOffState(!!data?.comments_off));
  }, [viewer]);
  const setOff = useCallback((v: boolean) => {
    if (!viewer) return;
    setOffState(v);
    createClient().from("profiles").update({ comments_off: v }).eq("user_id", viewer).then(({ error }) => { if (error) setOffState(!v); });
  }, [viewer]);
  return { off, setOff };
}

// ── The style I write with (remembered: last + recent) ───────────────────────

let styleCache: { last: PostStyle | null; recent: PostStyle[] } | null = null;

export function usePostStyle(): { style: PostStyle; setStyle: (s: PostStyle) => void; recent: PostStyle[]; remember: (s: PostStyle) => void } {
  const viewer = useViewerId();
  const [style, setStyle] = useState<PostStyle>(() => styleCache?.last ?? {});
  const [recent, setRecent] = useState<PostStyle[]>(() => styleCache?.recent ?? []);
  useEffect(() => {
    if (!viewer || styleCache) return;
    createClient().from("profiles").select("post_style").eq("user_id", viewer).maybeSingle().then(({ data }) => {
      const ps = (data?.post_style ?? null) as { last?: PostStyle; recent?: PostStyle[] } | null;
      styleCache = { last: ps?.last ? cleanPostStyle(ps.last) : null, recent: (ps?.recent ?? []).map(cleanPostStyle) };
      if (styleCache.last) setStyle(styleCache.last);
      setRecent(styleCache.recent);
    });
  }, [viewer]);
  const remember = useCallback((s: PostStyle) => {
    const st = cleanPostStyle(s);
    if (!Object.keys(st).length) return;
    const key = JSON.stringify(st);
    const rec = [st, ...(styleCache?.recent ?? []).filter(r => JSON.stringify(r) !== key)].slice(0, 5);
    styleCache = { last: st, recent: rec };
    setRecent(rec);
    createClient().rpc("set_post_style", { p_style: st });
  }, []);
  return { style, setStyle, recent, remember };
}

// ── Me (the mini card at the bottom-left) + my unread notices ────────────────

let meCache: PostAuthor | null | undefined;
const meSubs = new Set<(a: PostAuthor | null) => void>();
const unreadSubs = new Set<(n: number) => void>();
let unreadNow = 0;
const setUnread = (n: number) => { unreadNow = n; unreadSubs.forEach(f => f(n)); };

export function useMe(): PostAuthor | null | undefined {
  const viewer = useViewerId();
  const [me, setMe] = useState<PostAuthor | null | undefined>(meCache);
  useEffect(() => {
    if (viewer === undefined) return;
    if (viewer === null) { setMe(null); return; }
    meSubs.add(setMe);
    if (meCache === undefined) {
      json<{ me: PostAuthor | null }>("/api/me").then(d => { meCache = d?.me ?? null; meSubs.forEach(f => f(meCache ?? null)); });
    } else setMe(meCache);
    return () => { meSubs.delete(setMe); };
  }, [viewer]);
  return viewer === null ? null : me;
}

/** Notices since I last opened Avisos (wall posts, replies, likes) — on load, live and on focus. */
export function useUnreadActivity(enabled: boolean): number {
  const viewer = useViewerId();
  const [n, setN] = useState(unreadNow);
  useEffect(() => {
    if (!enabled || !viewer) return;
    unreadSubs.add(setN);
    const sb = createClient();
    const refresh = () => sb.rpc("my_unread_activity").then(({ data }) => setUnread(Number(data ?? 0)));
    refresh();
    // No live channel here (2026-11-27, load): every signed-in page held one,
    // and the database polls its changes for each. The dot updates on focus
    // and every 90 s; an open wall is still live (useWall).
    const iv = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 90_000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(iv); unreadSubs.delete(setN); document.removeEventListener("visibilitychange", onVis); };
  }, [enabled, viewer]);
  return n;
}
export function markActivitySeen() {
  createClient().rpc("mark_comments_seen").then(() => setUnread(0));
}

// ── Feed and Avisos ──────────────────────────────────────────────────────────

export function useActivity(open: boolean): { items: ActivityItem[]; loaded: boolean } {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!open) return;
    json<{ items: ActivityItem[] }>("/api/activity").then(d => { setItems(d?.items ?? []); setLoaded(true); markActivitySeen(); });
  }, [open]);
  return { items, loaded };
}
