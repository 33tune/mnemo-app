/**
 * Acceso directo (2026-11-06): the profiles I gave a favorite, for the bar
 * at the bottom. Order: the ones I pinned, then a note I have not seen yet,
 * then how often I visit them (last 60 days), then the newest favorite.
 * Hidden ones are left out of the bar (still listed when editing it).
 */
import type { NoteBoxStyle } from "@/types";

export interface Shortcut {
  userId: string;
  handle: string;
  name: string;
  photo: string | null;
  pfpRadius: string;
  bg: string;
  nameColor: string;
  pinned: boolean;
  hidden: boolean;
  visits: number;
  favoritedAt: string;
  note: { id: string; body: string; created_at: string; expires_at: string } | null;
  noteSeen: boolean;
  noteStyle?: NoteBoxStyle;
  /** A short signature of their PUBLISHED card / room: when it changes, they
   * published changes (the bar's pink dot, compared with what I last saw). */
  sig?: string;
}

/** Signatures I already saw, per profile (this browser). */
const SEEN_KEY = "mnemo_seen_sigs";
export function readSeenSigs(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, string>; } catch { return {}; }
}
export function writeSeenSigs(m: Record<string, string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch { /* no storage */ }
}
/** Which profiles published something since I last saw them. A profile never
 * seen before starts as seen (no dot for everyone the first time). */
export function changedSince(list: Shortcut[], seen: Record<string, string>): { changed: Set<string>; seen: Record<string, string>; dirty: boolean } {
  const changed = new Set<string>(); const next = { ...seen }; let dirty = false;
  for (const s of list) {
    if (!s.sig) continue;
    if (!(s.userId in next)) { next[s.userId] = s.sig; dirty = true; }
    else if (next[s.userId] !== s.sig) changed.add(s.userId);
  }
  return { changed, seen: next, dirty };
}

/** Most of the bar's space (more scroll). */
export const SHORTCUTS_MAX = 50;

export function sortShortcuts(list: Shortcut[]): Shortcut[] {
  const rank = (s: Shortcut) => (s.pinned ? 0 : s.note && !s.noteSeen ? 1 : 2);
  return [...list].sort((a, b) =>
    rank(a) - rank(b)
    || b.visits - a.visits
    || Date.parse(b.favoritedAt) - Date.parse(a.favoritedAt)
    || a.handle.localeCompare(b.handle));
}

export function barShortcuts(list: Shortcut[]): Shortcut[] {
  return sortShortcuts(list.filter(s => !s.hidden)).slice(0, SHORTCUTS_MAX);
}
