/**
 * Explorar (2026-11-26): which community cards to show and in what order.
 *
 * Only finished cards take part (a face — photo, logo, name or stickers — and
 * real content) and, among those, the ones made with care: "esmero" adds up what the owner
 * customized (texts, effects, stickers, fonts, background, the room around the
 * card) plus how long they spent editing and how many changes they made. The
 * low-effort ones (a photo and nothing else) never show.
 *
 * Tabs: "para" (Para vos) mixes care + recent activity + a boost for new cards
 * + a daily shuffle, so it is not always the same faces; "nuevas" is newest
 * first; "visitadas" is most visited in 14 days; "holo" is the cards with
 * collection effects (holo, glare, glitter, strass).
 */
import type { CanvasState, ProfileCardData } from "@/types";

export type ExploreTab = "para" | "nuevas" | "visitadas" | "holo";
export const EXPLORE_TABS: { id: ExploreTab; label: string }[] = [
  { id: "para", label: "Para vos" },
  { id: "nuevas", label: "Nuevas" },
  { id: "visitadas", label: "Más visitadas" },
  { id: "holo", label: "Con holo" },
];
export const isExploreTab = (v: unknown): v is ExploreTab => v === "para" || v === "nuevas" || v === "visitadas" || v === "holo";

export interface ExploreSignals {
  views14: number;
  favs: number;
  favs14: number;
  posts14: number;
  editMinutes: number;
  edits: number;
}

export interface ExploreCandidate {
  userId: string;
  handle: string;
  createdAt: string;
  card: ProfileCardData;
  state: CanvasState;
  signals: ExploreSignals;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

/** The public card of a room (the one marked public, else the first). */
export function publicCardOf(state: CanvasState): ProfileCardData | null {
  const list = arr(state.profiles) as ProfileCardData[];
  return list.find(c => c && (c as ProfileCardData & { isPublic?: boolean }).isPublic) ?? list[0] ?? null;
}

/** Finished: it has a face (a photo, a logo, a name or stickers) and real
 * content around it. Many of the best cards have no "name" (a logo or the
 * @ instead) or no links, so no single field is required. */
export function isFinished(card: ProfileCardData, state?: CanvasState): boolean {
  const c = card as ProfileCardData & Record<string, unknown>;
  const face = !!str(card.photo) || !!str(obj(c.logo)?.url) || !!str(card.name) || arr(c.stickers).length > 0;
  return face && contentScore(card, state ?? ({} as CanvasState)) >= MIN_CONTENT;
}

/** Content needed to count as finished (a few real customizations). */
export const MIN_CONTENT = 4;

/** Collection effects that the "Con holo" tab shows. */
export function hasCollectionFx(card: ProfileCardData): boolean {
  const fx = obj(card.effects) ?? {};
  return ["holo", "glare", "glitter", "strass", "edge", "dust", "aura"].some(k => {
    const e = obj(fx[k]);
    return !!e && e.enabled !== false;
  });
}

/** How much the owner customized the card and its room (0…~30). */
export function contentScore(card: ProfileCardData, state: CanvasState): number {
  let s = 0;
  const c = card as ProfileCardData & Record<string, unknown>;
  for (const k of ["status", "location", "bio", "aboutText"]) if (str(c[k])) s += 1;
  s += Math.min(3, arr(c.contactLinks).length) * 0.7;
  s += Math.min(4, arr(c.linkButtons).length) * 0.7;
  s += Math.min(4, arr(c.stickers).length) * 0.8;
  if (obj(c.logo) && str(obj(c.logo)?.url)) s += 1;
  const fx = obj(c.effects) ?? {};
  const bg = obj(fx.bg);
  if (bg && (str(bg.color) || str(bg.image))) s += 1.5;
  if (obj(fx.gradient)) s += 0.5;
  const fxKeys = Object.keys(fx).filter(k => !["bg", "paused", "gradient", "text", "textRoles"].includes(k) && obj(fx[k]) && obj(fx[k])!.enabled !== false);
  s += Math.min(6, fxKeys.length) * 0.8;
  const roles = obj(fx.textRoles);
  if (roles && Object.keys(roles).length) s += Math.min(3, Object.keys(roles).length) * 0.5;
  const fonts = Object.keys(c).filter(k => /Font$/.test(k) && str(c[k]));
  s += Math.min(4, fonts.length) * 0.5;
  // The room around the card.
  const st = state as CanvasState & Record<string, unknown>;
  if (str(st.wallpaper)) s += 1.5;
  s += Math.min(6, arr(st.images).length) * 0.6;
  s += Math.min(4, arr(st.texts).length) * 0.4;
  return Math.round(s * 10) / 10;
}

/** Care = what is on the card + time and changes spent on it. */
export function careScore(c: Pick<ExploreCandidate, "card" | "state" | "signals">): number {
  const time = Math.min(90, c.signals.editMinutes) / 9;      // up to +10
  const changes = Math.min(400, c.signals.edits) / 50;        // up to +8
  return Math.round((contentScore(c.card, c.state) + time + changes) * 10) / 10;
}

/** Below this, a card is considered low effort and never shown. */
export const MIN_CARE = 6;

/** A stable pseudo-random number in [0, 1) for a string (the daily shuffle). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

export interface RankOptions {
  tab: ExploreTab;
  now: number;
  /** Changes the shuffle: the day plus who is looking (each person sees a different mix). */
  seed: string;
  excludeUserId?: string | null;
}

export function rankExplore(list: ExploreCandidate[], o: RankOptions): ExploreCandidate[] {
  const pool = list.filter(c => c.userId !== o.excludeUserId && isFinished(c.card, c.state) && careScore(c) >= MIN_CARE)
    .filter(c => o.tab !== "holo" || hasCollectionFx(c.card));
  const ageDays = (c: ExploreCandidate) => Math.max(0, (o.now - Date.parse(c.createdAt)) / 86400000);
  const score = (c: ExploreCandidate) => {
    const care = careScore(c);
    const act = Math.sqrt(c.signals.views14 * 0.4 + c.signals.favs14 * 3 + c.signals.posts14 * 2 + c.signals.favs * 0.5);
    const fresh = ageDays(c) < 10 ? 4 * (1 - ageDays(c) / 10) : 0;
    const shuffle = hash01(`${o.seed}:${c.userId}`);
    switch (o.tab) {
      case "nuevas": return -ageDays(c);
      case "visitadas": return c.signals.views14 + shuffle * 0.5;
      default: return care * 0.6 + act * 1.4 + fresh + shuffle * 6;
    }
  };
  return pool.map(c => ({ c, s: score(c) })).sort((a, b) => b.s - a.s || a.c.handle.localeCompare(b.c.handle)).map(x => x.c);
}
