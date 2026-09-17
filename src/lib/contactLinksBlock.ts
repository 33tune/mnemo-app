/**
 * Pure glue between the generic Links-block infrastructure (linksBlockSizing.ts,
 * cardComposition.ts's computeBlockLayout links extension, cardGeometry.ts's
 * computeRequiredCardHeight — all Stage 4.2-A) and ProfileCard's actual
 * Contact Links feature (Stage 4.2-B). No React, no DOM: fixed sizing
 * constants + pure functions, same architectural family as the files it wraps.
 */
import type { CardFormat } from "@/types";
import type { ElementBox, ElementRole } from "./cardComposition";
import { computeLinksNaturalSize } from "./linksBlockSizing";
import { computeRequiredCardHeight } from "./cardGeometry";

/** Default icon diameter for a Contact Link inside ProfileCard, used when the
 * card has no `linksIconSize` override. Stage 4.2-C.2.1 made this
 * user-configurable (menu slider, see ProfileContactLinksMenu.tsx) — this
 * constant is now only the fallback/default value, not a hard limit. */
export const CONTACT_LINK_ICON_SIZE = 20;
/** Reasonable resize bounds for `linksIconSize` — small enough to stay
 * legible, large enough to never overwhelm the card. */
export const CONTACT_LINK_ICON_SIZE_MIN = 14;
export const CONTACT_LINK_ICON_SIZE_MAX = 32;
/** Gap between Contact Link icons, and between the Contact Links block and
 * whatever content sits above it. */
export const CONTACT_LINK_GAP = 10;
/** Same ceiling LinksCardWidget already uses for its own link list — reused,
 * not reinvented, for a consistent limit across both link systems. */
export const CONTACT_LINKS_MAX = 12;

/** Natural size (px) of the Contact Links block for `count` links within
 * `availableWidth` — thin wrapper over linksBlockSizing.ts with this
 * feature's gap. `iconSize` defaults to CONTACT_LINK_ICON_SIZE so existing
 * callers (and every card without a `linksIconSize` override) are unaffected. */
export function contactLinksNaturalSize(count: number, availableWidth: number, iconSize: number = CONTACT_LINK_ICON_SIZE) {
  return computeLinksNaturalSize({
    count, iconSize, gap: CONTACT_LINK_GAP, availableWidth,
  });
}

/** Y (px, relative to the card's own box) where the currently-composed
 * content (pfp + identity + location + views) ends — what
 * computeRequiredCardHeight needs to know how much room Contact Links has to
 * grow into. Deliberately ignores `boxes.links` itself: it's the block being
 * sized, not part of "what it needs room below". */
export function composedContentBottom(
  boxes: Partial<Record<ElementRole, ElementBox>>,
  identityRect: ElementBox | undefined,
): number {
  let bottom = 0;
  if (boxes.pfp) bottom = Math.max(bottom, boxes.pfp.y + boxes.pfp.h);
  if (identityRect) bottom = Math.max(bottom, identityRect.y + identityRect.h);
  if (boxes.location) bottom = Math.max(bottom, boxes.location.y + boxes.location.h);
  if (boxes.views) bottom = Math.max(bottom, boxes.views.y + boxes.views.h);
  return bottom;
}

export interface ContactLinksGrowthInput {
  format: CardFormat | undefined;
  currentH: number;
  contentBottom: number;
  padding: number;
  count: number;
  availableWidth: number;
  /** Defaults to CONTACT_LINK_ICON_SIZE — see contactLinksNaturalSize. */
  iconSize?: number;
}

/**
 * Minimum card height so the Contact Links block fits below the
 * already-composed content — see cardGeometry.ts's computeRequiredCardHeight
 * for the growth contract (grows only, clamps to format minH/maxH, never
 * touches y — this function only ever returns a height). count === 0 ->
 * currentH unchanged exactly (no Contact Links -> no growth). Rounded to a
 * whole px so repeated calls with unchanged inputs converge to a stable
 * value instead of drifting on float error.
 *
 * Links-only convenience wrapper (single-element `extraBlocks`) — correct
 * and still used by its own tests, but as of Stage 4.2-C.1, ProfileCard.tsx's
 * actual growth effect composes `extraBlocks` itself (Links entry + Music
 * entry together) and calls computeRequiredCardHeight() directly instead,
 * because two SEPARATE calls (one per block) can't correctly stack more than
 * one block — see computeRequiredCardHeight's doc comment in cardGeometry.ts
 * for why summing must happen in one call.
 */
export function requiredCardHeightForContactLinks(input: ContactLinksGrowthInput): number {
  const { format, currentH, contentBottom, padding, count, availableWidth, iconSize } = input;
  if (count <= 0) return currentH;
  const size = contactLinksNaturalSize(count, availableWidth, iconSize);
  const h = computeRequiredCardHeight({
    format, currentH, contentBottom, padding,
    extraBlocks: [{ naturalHeight: size.height, gap: CONTACT_LINK_GAP }],
  });
  return Math.round(h);
}
