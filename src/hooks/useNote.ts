"use client";
/**
 * Notas (2026-11-06): a profile's active note (one, 24 h) and how many
 * people saw it. The owner publishes / deletes it; a visitor's look counts
 * once (view_note: per account, or per device without a session).
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deviceKey, useViewerId } from "@/lib/viewer";

export type Note = { id: string; body: string; created_at: string; expires_at: string };

export interface NoteState {
  note: Note | null;
  views: number;
  loaded: boolean;
  isOwner: boolean;
  post: (body: string) => Promise<string | null>;
  remove: () => Promise<void>;
}

// One state per profile on the page, shared by every place that shows it
// (the box on the card, the inspector's Nota part).
type Shared = { note: Note | null; views: number; loaded: boolean };
const shared = new Map<string, Shared>();
const subs = new Map<string, Set<(s: Shared) => void>>();
function publish(userId: string, patch: Partial<Shared>) {
  const next = { ...(shared.get(userId) ?? { note: null, views: 0, loaded: false }), ...patch };
  shared.set(userId, next);
  subs.get(userId)?.forEach(f => f(next));
}

export function useNote(userId?: string, opts: { countView?: boolean } = {}): NoteState {
  const viewer = useViewerId();
  const init = userId ? shared.get(userId) : undefined;
  const [st, setSt] = useState<Shared>(init ?? { note: null, views: 0, loaded: false });
  const { note, views, loaded } = st;
  useEffect(() => {
    if (!userId) return;
    const set = subs.get(userId) ?? new Set();
    set.add(setSt);
    subs.set(userId, set);
    const cur = shared.get(userId);
    if (cur) setSt(cur);
    return () => { set.delete(setSt); };
  }, [userId]);
  const setNote = useCallback((n: Note | null) => { if (userId) publish(userId, { note: n, loaded: true }); }, [userId]);
  const setViews = useCallback((v: number) => { if (userId) publish(userId, { views: v }); }, [userId]);
  const isOwner = !!viewer && viewer === userId;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    createClient().from("notes").select("id, body, created_at, expires_at").eq("user_id", userId)
      .gt("expires_at", new Date().toISOString()).maybeSingle()
      .then(({ data }) => { if (alive) setNote((data as Note | null) ?? null); });
    return () => { alive = false; };
  }, [userId, setNote]);

  // Expiry while the page is open.
  useEffect(() => {
    if (!note) return;
    const ms = Date.parse(note.expires_at) - Date.now();
    if (ms <= 0) { setNote(null); return; }
    const t = setTimeout(() => setNote(null), Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [note, setNote]);

  // A visitor's look counts once; the count itself.
  useEffect(() => {
    if (!note || viewer === undefined) return;
    let alive = true;
    const sb = createClient();
    const count = () => sb.rpc("note_view_count", { p_note: note.id }).then(({ data }) => { if (alive) setViews(Number(data ?? 0)); });
    if (opts.countView && viewer !== userId) sb.rpc("view_note", { p_note: note.id, p_key: deviceKey() }).then(count);
    else count();
    return () => { alive = false; };
  }, [note, viewer, userId, opts.countView, setViews]);

  const post = useCallback(async (body: string) => {
    const { data, error } = await createClient().rpc("post_note", { p_body: body });
    if (error) return error.message.includes("check") ? "La nota tiene que tener entre 1 y 60 caracteres." : "No se pudo publicar la nota.";
    const n = (Array.isArray(data) ? data[0] : data) as Note | null;
    setNote(n); setViews(0);
    return null;
  }, [setNote, setViews]);

  const remove = useCallback(async () => {
    if (!userId) return;
    await createClient().from("notes").delete().eq("user_id", userId);
    setNote(null); setViews(0);
  }, [userId, setNote, setViews]);

  return { note, views, loaded, isOwner, post, remove };
}
