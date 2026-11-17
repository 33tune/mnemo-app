"use client";
/**
 * Comentarios (2026-11-17): a profile's comment count (anyone), the list
 * (loaded when the panel opens), posting / deleting / the owner's heart, the
 * owner's on/off switch, and the owner's "new comments" dot.
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";
import { commentError, type CommentItem } from "@/lib/comments";

const countSubs = new Map<string, Set<(n: number) => void>>();
const counts = new Map<string, number>();
function publishCount(owner: string, n: number) {
  counts.set(owner, n);
  countSubs.get(owner)?.forEach(f => f(n));
}

/** The number on the card and on the button (shared by both). */
export function useCommentCount(ownerUserId?: string): number {
  const [n, setN] = useState(() => (ownerUserId ? counts.get(ownerUserId) ?? 0 : 0));
  useEffect(() => {
    if (!ownerUserId) return;
    const set = countSubs.get(ownerUserId) ?? new Set();
    set.add(setN);
    countSubs.set(ownerUserId, set);
    let alive = true;
    createClient().rpc("comment_counts", { targets: [ownerUserId] }).then(({ data }) => {
      const row = Array.isArray(data) ? (data[0] as { n?: number } | undefined) : undefined;
      if (alive) publishCount(ownerUserId, Number(row?.n ?? 0));
    });
    return () => { alive = false; set.delete(setN); };
  }, [ownerUserId]);
  return n;
}

export interface CommentsState {
  items: CommentItem[];
  loaded: boolean;
  more: boolean;
  off: boolean;
  isOwner: boolean;
  signedOut: boolean;
  viewer: string | null | undefined;
  loadMore: () => void;
  post: (body: string) => Promise<string | null>;
  remove: (id: string) => void;
  like: (id: string, liked: boolean) => void;
  setOff: (off: boolean) => void;
}

export function useComments(ownerUserId: string | undefined, open: boolean): CommentsState {
  const viewer = useViewerId();
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [off, setOffState] = useState(false);
  const isOwner = !!viewer && viewer === ownerUserId;

  const fetchPage = useCallback(async (before?: string) => {
    if (!ownerUserId) return null;
    const q = new URLSearchParams({ owner: ownerUserId });
    if (before) q.set("before", before);
    const r = await fetch(`/api/comments?${q}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return null;
    return (await r.json()) as { comments: CommentItem[]; more: boolean; off: boolean };
  }, [ownerUserId]);

  useEffect(() => {
    if (!open || !ownerUserId) return;
    let alive = true;
    fetchPage().then(d => {
      if (!alive || !d) return;
      setItems(d.comments); setMore(d.more); setOffState(d.off); setLoaded(true);
    });
    return () => { alive = false; };
  }, [open, ownerUserId, fetchPage]);

  // The owner opening the panel = comments seen (the dot goes away).
  useEffect(() => {
    if (!open || !isOwner) return;
    createClient().rpc("mark_comments_seen").then(() => unreadBus.forEach(f => f(0)));
  }, [open, isOwner]);

  const loadMore = useCallback(() => {
    const last = items[items.length - 1];
    if (!last) return;
    fetchPage(last.createdAt).then(d => {
      if (!d) return;
      setItems(prev => [...prev, ...d.comments.filter(c => !prev.some(p => p.id === c.id))]);
      setMore(d.more);
    });
  }, [items, fetchPage]);

  const post = useCallback(async (body: string): Promise<string | null> => {
    if (!ownerUserId) return "No se pudo enviar.";
    const { data, error } = await createClient().rpc("post_comment", { p_owner: ownerUserId, p_body: body });
    if (error) return commentError(error.message);
    const fresh = await fetchPage();
    if (fresh) { setItems(fresh.comments); setMore(fresh.more); }
    else if (data) {
      const row = data as { id: string; body: string; created_at: string; author_user_id: string };
      setItems(prev => [{ id: row.id, authorId: row.author_user_id, body: row.body, ownerLiked: false, createdAt: row.created_at, handle: "", name: "", photo: null, pfpRadius: "50%" }, ...prev]);
    }
    publishCount(ownerUserId, (counts.get(ownerUserId) ?? 0) + 1);
    return null;
  }, [ownerUserId, fetchPage]);

  const remove = useCallback((id: string) => {
    if (!ownerUserId) return;
    const before = items;
    setItems(prev => prev.filter(c => c.id !== id));
    publishCount(ownerUserId, Math.max(0, (counts.get(ownerUserId) ?? 1) - 1));
    createClient().from("comments").delete().eq("id", id).then(({ error }) => {
      if (error) { setItems(before); publishCount(ownerUserId, (counts.get(ownerUserId) ?? 0) + 1); }
    });
  }, [ownerUserId, items]);

  const like = useCallback((id: string, liked: boolean) => {
    setItems(prev => prev.map(c => (c.id === id ? { ...c, ownerLiked: liked } : c)));
    createClient().rpc("like_comment", { p_id: id, p_liked: liked }).then(({ error }) => {
      if (error) setItems(prev => prev.map(c => (c.id === id ? { ...c, ownerLiked: !liked } : c)));
    });
  }, []);

  const setOff = useCallback((v: boolean) => {
    if (!ownerUserId || !isOwner) return;
    setOffState(v);
    createClient().from("profiles").update({ comments_off: v }).eq("user_id", ownerUserId).then(({ error }) => {
      if (error) setOffState(!v);
    });
  }, [ownerUserId, isOwner]);

  return { items, loaded, more, off, isOwner, signedOut: viewer === null, viewer, loadMore, post, remove, like, setOff };
}

const unreadBus = new Set<(n: number) => void>();

/** The owner's dot: comments on my profile since I last opened the panel —
 * checked on load and live (Realtime on my comments). */
export function useUnreadComments(enabled: boolean): number {
  const viewer = useViewerId();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled || !viewer) return;
    unreadBus.add(setN);
    const sb = createClient();
    let alive = true;
    const refresh = () => sb.rpc("my_unread_comments").then(({ data }) => { if (alive) setN(Number(data ?? 0)); });
    refresh();
    const ch = sb.channel(`comments-${viewer}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `profile_user_id=eq.${viewer}` }, payload => {
        const row = payload.new as { author_user_id?: string; profile_user_id?: string };
        if (row.author_user_id === viewer) return;
        refresh();
        if (row.profile_user_id) publishCount(row.profile_user_id, (counts.get(row.profile_user_id) ?? 0) + 1);
      })
      .subscribe();
    return () => { alive = false; unreadBus.delete(setN); sb.removeChannel(ch); };
  }, [enabled, viewer]);
  return n;
}
