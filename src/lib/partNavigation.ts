/**
 * MYLAND Editor v3 — Phase H (D4/D5): navigating the ProfileCard by its PARTS.
 *
 * Click 1 selects the card (unchanged). Click 2 on a part of the ALREADY
 * selected card — without a drag — opens that part in the inspector (its
 * object: Nombre, Bio, Foto…). The part is resolved after the click with
 * `closest("[data-role]")` on the lines / blocks ProfileCard already renders;
 * nothing about the pointer engine changes:
 * - the block drags (identity / location / views / links / photo / logo /
 *   free layout) are untouched — a click that ends a real movement is not a
 *   part click (PART_CLICK_SLOP: the drags react to any 1px jitter, a part
 *   click tolerates it);
 * - the hit-stack (hitStack.ts, Stage 3B.4) is untouched: no text becomes a
 *   "hot" control, an image on top of the card still takes the click.
 * Esc goes back to the card (the canvas' first Esc closes the inspector; the
 * card stays selected). The highlight and the "Editando …" pill are editor
 * overlays — never in the public render.
 */
import type { ObjectId } from "./inspectorObjects";

/** The card's parts that exist on the canvas, as inspector objects. */
export const PART_ROLES = ["photo", "name", "handle", "descriptor", "location", "bio", "about", "views", "links", "buttons", "crew", "logo"] as const satisfies readonly ObjectId[];
export type PartRole = (typeof PART_ROLES)[number];

/** The attribute ProfileCard puts on each part's wrapper. */
export const PART_ATTR = "data-role";

/** Movement (px) between press and release that still counts as a click. */
export const PART_CLICK_SLOP = 4;

export function isPartRole(v: string | null | undefined): v is PartRole {
  return !!v && (PART_ROLES as readonly string[]).includes(v);
}

interface ClosestCapable { closest?: (selector: string) => { getAttribute(name: string): string | null } | null }

/** The part under a click target, if it is inside `root` (the card). */
export function partFromTarget(target: unknown, root: { contains(n: unknown): boolean } | null): PartRole | null {
  const t = target as ClosestCapable | null;
  const hit = t?.closest?.(`[${PART_ATTR}]`);
  if (!hit || !root || !root.contains(hit)) return null;
  const role = hit.getAttribute(PART_ATTR);
  return isPartRole(role) ? role : null;
}

/** What ProfileCard reports with each click (the board decides). */
export interface PartClick {
  /** The part under the click (null = the card's own surface). */
  role: PartRole | null;
  /** The card was selected when the button went down (click 2). */
  wasSelected: boolean;
  /** The pointer moved more than PART_CLICK_SLOP — it was a drag. */
  moved: boolean;
}

export function movedBeyondSlop(down: { x: number; y: number } | null, up: { x: number; y: number }): boolean {
  if (!down) return false;
  return Math.hypot(up.x - down.x, up.y - down.y) > PART_CLICK_SLOP;
}

/**
 * The part a click opens, or null (then the click keeps its old meaning:
 * select / click-through). Only in the editor, only on click 2 of the card
 * that is the WHOLE selection, never with Shift (multi-select) and never
 * after a drag.
 */
export function resolvePartClick(p: {
  click: PartClick | undefined; canInteract: boolean; shiftKey: boolean; soleSelected: boolean;
}): PartRole | null {
  const c = p.click;
  if (!c || !p.canInteract || p.shiftKey || !p.soleSelected) return null;
  if (!c.wasSelected || c.moved) return null;
  return c.role;
}
