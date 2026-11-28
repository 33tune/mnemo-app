/**
 * Explorar (2026-11-26): which community cards to show and in what order.
 *
 * Only finished cards take part (a face — photo, logo, name or stickers — and
 * real content) and, among those, the ones made with care: "esmero" adds up what the owner
 * customized (texts, effects, stickers, fonts, background, the room around the
 * card) plus how long they spent editing and how many changes they made. The
 * low-effort ones (a photo and nothing else) never show.
 *
 * Tabs: "para" (Para vos, 2026-11-27: "siempre salen los mismos") is a
 * weighted RANDOM draw, new each time Explorar opens (the seed comes from the
 * viewer's visit): better-made cards, recently edited ones and new ones are
 * likelier to come first, but any good card can; the viewer's own favorites
 * are left out (they already have them in Tus favoritos); "nuevas" is newest
 * first; "visitadas" is most visited in 14 days; "holo" is the cards with
 * collection effects (holo, glare, glitter, strass); "vivo" (2026-11-28) is who is on
 * myLand right now. "nuevas" rotates the last day's cards at random on top.
 */
import type { CanvasState, ProfileCardData } from "@/types";

export type ExploreTab = "para" | "nuevas" | "visitadas" | "vivo" | "holo";
export const EXPLORE_TABS: { id: ExploreTab; label: string }[] = [
  { id: "para", label: "Para vos" },
  { id: "nuevas", label: "Nuevas" },
  { id: "visitadas", label: "Más visitadas" },
  { id: "vivo", label: "En vivo" },
  { id: "holo", label: "Con holo" },
];
export const isExploreTab = (v: unknown): v is ExploreTab => v === "para" || v === "nuevas" || v === "visitadas" || v === "vivo" || v === "holo";
/** Nuevas (2026-11-28): cards younger than this rotate at random on top (a new mix each visit). */
export const NEW_ROTATE_DAYS = 1;

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
  /** Last time the owner saved or published the room (optional: older caches). */
  updatedAt?: string;
  /** The full card / room (tests, the indexer); Explorar's list has only the
   * numbers below, computed when the owner saved (explore_cards). */
  card?: ProfileCardData;
  state?: CanvasState;
  content?: number;
  finished?: boolean;
  collection?: boolean;
  signals: ExploreSignals;
}

/** The numbers Explorar keeps for a card (explore_index), from the card itself. */
export function exploreNumbers(card: ProfileCardData, state: CanvasState): { content: number; finished: boolean; collection: boolean } {
  return { content: contentScore(card, state), finished: isFinished(card, state), collection: hasCollectionFx(card) };
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
export function careScore(c: Pick<ExploreCandidate, "card" | "state" | "signals" | "content">): number {
  const time = Math.min(90, c.signals.editMinutes) / 9;      // up to +10
  const changes = Math.min(400, c.signals.edits) / 50;        // up to +8
  const content = c.content ?? (c.card ? contentScore(c.card, c.state ?? ({} as CanvasState)) : 0);
  return Math.round((content + time + changes) * 10) / 10;
}

/** Below this, a card is considered low effort and never shown. */
export const MIN_CARE = 6;

/** A stable pseudo-random number in [0, 1) for a string (the daily shuffle). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  // Final mix: seeds that differ in one letter give unrelated orders.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

export interface RankOptions {
  tab: ExploreTab;
  now: number;
  /** Changes the shuffle: the day plus who is looking (each person sees a different mix). */
  seed: string;
  excludeUserId?: string | null;
  /** Para vos: cards the viewer already has in favorites (left out). */
  excludeIds?: ReadonlySet<string>;
  /** En vivo: who is on myLand now (user id → last moment, ms). */
  live?: ReadonlyMap<string, number>;
}

/** Para vos: how likely a card is to come up first (1 … ~10). Care counts most;
 * a card edited in the last days, a new card and some activity add a bit. */
export function paraWeight(c: ExploreCandidate, now: number): number {
  const care = careScore(c);
  const days = (iso?: string) => (iso ? Math.max(0, (now - Date.parse(iso)) / 86400000) : Infinity);
  const edited = days(c.updatedAt);
  const age = days(c.createdAt);
  const act = Math.sqrt(c.signals.views14 * 0.4 + c.signals.favs14 * 3 + c.signals.posts14 * 2 + c.signals.favs * 0.5);
  return 1 + Math.max(0, care - MIN_CARE) / 5
    + (edited < 3 ? 2 * (1 - edited / 3) : 0)
    + (age < 10 ? 1.5 * (1 - age / 10) : 0)
    + Math.min(2, act / 6);
}

/** Nuevas: weight of a card made `ageDays` ago inside the rotating day (4 → 1). */
export const newWeight = (ageDays: number) => 1 + 3 * Math.max(0, 1 - ageDays / NEW_ROTATE_DAYS);

export function rankExplore(list: ExploreCandidate[], o: RankOptions): ExploreCandidate[] {
  const finished = (c: ExploreCandidate) => c.finished ?? (!!c.card && isFinished(c.card, c.state));
  const collection = (c: ExploreCandidate) => c.collection ?? (!!c.card && hasCollectionFx(c.card));
  const pool = list.filter(c => c.userId !== o.excludeUserId && finished(c) && careScore(c) >= MIN_CARE)
    .filter(c => o.tab !== "para" || !o.excludeIds?.has(c.userId))
    .filter(c => o.tab !== "holo" || collection(c))
    .filter(c => o.tab !== "vivo" || !!o.live?.has(c.userId));
  const ageDays = (c: ExploreCandidate) => Math.max(0, (o.now - Date.parse(c.createdAt)) / 86400000);
  const score = (c: ExploreCandidate) => {
    const shuffle = hash01(`${o.seed}:${c.userId}`);
    switch (o.tab) {
      // Nuevas: the last day's cards rotate on top (each visit a new order, so
      // a card is not buried by the next ones), the newest more often (weighted
      // draw: just made ≈ 4×, a day old ≈ 1×); then newest first.
      case "nuevas": return ageDays(c) < NEW_ROTATE_DAYS ? 1000 + Math.pow(Math.max(1e-9, shuffle), 1 / newWeight(ageDays(c))) : -ageDays(c);
      case "vivo": return o.live?.get(c.userId) ?? 0;
      case "visitadas": return c.signals.views14 + shuffle * 0.5;
      // Weighted random order (Efraimidis–Spirakis): key = u^(1/w).
      default: return Math.pow(Math.max(1e-9, shuffle), 1 / paraWeight(c, o.now));
    }
  };
  return pool.map(c => ({ c, s: score(c) })).sort((a, b) => b.s - a.s || a.c.handle.localeCompare(b.c.handle)).map(x => x.c);
}
