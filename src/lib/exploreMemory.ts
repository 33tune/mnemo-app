/**
 * Explorar recuerda dónde estabas (2026-11-28, pedido del usuario): visiting a
 * card from Explorar used to throw the list away — coming back meant starting
 * over. Now what the panel showed (section, tab, the cards already loaded, the
 * scroll) is kept for this tab of the browser (sessionStorage, 30 min), and on
 * a computer the next profile opens with Explorar already there, at the same
 * place. On a phone the profile shows first; opening Explorar again resumes.
 */
const KEY = "ml_explore_mem";
const REOPEN = "ml_explore_reopen";
const TTL = 30 * 60_000;

export interface ExploreMemory<T = unknown> {
  section: "cards" | "feed";
  tab: string;
  items: T[] | null;
  more: boolean;
  seed: string;
  scroll: number;
  at?: number;
}

export function saveExplore<T>(m: ExploreMemory<T>): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...m, items: m.items?.slice(0, 300) ?? null, at: Date.now() })); } catch { /* full / private */ }
}
export function loadExplore<T>(): ExploreMemory<T> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as ExploreMemory<T>;
    if (!m.at || Date.now() - m.at > TTL) { sessionStorage.removeItem(KEY); return null; }
    return m;
  } catch { return null; }
}
/** The next page should open with Explorar (a card was opened from it). */
export function markExploreReopen(): void { try { sessionStorage.setItem(REOPEN, String(Date.now())); } catch { /* */ } }
export function takeExploreReopen(): boolean {
  try {
    const v = Number(sessionStorage.getItem(REOPEN) ?? 0);
    sessionStorage.removeItem(REOPEN);
    return v > 0 && Date.now() - v < 60_000;
  } catch { return false; }
}
