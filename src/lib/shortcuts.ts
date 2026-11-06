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
