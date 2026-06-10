/**
 * Pure utilities for the MY LAND Desktop/Mobile shared-widget overlay.
 * No React. No Supabase. No side effects. No state mutations.
 *
 * "space" (Desktop) is the source of truth for shared-widget content
 * (profiles, guestbooks, socialCards, musicCards, linksCards, statsCards,
 * galleries). "space_mobile" stores only an overlay on top of that content:
 * `hidden` (per-view visibility) and `placements` (per-view position/size).
 *
 * NOT YET WIRED — these helpers are not imported anywhere. They exist so the
 * editor (CanvasBoard) and the public pages can later share one
 * implementation instead of two.
 */
import type {
  CanvasState,
  SharedWidgetKind,
  Placement,
} from "@/types";
import { PLACEMENT_FIELDS } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Logical width of the Mobile canvas in pixels. Matches CanvasBoard's MOBILE_CANVAS_W. */
export const MOBILE_CANVAS_W = 390;

/** Horizontal padding (both sides combined) reserved around shared widgets on Mobile. */
export const MOBILE_CANVAS_PADDING = 32;

/** Usable width for shared-widget content on the Mobile canvas. */
export const MOBILE_CONTENT_W = MOBILE_CANVAS_W - MOBILE_CANVAS_PADDING;

/** All widget kinds whose content is shared between Desktop and Mobile. */
export const SHARED_WIDGET_KINDS: readonly SharedWidgetKind[] = [
  "profile", "guestbook", "social", "music", "links", "stats", "gallery",
] as const;

/** Maps each shared widget kind to its array key on CanvasState. */
export const SHARED_WIDGET_ARRAY_KEY = {
  profile:   "profiles",
  guestbook: "guestbooks",
  social:    "socialCards",
  music:     "musicCards",
  links:     "linksCards",
  stats:     "statsCards",
  gallery:   "galleries",
} as const satisfies Record<SharedWidgetKind, keyof CanvasState>;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape needed to compute a default Mobile placement for a shared widget. */
type PlacementSource = {
  x:        number;
  y:        number;
  w:        number;
  h:        number;
  zIndex:   number;
  layer:    0 | 1 | 2;
  depth:    number;
  rotation: number;
  locked?:        boolean;
  stackId?:       string;
  isStackAnchor?: boolean;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes a default Mobile placement for a shared widget that has no
 * placement override yet: scales w/h to fit MOBILE_CONTENT_W (never upscales),
 * centers horizontally, scales y proportionally, resets rotation, and carries
 * over zIndex/layer/depth/locked/stackId/isStackAnchor unchanged.
 */
export function defaultMobilePlacement(item: PlacementSource): Placement {
  const scale = item.w > 0 ? Math.min(1, MOBILE_CONTENT_W / item.w) : 1;
  const w = Math.max(1, Math.round(item.w * scale));
  const h = Math.max(1, Math.round(item.h * scale));

  return {
    x: Math.round((MOBILE_CANVAS_W - w) / 2),
    y: Math.round(item.y * scale),
    w,
    h,
    zIndex:        item.zIndex,
    layer:         item.layer,
    depth:         item.depth,
    rotation:      0,
    locked:        item.locked,
    stackId:       item.stackId,
    isStackAnchor: item.isStackAnchor,
  };
}

/**
 * Merges a shared widget array from `space` into the shape Mobile expects:
 * filters out ids hidden on Mobile, and applies each item's placement
 * override (falling back to a computed default placement).
 */
function mergeSharedArray<T extends PlacementSource & { id: string }>(
  sourceItems: readonly T[] | undefined,
  hiddenIds:   readonly string[] | undefined,
  placements:  Record<string, Placement> | undefined,
): T[] {
  const hidden = new Set(hiddenIds ?? []);
  return (sourceItems ?? [])
    .filter(item => !hidden.has(item.id))
    .map(item => ({ ...item, ...(placements?.[item.id] ?? defaultMobilePlacement(item)) }));
}

/**
 * Builds the CanvasState that the Mobile view should render: shared-widget
 * arrays come from `space` (filtered by `mobile.hidden` and repositioned via
 * `mobile.placements`), while everything else (decorative elements, bg,
 * wallpaper, etc.) comes from `mobile` as-is.
 */
export function mergeMobileState(space: CanvasState, mobile: CanvasState): CanvasState {
  return {
    ...mobile,
    profiles:    mergeSharedArray(space.profiles,    mobile.hidden?.profile,   mobile.placements?.profile),
    guestbooks:  mergeSharedArray(space.guestbooks,  mobile.hidden?.guestbook, mobile.placements?.guestbook),
    socialCards: mergeSharedArray(space.socialCards, mobile.hidden?.social,    mobile.placements?.social),
    musicCards:  mergeSharedArray(space.musicCards,  mobile.hidden?.music,     mobile.placements?.music),
    linksCards:  mergeSharedArray(space.linksCards,  mobile.hidden?.links,     mobile.placements?.links),
    statsCards:  mergeSharedArray(space.statsCards,  mobile.hidden?.stats,     mobile.placements?.stats),
    galleries:   mergeSharedArray(space.galleries,   mobile.hidden?.gallery,   mobile.placements?.gallery),
  };
}

/**
 * Filters `space`'s own shared-widget arrays by `space.hidden` (widgets
 * deleted from the Desktop view only).
 */
export function filterHiddenDesktop(space: CanvasState): CanvasState {
  const hidden = space.hidden;
  if (!hidden) return space;

  return {
    ...space,
    profiles:    space.profiles.filter(item    => !hidden.profile?.includes(item.id)),
    guestbooks:  space.guestbooks.filter(item  => !hidden.guestbook?.includes(item.id)),
    socialCards: space.socialCards.filter(item => !hidden.social?.includes(item.id)),
    musicCards:  space.musicCards.filter(item  => !hidden.music?.includes(item.id)),
    linksCards:  space.linksCards.filter(item  => !hidden.links?.includes(item.id)),
    statsCards:  space.statsCards.filter(item  => !hidden.stats?.includes(item.id)),
    galleries:   space.galleries.filter(item   => !hidden.gallery?.includes(item.id)),
  };
}

/**
 * Splits a shared-widget update patch into its placement part (x, y, w, h,
 * zIndex, layer, depth, rotation, locked, stackId, isStackAnchor) and its
 * content part (everything else). Used to route placement changes to the
 * current view's overlay while content changes go to the shared `space` data.
 */
export function splitPlacementPatch<T extends Record<string, unknown>>(
  patch: Partial<T>,
): { placement: Partial<Placement>; content: Partial<T> } {
  const placementKeys: readonly string[] = PLACEMENT_FIELDS;
  const placement: Partial<Placement> = {};
  const content: Partial<T> = {};

  for (const key of Object.keys(patch) as (keyof T & string)[]) {
    if (placementKeys.includes(key)) {
      (placement as Record<string, unknown>)[key] = patch[key];
    } else {
      content[key] = patch[key];
    }
  }

  return { placement, content };
}
