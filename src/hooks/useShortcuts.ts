"use client";
/**
 * Acceso directo (2026-11-06): the bar's profiles (/api/shortcuts), kept
 * fresh by the notices (note_alerts, Realtime): when someone I gave a
 * favorite posts a note, the bar reloads and, with the tab open, a soft
 * chime plays (unless muted). Browsers only let a page play sound after the
 * person touched it once, so the first notice after opening may be silent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";
import type { Shortcut } from "@/lib/shortcuts";

const MUTE_KEY = "mnemo_notes_muted";

let audio: AudioContext | null = null;
function ensureAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audio) audio = new Ctx();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    return audio;
  } catch { return null; }
}
/** Two soft notes (no file to load). */
export function playChime() {
  const ctx = ensureAudio();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.02;
  for (const [i, f] of [[0, 880], [1, 1318.5]] as const) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    const t = t0 + i * 0.13;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.6);
  }
}

export function useShortcuts(enabled: boolean) {
  const me = useViewerId();
  const [list, setList] = useState<Shortcut[] | null>(null);
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => {
    // The bar's mute button was removed (2026-11-06): the chime always plays.
    try { localStorage.removeItem(MUTE_KEY); } catch { /* no storage */ }
  }, []);
  const setMuted = useCallback((m: boolean) => {
    setMutedState(m); mutedRef.current = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* no storage */ }
  }, []);

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/shortcuts", { cache: "no-store" });
      if (!r.ok) { setList([]); return; }
      const j = await r.json();
      setList(j.shortcuts ?? []);
    } catch { /* keep what we had */ }
  }, []);

  useEffect(() => {
    if (!enabled || !me) return;
    reload();
    // Sound needs one touch on the page first.
    const unlock = () => { ensureAudio(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const sb = createClient();
    const ch = sb.channel(`note-alerts-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "note_alerts", filter: `user_id=eq.${me}` }, () => {
        if (!mutedRef.current && !document.hidden) playChime();
        reload();
      })
      .subscribe();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    const onSeen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setList(l => l?.map(x => (x.note?.id === id ? { ...x, noteSeen: true } : x)) ?? l);
    };
    window.addEventListener("mnemo:note-seen", onSeen);
    return () => {
      sb.removeChannel(ch);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("mnemo:note-seen", onSeen);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled, me, reload]);

  /** Pin / hide one (my own favorites row). */
  const setFlags = useCallback(async (userId: string, flags: { pinned?: boolean; hidden?: boolean }) => {
    if (!me) return;
    setList(l => l?.map(s => (s.userId === userId ? { ...s, ...flags } : s)) ?? l);
    await createClient().from("favorites").update(flags).eq("user_id", me).eq("target_user_id", userId);
  }, [me]);

  return { list, signedIn: !!me, muted, setMuted, setFlags, reload };
}
