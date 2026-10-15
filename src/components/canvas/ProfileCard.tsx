"use client";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo, type CSSProperties } from "react";
import { trackRender } from "@/lib/perfDebug";
import type { ProfileCardData, TextFont, ProfileCardVariant, CardEffects, ContactLink } from "@/types";
import { getFontStyle as getCanvasFontStyle } from "@/lib/fontList";
import { useProfileViews } from "@/hooks/useProfileViews";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import { isEventFromNode } from "@/lib/editorGuards";
import { resolveOpenerSpot } from "@/lib/openerPlacement";
import { CanvasChromeButton } from "./CanvasChromeButton";
import CardLayers from "./CardLayers";
import { profileEditButtonId, profileInspectorId } from "@/lib/editorSelection";
import type { ProfileEditorFacts } from "./EditorHost";
import type { ElementBox, BlockOverrides } from "@/lib/cardComposition";
import { resolveLinkButtonStyle, linkButtonsPlaced } from "@/lib/linkButtons";
import { profileLayout, profileCardMinSize, formatViewCount, type TextMeasurer } from "@/lib/profileCardLayout";
import { getTextMeasurer, useFontsVersion } from "@/lib/textMeasure";
import { LinkButtonsBlock } from "./LinkButtonsBlock";
import { nextAnchorAxis } from "@/lib/anchorDrag";
import {
  rectToAnchor, anchorToRect, snapAxis, snappedPoint, MAGNETIC_POINTS, centerAlignAnchor,
} from "@/lib/blockConstraints";
import { resolvePfpSize, pfpRadiusToPercent, getCardPadding, PFP_PHOTO_SIZES, centerCardPosition, shouldApplyGrowth } from "@/lib/cardGeometry";
import { isPfpAnchorDraggable } from "@/lib/canvasSelectionGuards";
import { detectPlatform, PlatformIcon, PLATFORM_COLORS, PLATFORM_LABELS } from "./SocialIcons";
import { CONTACT_LINK_ICON_SIZE, CONTACT_LINK_GAP } from "@/lib/contactLinksBlock";
import { resolveClickAfterDrag } from "@/lib/dragClickGuard";
import { withOpacity, resolveCardColors, cardIsLight, cardBaseColor } from "@/lib/cardColors";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveTextEffectStyle, resolveLetterEffectStyle, roleFxOnly, anyTextGlowPulse } from "@/lib/textEffects";
import { useMotionKeyframes, resolveGlowPulseAnimation } from "@/lib/cardMotion";
import { resolveBlockStyle } from "@/lib/blockStyle";
import { PART_ATTR, partFromTarget, movedBeyondSlop, type PartClick, type PartRole } from "@/lib/partNavigation";
import type { ObjectId } from "@/lib/inspectorObjects";
import { T as UIT } from "@/ui/tokens";

// ── Draggable block keys (Stage 3B.3-B) ─────────────────────────────────────
// Identity = name+handle+descriptor+bio, moved as one block — see
// computeBlockLayout()'s identityRect in cardComposition.ts. Location/Views
// are single boxes already. PFP has its own separate, older anchor system
// (pfpAnchorX/Y, startAnchorDrag) and is NOT one of these — see Stage 3B.2-B.
// Stage 4.2-A: "links" added as a 4th block key — infrastructure only, so a
// future Links UI (Stage 4.2-B) can call startBlockDrag(..., "links", ...)
// without touching this type again. "music" was added here in Stage
// 4.2-C.1 and removed in "Product closeout" — Music is now an independent
// canvas element (MusicCardWidget.tsx), no longer part of ProfileCard's
// internal block-drag system. musicAnchorX/Y stay in ProfileCardData for
// backward compat (see that field's own deprecation comment) but nothing
// here references them anymore.
// 2026-10-14: "buttons" (link buttons, Linktree-style) is the 5th key.
type BlockKey = "identity" | "location" | "views" | "links" | "buttons";
const BLOCK_ANCHOR_FIELDS: Record<BlockKey, readonly [
  "identityAnchorX" | "locationAnchorX" | "viewsAnchorX" | "linksAnchorX" | "buttonsAnchorX",
  "identityAnchorY" | "locationAnchorY" | "viewsAnchorY" | "linksAnchorY" | "buttonsAnchorY",
]> = {
  identity: ["identityAnchorX", "identityAnchorY"],
  location: ["locationAnchorX", "locationAnchorY"],
  views:    ["viewsAnchorX", "viewsAnchorY"],
  links:    ["linksAnchorX", "linksAnchorY"],
  buttons:  ["buttonsAnchorX", "buttonsAnchorY"],
};

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";
// Reflow transition for composed-layout content boxes — never applied to the
// pfp box itself (see startAnchorDrag / renderComposed): it must track the
// mouse 1:1 with zero lag, so it never gets a transition, dragging or not.
const REFLOW_TRANSITION = `left 0.2s ${EASE}, top 0.2s ${EASE}, width 0.2s ${EASE}, height 0.2s ${EASE}`;
// The pfp's own center-of-card magnetism (Stage 3B.4-A) — a single point,
// not the {0,0.5,1} grid the composition blocks use (see startBlockDrag) —
// pulling toward dead-center on both axes, continuous everywhere else.
const PFP_CENTER_POINT = [0.5] as const;
// Minimum distance from the top of the canvas — same floor addProfile()
// already uses in CanvasBoard.tsx (kept as a separate local constant there
// rather than shared, see the vertical-recentering effect below for why).
export const CANVAS_TOP_OFFSET = 44;
/** Editor v3 Phase D: the editor topbar is 60px of glass OVER the canvas
 * (CANVAS_TOP_OFFSET stays 44 — R1). Only the "Editar" chrome avoids it;
 * card geometry never reads this. Parity with T.ui.size.editorTopbarH is
 * tested (this render file must not import the editor tokens). */
export const EDITOR_CHROME_TOP = 60;

// ── Positionable fields (Free Mode) ─────────────────────────────────────────────
// Single source of truth for every field that can be dragged/scaled in free layout.
// initFreePos, the free-mode default-seeding effect, and the drag-persist patch in
// startFreeDrag all derive from this table instead of hardcoding each key separately.
type PosFieldKey =
  | "photoX" | "photoY" | "photoScale"
  | "nameX" | "nameY" | "nameScale"
  | "handleX" | "handleY" | "handleScale"
  | "statusX" | "statusY" | "statusScale"
  | "locationX" | "locationY" | "locationScale"
  | "bioX" | "bioY" | "bioScale"
  | "viewsX" | "viewsY" | "viewsScale";

interface PositionableField {
  key:        "photo" | "name" | "handle" | "descriptor" | "location" | "bio" | "views";
  defaultX:   number;
  defaultY:   number;
  xField:     PosFieldKey;
  yField:     PosFieldKey;
  scaleField: PosFieldKey;
}

// Existing defaults (photo/name/handle/bio/views) are unchanged from before this
// refactor — descriptor/location are new entries slotted into the existing gap
// between handle (63) and bio (75) so nothing already saved shifts visually.
const POSITIONABLE_FIELDS: PositionableField[] = [
  { key: "photo",      defaultX: 50, defaultY: 25, xField: "photoX",      yField: "photoY",      scaleField: "photoScale" },
  { key: "name",       defaultX: 50, defaultY: 53, xField: "nameX",       yField: "nameY",       scaleField: "nameScale" },
  { key: "handle",     defaultX: 50, defaultY: 63, xField: "handleX",     yField: "handleY",     scaleField: "handleScale" },
  { key: "descriptor", defaultX: 50, defaultY: 67, xField: "statusX",     yField: "statusY",     scaleField: "statusScale" },
  { key: "location",   defaultX: 50, defaultY: 71, xField: "locationX",   yField: "locationY",   scaleField: "locationScale" },
  { key: "bio",        defaultX: 50, defaultY: 75, xField: "bioX",        yField: "bioY",        scaleField: "bioScale" },
  { key: "views",      defaultX: 50, defaultY: 88, xField: "viewsX",      yField: "viewsY",      scaleField: "viewsScale" },
];

function fontStyle(font: TextFont | undefined, fallback = SANS): string {
  return getCanvasFontStyle(font, fallback);
}
// luminance/withOpacity moved to @/lib/cardColors (Stage FASE 1) — same
// implementation, now shared with CardLayers.tsx/textEffects.ts instead of
// each keeping its own copy.

// Contact Link icon (Stage 4.2-B §5) — a real <a>, target="_blank" +
// rel="noopener noreferrer" (see the LinksCardWidget/SocialIconBtn precedent
// this mirrors). Module-level, not nested inside ProfileCard: it owns hover
// state (useState), and a component redefined every parent render would
// remount (and lose that state) on every ProfileCard re-render — same reason
// SocialIconBtn in SocialIcons.tsx is module-level too. Always renders as a
// genuine link, so it's clickable regardless of canInteract — the public
// profile page IS a ProfileCard render with canInteract=false, and this must
// still open the URL there (§5: Contact Links must not inherit decorative
// pointer-events:none — it never gets that style in the first place, see
// CardLayers.tsx's content layer). mousedown deliberately does NOT stop
// propagation, so grabbing an icon still starts the block-level drag
// (startLinksDrag) via the wrapper, same as identity/location/views.
//
// `didDragRef` (Stage 4.2-C.2.1) is only ever non-null in the editor — see
// ProfileCard's wrapper below, which only wires startLinksDrag when
// isAnchorDraggable. It's undefined in public view, where the wrapper never
// starts a drag at all and this <a> behaves like a normal link. When present,
// onClick consumes it via resolveClickAfterDrag: a click that ends a real
// drag never navigates, but a plain click (no drag) still does, mirroring
// LinkItemFrame in LinksCardWidget.tsx and only opening the URL when neither
// the config menu nor a just-finished drag is what's actually being clicked.
function ContactLinkIcon({
  link, color, size, menuOpen, didDragRef,
}: {
  link: ContactLink; color: string; size: number; menuOpen: boolean;
  didDragRef?: React.RefObject<boolean>;
}) {
  const [hov, setHov] = useState(false);
  const platform = detectPlatform(link.url);
  const safeUrl = link.url.startsWith("http") ? link.url : `https://${link.url}`;
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={PLATFORM_LABELS[platform]}
      // Stage 4.2-C.2.1 (round 2): links are natively draggable in every
      // browser by default. Without this, mousedown+move on the icon starts
      // BOTH our own JS drag (startLinksDrag, via the wrapper's onMouseDown)
      // AND the browser's native HTML5 drag-and-drop on this <a> — the
      // latter hijacks the gesture (native drag events replace regular
      // mousemove/mouseup mid-gesture), which is what was bubbling up as a
      // dragenter/dragover on CanvasBoard's canvas wrapper and popping the
      // "DROP IMAGES" overlay, and left our own drag state never reaching a
      // clean mouseup. Same fix already applied to canvas images — see the
      // `draggable={false}` on the image <img> in CanvasBoard.tsx.
      draggable={false}
      onClick={e => {
        e.stopPropagation();
        const { suppress, nextDidDrag } = resolveClickAfterDrag(didDragRef?.current ?? false);
        if (didDragRef) didDragRef.current = nextDidDrag;
        if (menuOpen || suppress) e.preventDefault();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, flexShrink: 0,
        opacity: hov ? 1 : 0.75, transition: "opacity 0.15s ease", textDecoration: "none",
      }}
    >
      <PlatformIcon platform={platform} size={size} color={hov ? PLATFORM_COLORS[platform] : color} />
    </a>
  );
}

interface Props {
  card:              ProfileCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  /** Editor v3 Phase H: the click also reports which PART of the card it
   * hit and whether the card was already selected / the pointer moved
   * (partNavigation.ts) — CanvasBoard decides (click 2 opens that part). */
  onClick:           (e: React.MouseEvent, part?: PartClick) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  updateProfile:     (id: string, patch: Partial<ProfileCardData>) => void;
  canInteract?:      boolean;
  currentUserId?:    string;
  ownerUserId?:      string;
  entryAnimStyle?:   CSSProperties;
  /** Live viewport width/height (Stage 4.2-C.2.2 Part 3, extended to width
   * in 4.2-C.2.4), used only to keep the card centered — see the growth/
   * recentering effect below. Optional so any other caller that doesn't
   * care about centering (e.g. a future isolated render/test) can omit
   * them; recentering simply doesn't run without both. */
  viewportW?:        number;
  viewportH?:        number;
  /** Stage 4.2-C.2.5: true while a manual resize gesture is active on THIS
   * card (derived in CanvasBoard.tsx from useDragDrop's own `resizing`
   * state — not a second resize-state system). Growth stays fully
   * paused while this is true, so the drag has exclusive control of
   * size; the effect re-evaluates once the gesture ends. Defaults to
   * false so any caller that doesn't pass it keeps growth active, same
   * as before this prop existed. */
  isResizing?:       boolean;
  /** The inspector is open for THIS card. Editor v3 Phase B: the open
   * state lives in the editor selection (editorSelection.ts) and the
   * inspector is mounted by EditorHost (CanvasBoard level) — this card
   * never mounts it; it only adapts its own render (links don't navigate,
   * no grab cursor) and its "Editar" button. */
  inspectorOpen?:    boolean;
  /** "Editar" activated: CanvasBoard opens the inspector, or focuses /
   * expands the open one (it never closes it). */
  onEditActivate?:   (cardId: string) => void;
  /** Render-time facts the inspector needs (Links fit verdict, views),
   * reported while the inspector is open — the host never recomputes the
   * composition. */
  onEditorFacts?:    (cardId: string, facts: ProfileEditorFacts) => void;
  /** Editor v3 Phase H (D5): the inspector's object while it is open — its
   * part gets the editor-only dashed outline. Never set in the public view. */
  activePart?:       ObjectId;
}

// ── Free-mode position state ──────────────────────────────────────────────────

type FreeKey = PositionableField["key"];
type FreePos = Record<FreeKey, { x: number; y: number; s: number }>;

function initFreePos(card: ProfileCardData): FreePos {
  const pos = {} as FreePos;
  for (const f of POSITIONABLE_FIELDS) {
    pos[f.key] = {
      x: (card[f.xField] as number | undefined) ?? f.defaultX,
      y: (card[f.yField] as number | undefined) ?? f.defaultY,
      s: (card[f.scaleField] as number | undefined) ?? 1,
    };
  }
  return pos;
}

// ── Main component ────────────────────────────────────────────────────────────

function ProfileCard({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, updateProfile, canInteract,
  currentUserId, ownerUserId, entryAnimStyle = {}, viewportW, viewportH, isResizing = false,
  inspectorOpen = false, onEditActivate, onEditorFacts, activePart,
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("ProfileCard");

  // Menu redesign Phase 2: "menu open" = this card's inspector is open.
  const menuOpen = inspectorOpen && !!canInteract;
  // Editor v3 Phase H: where the press started and whether the card was
  // selected then (click 2) — read by the click (partNavigation.ts). Capture
  // phase, so the block drags' own mousedown handlers are not involved.
  const partDownRef = useRef<{ x: number; y: number; wasSelected: boolean } | null>(null);
  // D5: the active part's dashed outline — ONLY while this card's inspector
  // is open in the editor (menuOpen implies canInteract): the public render
  // never gets it. A plain style on the existing wrapper, no layout change.
  // Review H-V M1: a violet dash alone falls under 3:1 on mid-tone / colored
  // cards, so it rides on a dark + light ring (like the canvas chrome's
  // ring): one of the two always contrasts with whatever is behind.
  const partOutline = (role: PartRole): CSSProperties =>
    menuOpen && activePart === role
      ? { outline: `1.5px dashed ${UIT.ui.chrome.partMark}`, outlineOffset: 4, boxShadow: UIT.ui.chrome.partRing }
      : {};
  const partProps = (role: PartRole) => ({ [PART_ATTR]: role });
  const cardRef = useRef<HTMLDivElement>(null);
  const panelId = profileInspectorId(card.id);
  // Review r2: same resolver as every canvas chrome control (on-canvas, not
  // under the topbar, clear of the resize handles; below-left before inside).
  const openerPos = resolveOpenerSpot(card, { w: viewportW ?? Number.POSITIVE_INFINITY, h: viewportH ?? Number.POSITIVE_INFINITY, topOffset: EDITOR_CHROME_TOP });

  // Layout mode
  const layout = (card.layout ?? "vertical") as "vertical" | "horizontal" | "free";
  // Decides whether the PFP div even gets a mousedown handler at all — see
  // startAnchorDrag's onMouseDown wiring below. Requires the card to be
  // individually selected first (Stage 3B.2-B) — see isPfpAnchorDraggable's
  // own doc comment for why.
  const isAnchorDraggable = isPfpAnchorDraggable(canInteract, layout, isSel);

  // Views counter — fetched once per mount, same hook used by StatsCardWidget
  const { total: viewCount } = useProfileViews(ownerUserId);

  // ── Real text measurement + the content floor (engine rewrite 2026-10-15)
  // The measurer exists only after mount (the server render and the first
  // client render must agree); useFontsVersion re-renders once fonts load.
  useFontsVersion();
  const [measure, setMeasure] = useState<TextMeasurer | undefined>(undefined);
  useEffect(() => { setMeasure(getTextMeasurer()); }, []);
  // The smallest height where everything fits at this width. A card saved
  // smaller than that (before this engine) renders at the minimum right away
  // — nothing is dropped, also on the public page — and the growth effect
  // below persists it in the editor. space_mobile keeps its stored size.
  const minSize = layout === "free" ? undefined : profileCardMinSize(card, card.w, { measure, viewCount });
  const cardH = minSize && viewportW != null ? Math.max(card.h, minSize.h) : card.h;

  // Free-layout local position state (smooth drag without DB writes per frame)
  const [freePos, setFreePos] = useState<FreePos>(() => initFreePos(card));
  const isDraggingFree = useRef(false);

  // Sync freePos from card when not dragging (e.g. undo, external update)
  useEffect(() => {
    if (isDraggingFree.current) return;
    setFreePos(initFreePos(card));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, POSITIONABLE_FIELDS.flatMap(f => [card[f.xField], card[f.yField], card[f.scaleField]]));

  // When switching to free, seed defaults if positions not yet set (existing cards
  // that never had descriptor/location keep those two unset until the user drags them).
  useEffect(() => {
    if (layout !== "free") return;
    const patch: Partial<ProfileCardData> = {};
    for (const f of POSITIONABLE_FIELDS) {
      if (card[f.xField] == null) (patch as Record<PosFieldKey, number>)[f.xField] = f.defaultX;
      if (card[f.yField] == null) (patch as Record<PosFieldKey, number>)[f.yField] = f.defaultY;
    }
    if (Object.keys(patch).length > 0) updateProfile(card.id, patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // ── Composition-engine PFP anchor (Stage 3B) ──────────────────────────────
  // Local state drives the drag in real time; pfpAnchorX/Y are only written
  // to the card on mouseup (see startAnchorDrag) — no per-frame persistence.
  const [anchor, setAnchor] = useState(() => ({ x: card.pfpAnchorX ?? 0.5, y: card.pfpAnchorY ?? 0.5 }));
  const isDraggingAnchor = useRef(false);
  // px the composed group can travel on each axis (computeBlockLayout's
  // `travel`) — the photo drag's denominator; written after each layout.
  const pfpTravelRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isDraggingAnchor.current) return;
    setAnchor({ x: card.pfpAnchorX ?? 0.5, y: card.pfpAnchorY ?? 0.5 });
  }, [card.pfpAnchorX, card.pfpAnchorY]);

  // ── Constrained-freeform block anchors (Stage 3B.3-B) ─────────────────────
  // Same pattern as the PFP anchor above: local state drives the drag in real
  // time (no per-frame persistence), undefined means "no override, let
  // computeBlockLayout fall back to the automatic base composition for this
  // block" — see BlockOverrides in cardComposition.ts.
  type Anchor2D = { x: number; y: number };
  const [blockAnchors, setBlockAnchors] = useState<Record<BlockKey, Anchor2D | undefined>>(() => ({
    identity: card.identityAnchorX != null && card.identityAnchorY != null ? { x: card.identityAnchorX, y: card.identityAnchorY } : undefined,
    location: card.locationAnchorX != null && card.locationAnchorY != null ? { x: card.locationAnchorX, y: card.locationAnchorY } : undefined,
    views:    card.viewsAnchorX    != null && card.viewsAnchorY    != null ? { x: card.viewsAnchorX,    y: card.viewsAnchorY    } : undefined,
    links:    card.linksAnchorX    != null && card.linksAnchorY    != null ? { x: card.linksAnchorX,    y: card.linksAnchorY    } : undefined,
    buttons:  card.buttonsAnchorX  != null && card.buttonsAnchorY  != null ? { x: card.buttonsAnchorX,  y: card.buttonsAnchorY  } : undefined,
  }));
  // Which block (if any) is actively being dragged right now — a ref (not
  // state) because its only two jobs are (a) guarding the sync-from-props
  // effect below against clobbering an in-progress drag, exactly like
  // isDraggingAnchor does for the PFP, and (b) a read inside render for the
  // subtle "grabbing" cursor/outline, which the mousemove-driven re-renders
  // below already keep fresh from the very first drag tick — no separate
  // state needed just for that.
  const draggingBlockRef = useRef<BlockKey | null>(null);
  // Whether the current/last "links" block drag actually moved (Stage
  // 4.2-C.2.1). Separate from draggingBlockRef above, which is cleared
  // synchronously on mouseup inside startBlockDrag's onUp — by the time the
  // browser's trailing `click` fires on a Contact Link's <a>, that ref is
  // already null and can't tell ContactLinkIcon a drag just happened. This
  // ref is deliberately left set after mouseup so the click handler can
  // consume it (see resolveClickAfterDrag) and only THEN clear it. Only
  // "links" sets it true (in startBlockDrag's onMove) — identity/location/
  // views blocks contain no real <a> that navigation could leak into.
  const linksDidDragRef = useRef(false);
  /** Same as linksDidDragRef, for the link buttons' <a>s. */
  const buttonsDidDragRef = useRef(false);

  useEffect(() => {
    setBlockAnchors(prev => ({
      identity: draggingBlockRef.current === "identity" ? prev.identity
        : (card.identityAnchorX != null && card.identityAnchorY != null ? { x: card.identityAnchorX, y: card.identityAnchorY } : undefined),
      location: draggingBlockRef.current === "location" ? prev.location
        : (card.locationAnchorX != null && card.locationAnchorY != null ? { x: card.locationAnchorX, y: card.locationAnchorY } : undefined),
      views: draggingBlockRef.current === "views" ? prev.views
        : (card.viewsAnchorX != null && card.viewsAnchorY != null ? { x: card.viewsAnchorX, y: card.viewsAnchorY } : undefined),
      links: draggingBlockRef.current === "links" ? prev.links
        : (card.linksAnchorX != null && card.linksAnchorY != null ? { x: card.linksAnchorX, y: card.linksAnchorY } : undefined),
      buttons: draggingBlockRef.current === "buttons" ? prev.buttons
        : (card.buttonsAnchorX != null && card.buttonsAnchorY != null ? { x: card.buttonsAnchorX, y: card.buttonsAnchorY } : undefined),
    }));
  }, [card.identityAnchorX, card.identityAnchorY, card.locationAnchorX, card.locationAnchorY, card.viewsAnchorX, card.viewsAnchorY, card.linksAnchorX, card.linksAnchorY, card.buttonsAnchorX, card.buttonsAnchorY]);

  // ── Variant / effects ──
  const variant: ProfileCardVariant = (card.variant as ProfileCardVariant) ?? "classic";
  const effectiveEffects: CardEffects = getProfileCardEffects(card);

  const { onMouseMove: onInteractMove, onMouseEnter: onInteractEnter, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>, true);
  // Block 1 (panel <-> card pointer isolation): the config menu is portaled
  // to document.body from INSIDE this card's JSX, so React bubbles the
  // panel's mousemove/mouseover up to the handlers below (fiber tree, not
  // DOM tree) — tilt/spotlight used to follow the cursor across the panel
  // with out-of-range positions, and since React computes enter/leave on the
  // fiber tree too, moving card -> panel never fired onMouseLeave (hover
  // glow/scale stuck on). Every handler now only reacts to events whose
  // target is really inside the card's DOM, and enter/leave are derived
  // from mouseover containment: pointer reaching the panel = leave.
  const pointerInsideRef = useRef(false);
  const handleInteractMove = (e: React.MouseEvent) => {
    if (isEventFromNode(cardRef.current, e.target)) onInteractMove(e);
  };
  const handleInteractOver = (e: React.MouseEvent) => {
    const inside = isEventFromNode(cardRef.current, e.target);
    if (inside === pointerInsideRef.current) return;
    pointerInsideRef.current = inside;
    if (inside) onInteractEnter(); else onInteractLeave();
  };
  const handleInteractLeave = () => {
    pointerInsideRef.current = false;
    onInteractLeave();
  };

  // Menu redesign Phase 2: no floating-panel anchoring formula here any
  // more (it was duplicated in this effect and in "Editar") — the inspector
  // is docked (InspectorShell) and CanvasBoard closes it on deselection.


  // ── Visual values ──
  const gap = variant === "minimal" ? 5 : 7;
  const pad = getCardPadding(variant);

  // ── Logo (Product closeout) ───────────────────────────────────────────────
  // A free visual element inside ProfileCard's own bounds — NOT a
  // computeBlockLayout participant (no anti-overlap, no growth impact, never
  // measured). Position is a normalized anchor, same drag mechanics as the
  // PFP anchor above (nextAnchorAxis/snapAxis/snappedPoint, MAGNETIC_POINTS)
  // — deliberately the PFP's simpler pattern, not startBlockDrag's, since
  // Logo never needs to resolve against other blocks' obstacles the way
  // Identity/Location/Views/Links do. Size/opacity/rotation/zIndex are
  // menu-slider-driven (see ProfileLogoMenu.tsx), not drag-resize — same
  // "position via drag, size via menu" contract already established by PFP.
  const [logoAnchor, setLogoAnchor] = useState(() => ({ x: card.logo?.anchorX ?? 0.5, y: card.logo?.anchorY ?? 0.5 }));
  const isDraggingLogo = useRef(false);

  useEffect(() => {
    if (isDraggingLogo.current) return;
    setLogoAnchor({ x: card.logo?.anchorX ?? 0.5, y: card.logo?.anchorY ?? 0.5 });
  }, [card.logo?.anchorX, card.logo?.anchorY]);

  const startLogoDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPfpAnchorDraggable(canInteract, layout, isSel) || !card.logo) return;

    isDraggingLogo.current = true;
    const startMX = e.clientX, startMY = e.clientY;
    const startAnchor = { ...logoAnchor };
    const logoW = card.logo.w, logoH = card.logo.h;
    const rawAvailW = card.w - 2 * pad - logoW;
    const rawAvailH = cardH - 2 * pad - logoH;
    let snappedX = snappedPoint(startAnchor.x, MAGNETIC_POINTS);
    let snappedY = snappedPoint(startAnchor.y, MAGNETIC_POINTS);

    const onMove = (ev: MouseEvent) => {
      const rawX = nextAnchorAxis(startAnchor.x, ev.clientX - startMX, rawAvailW);
      const rawY = nextAnchorAxis(startAnchor.y, ev.clientY - startMY, rawAvailH);
      const nextX = snapAxis(rawX, snappedX, MAGNETIC_POINTS); snappedX = snappedPoint(nextX, MAGNETIC_POINTS);
      const nextY = snapAxis(rawY, snappedY, MAGNETIC_POINTS); snappedY = snappedPoint(nextY, MAGNETIC_POINTS);
      setLogoAnchor({ x: nextX, y: nextY });
    };
    const onUp = () => {
      isDraggingLogo.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setLogoAnchor(latest => {
        updateProfile(card.id, { logo: { ...card.logo!, anchorX: latest.x, anchorY: latest.y } });
        return latest;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [canInteract, layout, isSel, logoAnchor, card.id, card.w, cardH, pad, card.logo, updateProfile]);

  const photoSizeKey   = card.photoSize ?? "md";
  // Variant nudge applies to the BASE (pre-clamp) diameter — whether that
  // base came from the legacy sm/md/lg preset or the new continuous
  // override — so the card-bound clamp (resolvePfpSize) always has the final
  // word and a small/awkward card can never be forced past its own bounds by
  // a variant's min/max nudge (see cardGeometry.ts's resolvePfpSize).
  const pfpBaseNudged =
    variant === "guns" || variant === "poster" ? Math.max(card.pfpSizePx ?? PFP_PHOTO_SIZES[photoSizeKey], 88) :
    variant === "minimal" ? Math.min(card.pfpSizePx ?? PFP_PHOTO_SIZES[photoSizeKey], 56) :
    card.pfpSizePx ?? PFP_PHOTO_SIZES[photoSizeKey];
  const avatarSize     = resolvePfpSize(photoSizeKey, pfpBaseNudged, card.w, cardH, pad);
  const avatarRadiusPct = pfpRadiusToPercent(card.pfpRadius);
  const textAlign      = card.textAlign ?? "left";
  const nameFontSize   = card.nameFontSize ?? (variant === "guns" || variant === "poster" ? 17 : 15);
  // Stage FASE 1: name may override the shared card font via the existing
  // (previously dead) `nameFont` field — absent falls back to `card.font`
  // exactly as before this field was wired up. Every other role still uses
  // MONO regardless of `card.font`, unchanged (see cardTypography.ts's file
  // header — font family per mono role was never part of this stage's ask).
  const font           = card.nameFont ?? card.font ?? "DM Sans";
  // Menu redesign Phase 2: one formula for render AND the editor's "Color de
  // todos los textos" row (cardColors.ts — moved verbatim from here).
  const isLight        = cardIsLight(card, effectiveEffects);
  const baseColor      = cardBaseColor(card, effectiveEffects);
  const primaryColor   = withOpacity(baseColor, 0.95);
  const secondaryColor = withOpacity(baseColor, 0.72);
  const faintColor     = withOpacity(baseColor, 0.45);
  const globalFont     = fontStyle(font);
  const rad            = effectiveEffects.border?.radius ?? card.borderRadius;
  // Stage FASE 1 (Personalization Core): per-role text color/typography,
  // resolved once and consumed by the 6 Line renderers below. Absent
  // overrides reproduce primaryColor/secondaryColor/faintColor's existing
  // formulas exactly — see cardColors.ts/cardTypography.ts's own
  // byte-identical-by-default tests. `primaryColor`/`secondaryColor`/
  // `faintColor` above are UNCHANGED and keep governing everything that
  // isn't a per-role text color (avatar border/shadow, drag outlines,
  // ProfileMusicPlayer's default colors) — `resolvedColors` below is
  // strictly additive, only consumed by the Line renderers and
  // ContactLinkIcon's icon color.
  const resolvedColors = resolveCardColors(baseColor, {
    name: card.nameColor, handle: card.handleColor, descriptor: card.descriptorColor,
    location: card.locationColor, bio: card.bioColor, views: card.viewsColor,
    linksIcon: card.linksIconColor,
  });
  const typography = resolveCardTypography(card, nameFontSize);
  // Stage FASE 1: card-wide shadow/glow/stroke/blur (effectiveEffects.text).
  // Stage FASE 3: gradient/shimmer are per-role (card.effects.textRoles) —
  // see RoleTextEffect's header in types/index.ts for why these two are
  // split. One resolveTextEffectStyle call per role, not one shared style
  // object, since each role's gradient/shimmer is independent.
  const textRoles = card.effects?.textRoles;
  const nameEffectStyle       = resolveTextEffectStyle(effectiveEffects.text, textRoles?.name, resolvedColors.name);
  const handleEffectStyle     = resolveTextEffectStyle(effectiveEffects.text, textRoles?.handle, resolvedColors.handle);
  const descriptorEffectStyle = resolveTextEffectStyle(effectiveEffects.text, textRoles?.descriptor, resolvedColors.descriptor);
  // Block 1: the flat-shimmer surface uses the color Location/Views really
  // render with (block textColor override included, same expression as
  // LocationLine/ViewsLine below), not the bare role color.
  const locationEffectStyle   = resolveTextEffectStyle(effectiveEffects.text, textRoles?.location, resolveBlockStyle(card, "location").textColor ?? resolvedColors.location);
  const bioEffectStyle        = resolveTextEffectStyle(effectiveEffects.text, textRoles?.bio, resolvedColors.bio);
  const viewsEffectStyle      = resolveTextEffectStyle(effectiveEffects.text, textRoles?.views, resolveBlockStyle(card, "views").textColor ?? resolvedColors.views);
  // Product closeout — shimmer fix: shimmer no longer requires gradient to
  // be set (see textEffects.ts's header), so "is shimmer active anywhere"
  // is now just "is `shimmer` present", not "gradient AND shimmer".
  const anyShimmerActive = !!(
    textRoles?.name?.shimmer || textRoles?.handle?.shimmer || textRoles?.descriptor?.shimmer ||
    textRoles?.location?.shimmer || textRoles?.bio?.shimmer || textRoles?.views?.shimmer
  );
  // Product closeout: Name's per-letter bounce animation. The parent gets
  // shadow/glow/stroke/blur only; gradient/shimmer go on each letter span
  // (see NameLine's per-letter branch / resolveLetterEffectStyle).
  const nameLetterAnim = textRoles?.name?.letterAnimation;
  // The line around Name's letters: its own shadow / glow / stroke / blur
  // (else the legacy card-wide ones), never the per-letter fill.
  const nameShadowStyle = resolveTextEffectStyle(effectiveEffects.text, roleFxOnly(textRoles?.name));
  // Stage FASE 1: per-block visual overrides (background/radius always;
  // textColor/iconColor only for the 3 blocks without their own finer-grained
  // color system — see blockStyle.ts's header for why Identity/Links don't
  // get textColor/iconColor wired here). Cheap pure reads, computed once.
  const identityBlockStyle = resolveBlockStyle(card, "identity");
  const locationBlockStyle = resolveBlockStyle(card, "location");
  const viewsBlockStyle    = resolveBlockStyle(card, "views");
  const linksBlockStyle    = resolveBlockStyle(card, "links");

  // Stage FASE 2: PFP border/shadow/glow, resolved from effectiveEffects.pfp
  // (card.effects.pfp — flows through getProfileCardEffects()'s `...card.effects`
  // spread untouched, zero changes needed there, same as text effects in FASE 1).
  // Each sub-object absent falls back to the exact variant-derived formula
  // this file always used — see ProfileIdentityMenu.tsx for the controls.
  const pfpFx = effectiveEffects.pfp;
  const pfpBorderWidth = pfpFx?.border ? (pfpFx.border.width ?? 2) : (variant === "minimal" ? 0 : 2);
  const pfpBorderColorBase = pfpFx?.border?.color
    ?? (variant === "guns" || variant === "poster" ? withOpacity(baseColor, 0.22) : withOpacity(baseColor, 0.14));
  const pfpBorderColor = pfpFx?.border?.opacity != null && pfpBorderColorBase.startsWith("#")
    ? withOpacity(pfpBorderColorBase, pfpFx.border.opacity)
    : pfpBorderColorBase;
  const avatarBorder = pfpBorderWidth > 0 ? `${pfpBorderWidth}px solid ${pfpBorderColor}` : "none";

  const pfpShadowIntensity = pfpFx?.shadow?.intensity ?? 0;
  const pfpGlowIntensity   = pfpFx?.glow?.intensity ?? 0;
  // Stage FASE 3: plain shadow and glow, split into two separate strings —
  // "PFP animation" (glow pulse) must only animate the glow layer's
  // opacity, never the plain shadow, so they can no longer share one
  // combined boxShadow the way they did before this stage (same reasoning
  // as CardLayers.tsx's plainShadowLayers/glowLayers split).
  const avatarPlainShadowLayers: string[] = [];
  if (pfpFx?.shadow ? pfpShadowIntensity > 0 : (variant === "guns" || variant === "poster")) {
    avatarPlainShadowLayers.push(pfpFx?.shadow
      ? `0 ${Math.round(pfpShadowIntensity * 12)}px ${Math.round(pfpShadowIntensity * 28)}px ${pfpFx.shadow.color ?? withOpacity(baseColor, 0.14)}`
      : `0 6px 28px ${withOpacity(baseColor, 0.14)}`);
  }
  const avatarPlainShadow = avatarPlainShadowLayers.length > 0 ? avatarPlainShadowLayers.join(", ") : "none";

  const avatarGlowLayers: string[] = [];
  if (pfpGlowIntensity > 0) {
    avatarGlowLayers.push(`0 0 ${pfpFx?.glow?.radius ?? Math.round(pfpGlowIntensity * 24)}px ${pfpFx?.glow?.color ?? "#ffffff"}`);
  }
  const avatarGlowShadow = avatarGlowLayers.length > 0 ? avatarGlowLayers.join(", ") : undefined;
  const pfpGlowPulseOn = pfpFx?.glow?.animation?.enabled ?? false;
  // Stage FASE 3 (extended in "Product closeout" with letter-bounce):
  // ensures the shared shimmer/glow-pulse/letter-bounce @keyframes exist
  // before anything on this card tries to use them — safe to call
  // alongside CardLayers.tsx's own useMotionKeyframes call for the card's
  // border animation (idempotent injection, see cardMotion.ts).
  useMotionKeyframes(anyShimmerActive || pfpGlowPulseOn || !!nameLetterAnim || anyTextGlowPulse(effectiveEffects));

  // ── Free-mode drag ────────────────────────────────────────────────────────

  const startFreeDrag = useCallback((
    e: React.MouseEvent,
    key: FreeKey,
    isScale = false,
  ) => {
    e.stopPropagation();
    if (!canInteract || layout !== "free") return;

    isDraggingFree.current = true;
    const startMX = e.clientX, startMY = e.clientY;
    const startPos = { ...freePos[key] };

    const onMove = (ev: MouseEvent) => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      if (isScale) {
        const dy = startMY - ev.clientY;
        const newS = Math.max(0.3, Math.min(3, startPos.s + dy / 80));
        setFreePos(p => ({ ...p, [key]: { ...p[key], s: newS } }));
      } else {
        const dx = (ev.clientX - startMX) / r.width  * 100;
        const dy = (ev.clientY - startMY) / r.height * 100;
        setFreePos(p => ({
          ...p,
          [key]: {
            ...p[key],
            x: Math.max(0, Math.min(100, startPos.x + dx)),
            y: Math.max(0, Math.min(100, startPos.y + dy)),
          },
        }));
      }
    };

    const onUp = () => {
      isDraggingFree.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Persist final state (single DB write on mouseup)
      setFreePos(latest => {
        const pos = latest[key];
        const field = POSITIONABLE_FIELDS.find(f => f.key === key)!;
        const patch = { [field.xField]: pos.x, [field.yField]: pos.y } as Record<PosFieldKey, number>;
        if (isScale) patch[field.scaleField] = pos.s;
        updateProfile(card.id, patch);
        return latest;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [canInteract, layout, freePos, card.id, updateProfile]);

  // ── Composition-engine PFP drag (Stage 3B) ────────────────────────────────
  // Moves the PFP anchor within the card's padded content area. 1:1 with the
  // mouse, no throttling — anchor state updates every mousemove, but the
  // card is only patched once, on mouseup (see onUp below).
  //
  // Stage 3B.4-A: center magnetism lives HERE, not on the card container
  // (which is fixed-position, see Stage 3B.4-A notes above isPfpAnchorDraggable
  // usage). Reuses the same snapAxis/snappedPoint hysteresis every other
  // anchor drag in this file uses (startBlockDrag), just with a single custom
  // candidate — PFP_CENTER_POINT — instead of the {0,0.5,1} block grid: pure
  // continuous positioning elsewhere, pulled toward dead-center X=0.5/Y=0.5,
  // escapable by continuing to drag past the release radius.
  const startAnchorDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Same guard as the PFP's onMouseDown wiring (isAnchorDraggable above) —
    // duplicated here as a defensive check via the same pure function, so the
    // two can never independently disagree about whether a drag may proceed.
    if (!isPfpAnchorDraggable(canInteract, layout, isSel)) return;

    isDraggingAnchor.current = true;
    const startMX = e.clientX, startMY = e.clientY;
    const startAnchor = { ...anchor };
    // The anchor positions the whole group (photo + texts + icons +
    // buttons): it moves 1:1 with the mouse over the group's own travel.
    // Deliberately NOT floored — see nextAnchorAxis in anchorDrag.ts for why
    // a degenerate axis (<=0) must freeze instead of becoming hypersensitive.
    const rawAvailW = layout === "free" ? card.w - 2 * pad - avatarSize : pfpTravelRef.current.x;
    const rawAvailH = layout === "free" ? cardH - 2 * pad - avatarSize : pfpTravelRef.current.y;
    let snappedX = snappedPoint(startAnchor.x, PFP_CENTER_POINT);
    let snappedY = snappedPoint(startAnchor.y, PFP_CENTER_POINT);

    const onMove = (ev: MouseEvent) => {
      const rawX = nextAnchorAxis(startAnchor.x, ev.clientX - startMX, rawAvailW);
      const rawY = nextAnchorAxis(startAnchor.y, ev.clientY - startMY, rawAvailH);
      const nextX = snapAxis(rawX, snappedX, PFP_CENTER_POINT); snappedX = snappedPoint(nextX, PFP_CENTER_POINT);
      const nextY = snapAxis(rawY, snappedY, PFP_CENTER_POINT); snappedY = snappedPoint(nextY, PFP_CENTER_POINT);
      setAnchor({ x: nextX, y: nextY });
    };
    const onUp = () => {
      isDraggingAnchor.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setAnchor(latest => {
        updateProfile(card.id, { pfpAnchorX: latest.x, pfpAnchorY: latest.y });
        return latest;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [canInteract, layout, isSel, anchor, card.id, card.w, cardH, pad, avatarSize, updateProfile]);

  // ── Constrained-freeform block drag (Stage 3B.3-B) ────────────────────────
  // Same 1:1-with-the-mouse, persist-only-on-mouseup shape as startAnchorDrag
  // above, generalized to whichever block is being dragged. `startAnchor`/
  // `blockW`/`blockH` are passed in from the JSX at mousedown time (not
  // closed over via deps) because they depend on computeBlockLayout's
  // CURRENT result — the block's size/position from THIS render, which the
  // component itself has no other stable reference to.
  //
  // The engine (computeBlockLayout), not this handler, decides where the
  // block actually ends up: every mousemove writes the raw+snapped anchor to
  // React state, which re-renders through the exact same computeBlockLayout
  // call renderComposed() always uses. That call re-resolves bounds/overlap
  // against the other blocks on every tick — this is intentional, not a perf
  // shortcut we're skipping: it's what makes a block visually resist/nudge
  // near an obstacle DURING the drag itself (the "magnetism protecting the
  // composition" feel), rather than only snapping into place after the fact.
  const startBlockDrag = useCallback((
    e: React.MouseEvent,
    key: BlockKey,
    startAnchor: Anchor2D,
    blockW: number,
    blockH: number,
    // Stage 3B.4 item 2: the pfp's CURRENT box (undefined if there is none),
    // used only to derive one extra magnetic candidate per axis — aligning
    // this block's own center with the pfp's center. Computed once here at
    // drag-start, not per-move: the pfp is priority 1 in computeBlockLayout's
    // resolution order, so it never moves while a lower-priority block
    // (identity/location/views) is being dragged — its center is stable for
    // the whole gesture. Block-to-block (non-pfp) alignment was deliberately
    // left out of this pass — "cuando sea razonable" scoped down to the one
    // unambiguous, always-present anchor (the pfp), not open-ended alignment
    // against whichever other blocks happen to be present.
    pfpBox: ElementBox | undefined,
  ) => {
    e.stopPropagation();
    if (!isPfpAnchorDraggable(canInteract, layout, isSel)) return;

    draggingBlockRef.current = key;
    linksDidDragRef.current = false;
    buttonsDidDragRef.current = false;
    const startMX = e.clientX, startMY = e.clientY;
    const rawAvailW = card.w - 2 * pad - blockW;
    const rawAvailH = cardH - 2 * pad - blockH;
    const alignX = pfpBox ? centerAlignAnchor(pfpBox.x + pfpBox.w / 2, blockW, rawAvailW, pad) : undefined;
    const alignY = pfpBox ? centerAlignAnchor(pfpBox.y + pfpBox.h / 2, blockH, rawAvailH, pad) : undefined;
    const pointsX = alignX != null ? [...MAGNETIC_POINTS, alignX] : undefined;
    const pointsY = alignY != null ? [...MAGNETIC_POINTS, alignY] : undefined;
    let snappedX = snappedPoint(startAnchor.x, pointsX);
    let snappedY = snappedPoint(startAnchor.y, pointsY);

    const onMove = (ev: MouseEvent) => {
      if (key === "links") linksDidDragRef.current = true;
      if (key === "buttons") buttonsDidDragRef.current = true;
      const rawX = nextAnchorAxis(startAnchor.x, ev.clientX - startMX, rawAvailW);
      const rawY = nextAnchorAxis(startAnchor.y, ev.clientY - startMY, rawAvailH);
      const nextX = snapAxis(rawX, snappedX, pointsX); snappedX = snappedPoint(nextX, pointsX);
      const nextY = snapAxis(rawY, snappedY, pointsY); snappedY = snappedPoint(nextY, pointsY);
      setBlockAnchors(prev => ({ ...prev, [key]: { x: nextX, y: nextY } }));
    };
    const onUp = () => {
      draggingBlockRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setBlockAnchors(prev => {
        const latest = prev[key];
        if (latest) {
          const [fx, fy] = BLOCK_ANCHOR_FIELDS[key];
          updateProfile(card.id, { [fx]: latest.x, [fy]: latest.y } as Partial<ProfileCardData>);
        }
        return prev;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [canInteract, layout, isSel, card.id, card.w, cardH, pad, updateProfile]);

  // ── Element renderers ─────────────────────────────────────────────────────

  function AvatarEl({ size = avatarSize, style }: { size?: number; style?: CSSProperties }) {
    // Stage FASE 3: outer wrapper owns size/positioning (what `style`
    // overrides, e.g. renderComposed()'s `width/height:100%` for a
    // resolved pfpBox) and hosts the glow layer; inner div keeps the photo
    // clip (overflow:hidden) + border + plain shadow, unaffected by the
    // glow's own opacity/pulse. box-shadow on the inner div still paints
    // outside it same as before — overflow:hidden never clips box-shadow.
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
        {avatarGlowShadow && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: `${avatarRadiusPct}%`,
            boxShadow: avatarGlowShadow, pointerEvents: "none",
            animation: pfpGlowPulseOn ? resolveGlowPulseAnimation(pfpFx?.glow?.animation?.speed ?? 1) : undefined,
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0, borderRadius: `${avatarRadiusPct}%`, overflow: "hidden",
          border: avatarBorder, background: "rgba(255,255,255,0.06)",
          boxShadow: avatarPlainShadow,
        }}>
          {card.photo ? (
            <img src={card.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={size * 0.34} height={size * 0.34} viewBox="0 0 24 24" fill="none" stroke={faintColor} strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Field content renderers ───────────────────────────────────────────────
  // One definition per field, reused by all three layouts. Each layout stays
  // responsible for wrapping/positioning; only the `style` delta between
  // layouts is passed in, so existing output (vertical/horizontal/free) is
  // unchanged — only descriptor/location are genuinely new content.

  function NameLine({ style }: { style?: CSSProperties }) {
    const baseStyle: CSSProperties = {
      fontFamily: globalFont, fontSize: typography.name.fontSize, fontWeight: typography.name.fontWeight,
      lineHeight: typography.name.lineHeight, letterSpacing: typography.name.letterSpacing, textAlign,
    };

    if (!nameLetterAnim) {
      return (
        <div style={{ ...baseStyle, color: resolvedColors.name, ...nameEffectStyle, ...style }}>
          {card.name}
        </div>
      );
    }

    // Per-letter bounce, COMPOSED with gradient/shimmer rather than
    // replacing them: each span gets the role's own gradient/shimmer fill
    // (sliced so the word reads as one gradient) plus its bounce — see
    // textEffects.ts's resolveLetterEffectStyle for why the fill lives on
    // each span and not on this parent. Shadow/glow/stroke are
    // CSS-inherited and `filter` composites the whole subtree, so
    // nameShadowStyle on the parent is still all they need.
    const chars = card.name.split("");

    return (
      <div style={{ ...baseStyle, color: resolvedColors.name, ...nameShadowStyle, ...style }}>
        {chars.map((ch, i) => (
          <span key={i} style={resolveLetterEffectStyle(textRoles?.name, resolvedColors.name, i, chars.length)}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </div>
    );
  }

  function HandleLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: fontStyle(card.handleFont, MONO), fontSize: typography.handle.fontSize, color: resolvedColors.handle,
        letterSpacing: typography.handle.letterSpacing, textAlign,
        ...(typography.handle.lineHeight != null ? { lineHeight: typography.handle.lineHeight } : {}),
        ...(typography.handle.fontWeight != null ? { fontWeight: typography.handle.fontWeight } : {}),
        ...handleEffectStyle, ...style,
      }}>
        @{card.handle}
      </div>
    );
  }

  function DescriptorLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: fontStyle(card.statusFont, MONO), fontSize: typography.descriptor.fontSize, color: resolvedColors.descriptor,
        letterSpacing: typography.descriptor.letterSpacing, textAlign,
        ...(typography.descriptor.lineHeight != null ? { lineHeight: typography.descriptor.lineHeight } : {}),
        ...(typography.descriptor.fontWeight != null ? { fontWeight: typography.descriptor.fontWeight } : {}),
        ...descriptorEffectStyle, ...style,
      }}>
        {card.status}
      </div>
    );
  }

  function LocationLine({ style }: { style?: CSSProperties }) {
    const color = locationBlockStyle.textColor ?? resolvedColors.location;
    return (
      <div style={{
        fontFamily: fontStyle(card.locationFont, MONO), fontSize: typography.location.fontSize, color,
        letterSpacing: typography.location.letterSpacing, textAlign,
        ...(typography.location.lineHeight != null ? { lineHeight: typography.location.lineHeight } : {}),
        ...(typography.location.fontWeight != null ? { fontWeight: typography.location.fontWeight } : {}),
        ...locationEffectStyle, ...style,
      }}>
        ● {card.location}
      </div>
    );
  }

  function BioText({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: fontStyle(card.bioFont, MONO), fontSize: typography.bio.fontSize, color: resolvedColors.bio,
        lineHeight: typography.bio.lineHeight, whiteSpace: "pre-wrap" as CSSProperties["whiteSpace"], textAlign,
        ...(typography.bio.fontWeight != null ? { fontWeight: typography.bio.fontWeight } : {}),
        ...bioEffectStyle, ...style,
      } as CSSProperties}>{card.bio}</div>
    );
  }

  function ViewsLine({ style }: { style?: CSSProperties }) {
    const color = viewsBlockStyle.textColor ?? resolvedColors.views;
    return (
      <div style={{
        fontFamily: fontStyle(card.viewsFont, MONO), fontSize: typography.views.fontSize, color,
        letterSpacing: typography.views.letterSpacing, textTransform: "uppercase" as CSSProperties["textTransform"],
        textAlign,
        ...(typography.views.lineHeight != null ? { lineHeight: typography.views.lineHeight } : {}),
        ...(typography.views.fontWeight != null ? { fontWeight: typography.views.fontWeight } : {}),
        ...viewsEffectStyle, ...style,
      }}>
        {formatViewCount(viewCount)} views
      </div>
    );
  }

  // ── Free-layout wrapper per element ──────────────────────────────────────

  function FreeWrap({ elemKey, children }: { elemKey: FreeKey; children: React.ReactNode }) {
    const pos = freePos[elemKey];
    const isFreeDraggable = layout === "free" && canInteract;
    return (
      <div
        {...partProps(elemKey as PartRole)}
        style={{
          position: "absolute",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: `translate(-50%, -50%) scale(${pos.s})`,
          cursor: isFreeDraggable ? "grab" : "default",
          zIndex: 3,
          userSelect: "none",
          ...partOutline(elemKey as PartRole),
        }}
        onMouseDown={isFreeDraggable ? e => startFreeDrag(e, elemKey) : undefined}
      >
        {children}
        {/* Scale handle */}
        {isFreeDraggable && (
          <div
            title="escalar"
            style={{
              position: "absolute", bottom: -8, right: -8,
              width: 11, height: 11, borderRadius: "50%",
              background: "rgba(212,240,196,0.65)",
              border: "1.5px solid rgba(255,255,255,0.5)",
              cursor: "ns-resize", zIndex: 10,
              transition: "transform 0.1s ease",
            }}
            onMouseDown={e => { e.stopPropagation(); startFreeDrag(e, elemKey, true); }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.3)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          />
        )}
      </div>
    );
  }

  // ── Layout renders ────────────────────────────────────────────────────────

  function renderVertical() {
    return (
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", padding: `${pad}px`, gap, zIndex: 3, overflow: "hidden",
      }}>
        {AvatarEl({})}
        {card.name && NameLine({ style: { textAlign: "center", marginTop: variant === "minimal" ? 2 : 4 } })}
        {card.handle && HandleLine({ style: { marginTop: -2 } })}
        {card.status && DescriptorLine({ style: { textAlign: "center" } })}
        {card.location && LocationLine({ style: { textAlign: "center" } })}
        {card.bio && BioText({ style: { maxWidth: "100%", textAlign: "center", overflow: "hidden", minHeight: 0 } })}
        {card.showViews && ViewsLine({})}
      </div>
    );
  }

  function renderHorizontal() {
    const photoW = avatarSize + 16;
    return (
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "row",
        alignItems: "center", padding: `${pad}px`, gap: pad, zIndex: 3, overflow: "hidden",
      }}>
        {AvatarEl({ style: { flexShrink: 0 } })}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          {card.name && NameLine({})}
          {card.handle && HandleLine({})}
          {card.status && DescriptorLine({})}
          {card.location && LocationLine({})}
          {card.bio && BioText({ style: { overflow: "hidden", minHeight: 0 } })}
          {card.showViews && ViewsLine({})}
        </div>
        {/* suppress unused warning */}
        <span style={{ display: "none" }}>{photoW}</span>
      </div>
    );
  }

  function renderFree() {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
        {FreeWrap({ elemKey: "photo", children: AvatarEl({}) })}
        {card.name && FreeWrap({ elemKey: "name", children: NameLine({ style: { whiteSpace: "nowrap" } }) })}
        {card.handle && FreeWrap({ elemKey: "handle", children: HandleLine({ style: { whiteSpace: "nowrap" } }) })}
        {card.status && FreeWrap({ elemKey: "descriptor", children: DescriptorLine({ style: { whiteSpace: "nowrap" } }) })}
        {card.location && FreeWrap({ elemKey: "location", children: LocationLine({ style: { whiteSpace: "nowrap" } }) })}
        {card.bio && FreeWrap({ elemKey: "bio", children: BioText({ style: { maxWidth: 160, textAlign: "center" } }) })}
        {card.showViews && FreeWrap({ elemKey: "views", children: ViewsLine({ style: { whiteSpace: "nowrap" } }) })}
        {/* Free-mode hint */}
        {canInteract && (
          <div style={{
            position: "absolute", bottom: 6, right: 8, fontFamily: MONO,
            fontSize: 6, letterSpacing: 1.5, color: "rgba(255,255,255,0.18)",
            pointerEvents: "none", userSelect: "none",
          }}>LIBRE</div>
        )}
      </div>
    );
  }

  // ── Composed layout (engine rewrite 2026-10-15) ──────────────────────────
  // profileCardLayout.ts builds the engine input from the card (the same
  // builder the resize floor uses) — here with the LIVE drag state: the
  // photo anchor and the block anchors (blockAnchors is synced from card.*
  // whenever nothing is being dragged), so computeBlockLayout re-resolves on
  // every mousemove. The icons and buttons nobody dragged flow under the
  // texts; the whole group is anchored as one (cardComposition.ts).
  // "free" mode doesn't use this engine at all.
  const contactLinks = card.contactLinks ?? [];
  const linksIconSize = card.linksIconSize ?? CONTACT_LINK_ICON_SIZE;
  const linkButtons = (card.linkButtons ?? []).filter(b => b.url);
  const buttonStyle = resolveLinkButtonStyle(card.linkButtonStyle, baseColor);
  const blockOverrides: BlockOverrides = {
    identity: blockAnchors.identity, location: blockAnchors.location, views: blockAnchors.views,
    links: blockAnchors.links, buttons: blockAnchors.buttons,
  };
  const composedResult = layout === "free" ? undefined
    : profileLayout(card, { w: card.w, h: cardH, pfpAnchor: anchor, overrides: blockOverrides, measure, viewCount });
  if (composedResult) pfpTravelRef.current = composedResult.travel;

  // ── Content floor + centering (engine rewrite 2026-10-15) ─────────────────
  // The card is never shorter than its content (profileCardMinSize — the
  // same floor the resize handles, Ctrl/⌘+arrows and Medidas clamp to), so
  // nothing disappears: adding content grows the card right away, in the
  // same history step when it happens inside a gesture (editorHistory.ts's
  // isSystemLayoutWrite: an h/x/y-only write is the system's, never its own
  // undo step). It only ever grows; removing content never shrinks it.
  //
  // Recentering (Stage 4.2-C.2.4) stays in this one effect: x/y come from
  // centerCardPosition() — the same formula the resize drag uses — so there
  // is never a second writer of the position during a gesture.
  // Stage 4.2-C.2.5: paused while a resize gesture is active (the drag
  // already clamps to the same floor, so it never fights this).
  // space_mobile (no viewport props): never writes (mobile legacy rule).
  useEffect(() => {
    if (layout === "free" || viewportW == null || viewportH == null) return;
    if (!shouldApplyGrowth(isResizing)) return;
    const patch: Partial<ProfileCardData> = {};
    if (cardH !== card.h) patch.h = cardH;
    const { x: cx, y: cy } = centerCardPosition(viewportW, viewportH, card.w, cardH, CANVAS_TOP_OFFSET);
    if (cx !== card.x) patch.x = cx;
    if (cy !== card.y) patch.y = cy;
    if (Object.keys(patch).length > 0) updateProfile(card.id, patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, isResizing, cardH, card.h, card.w, card.x, card.y, card.id, viewportW, viewportH]);

  // A block that does not fit is not drawn (the content layer clips, so it
  // would render cut off). With the content floor above, only a block the
  // user DRAGGED somewhere it cannot sit (overlapping a text) is ever
  // hidden; the inspector says so (Stage 4.2-C.2.7).
  const blockFits = (box: ElementBox | undefined): boolean =>
    !!box && box.y + box.h <= cardH - pad + 0.5;
  const linksFits = composedResult ? blockFits(composedResult.boxes.links) : undefined;
  const buttonsFits = composedResult && linkButtons.length > 0 ? linkButtonsPlaced(composedResult, cardH, pad) : undefined;

  // Editor v3 Phase B: the inspector lives in EditorHost (CanvasBoard
  // level), so the render-time verdicts it shows travel up from here while
  // it is open. Layout effect (review B-R4): reported before paint.
  useLayoutEffect(() => {
    if (menuOpen) onEditorFacts?.(card.id, { linksFits, viewCount, buttonsFits });
  }, [menuOpen, card.id, linksFits, viewCount, buttonsFits, onEditorFacts]);

  // Logo (Product closeout) — layout-independent (renders the same whether
  // the card is composed or "free"), so it's a standalone function called
  // once from the main return below, not inside renderComposed()/renderFree().
  function renderLogo() {
    if (!card.logo) return null;
    const rect = anchorToRect(logoAnchor.x, logoAnchor.y, card.logo.w, card.logo.h, card.w, cardH, pad);
    return (
      <div
        data-canvas-hot=""
        {...partProps("logo")}
        style={{
          position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h,
          transition: REFLOW_TRANSITION,
          cursor: isAnchorDraggable ? "grab" : "default",
          opacity: card.logo.opacity ?? 1,
          transform: card.logo.rotation ? `rotate(${card.logo.rotation}deg)` : undefined,
          // Other blocks stack by plain DOM order (implicitly z-index 0 in
          // this shared stacking context) — Logo is the only one with an
          // explicit z-index, so it alone can sit behind/in front of them.
          zIndex: card.logo.zIndex ?? 0,
          ...partOutline("logo"),
          ...(isDraggingLogo.current ? { outline: `1px dashed ${withOpacity(baseColor, 0.35)}`, outlineOffset: 2 } : {}),
        }}
        onMouseDown={isAnchorDraggable ? startLogoDrag : undefined}
      >
        <img src={card.logo.url} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} draggable={false} />
      </div>
    );
  }

  function renderComposed() {
    if (!composedResult) return null; // only called when layout !== "free"
    const { boxes, identityRect } = composedResult;

    // The pfp is authoritative in the engine itself now (Stage 3B.2-B) —
    // boxes.pfp IS the raw anchor-derived position for every strategy, with
    // no compromise, dragging or not. No separate raw-formula branch is
    // needed here anymore (see cardComposition.ts's resolveAxis/resolveCentered
    // and the 3B.2-A/B PFP-anchor-drag postmortem for why that used to exist
    // and what it caused).
    const pfpBox: ElementBox | undefined = boxes.pfp;

    // Subtle drag affordance (Stage 3B.3-B, §7 — no permanent handles/boxes):
    // a faint dashed outline appears ONLY on the block actively being
    // dragged, and only then. Deliberately not applied on hover — this isn't
    // meant to read as "an editor full of boxes", just a momentary
    // confirmation of which block your drag grabbed.
    const dragOutline = (key: BlockKey): CSSProperties =>
      draggingBlockRef.current === key ? { outline: `1px dashed ${withOpacity(baseColor, 0.35)}`, outlineOffset: 2 } : {};
    // The block being actively dragged must track the mouse with zero lag
    // (§1) — REFLOW_TRANSITION exists for the OPPOSITE case, a block smoothly
    // sliding out of the way because something ELSE moved (e.g. dragging the
    // pfp displacing identity, or dragging identity displacing location).
    // Applying it to the block under the mouse itself would reintroduce
    // exactly the lag §1 rules out.
    const dragTransition = (key: BlockKey): string => draggingBlockRef.current === key ? "none" : REFLOW_TRANSITION;

    const startIdentityDrag = (e: React.MouseEvent) => {
      if (!identityRect) return;
      const start = blockAnchors.identity ?? rectToAnchor(identityRect, identityRect.w, identityRect.h, card.w, cardH, pad);
      startBlockDrag(e, "identity", start, identityRect.w, identityRect.h, pfpBox);
    };
    const startLocationDrag = (e: React.MouseEvent) => {
      if (!boxes.location) return;
      const start = blockAnchors.location ?? rectToAnchor(boxes.location, boxes.location.w, boxes.location.h, card.w, cardH, pad);
      startBlockDrag(e, "location", start, boxes.location.w, boxes.location.h, pfpBox);
    };
    const startViewsDrag = (e: React.MouseEvent) => {
      if (!boxes.views) return;
      const start = blockAnchors.views ?? rectToAnchor(boxes.views, boxes.views.w, boxes.views.h, card.w, cardH, pad);
      startBlockDrag(e, "views", start, boxes.views.w, boxes.views.h, pfpBox);
    };
    const startLinksDrag = (e: React.MouseEvent) => {
      if (!boxes.links) return;
      const start = blockAnchors.links ?? rectToAnchor(boxes.links, boxes.links.w, boxes.links.h, card.w, cardH, pad);
      startBlockDrag(e, "links", start, boxes.links.w, boxes.links.h, pfpBox);
    };
    const startButtonsDrag = (e: React.MouseEvent) => {
      if (!boxes.buttons) return;
      const start = blockAnchors.buttons ?? rectToAnchor(boxes.buttons, boxes.buttons.w, boxes.buttons.h, card.w, cardH, pad);
      startBlockDrag(e, "buttons", start, boxes.buttons.w, boxes.buttons.h, pfpBox);
    };
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3, overflow: "hidden" }}>
        {pfpBox && (
          <div
            data-canvas-hot=""
            {...partProps("photo")}
            style={{
              position: "absolute", left: pfpBox.x, top: pfpBox.y, width: pfpBox.w, height: pfpBox.h,
              cursor: isAnchorDraggable ? "grab" : "default",
              ...partOutline("photo"),
            }}
            onMouseDown={isAnchorDraggable ? startAnchorDrag : undefined}
          >
            {AvatarEl({ size: pfpBox.w, style: { width: "100%", height: "100%" } })}
          </div>
        )}
        {identityRect && (identityRect.w > 0 || identityRect.h > 0) && (
          <div
            style={{
              position: "absolute", left: identityRect.x, top: identityRect.y,
              width: identityRect.w, height: identityRect.h,
              transition: dragTransition("identity"),
              cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: identityBlockStyle.radius, background: identityBlockStyle.bg,
              ...dragOutline("identity"),
            }}
            onMouseDown={isAnchorDraggable ? startIdentityDrag : undefined}
          >
            {boxes.name && card.name && (
              <div {...partProps("name")} style={{ position: "absolute", left: boxes.name.x - identityRect.x, top: boxes.name.y - identityRect.y, width: boxes.name.w, height: boxes.name.h, overflow: "hidden", transition: REFLOW_TRANSITION, ...partOutline("name") }}>
                {NameLine({ style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } })}
              </div>
            )}
            {boxes.handle && card.handle && (
              <div {...partProps("handle")} style={{ position: "absolute", left: boxes.handle.x - identityRect.x, top: boxes.handle.y - identityRect.y, width: boxes.handle.w, height: boxes.handle.h, overflow: "hidden", transition: REFLOW_TRANSITION, ...partOutline("handle") }}>
                {HandleLine({ style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } })}
              </div>
            )}
            {boxes.descriptor && card.status && (
              <div {...partProps("descriptor")} style={{ position: "absolute", left: boxes.descriptor.x - identityRect.x, top: boxes.descriptor.y - identityRect.y, width: boxes.descriptor.w, height: boxes.descriptor.h, overflow: "hidden", transition: REFLOW_TRANSITION, ...partOutline("descriptor") }}>
                {DescriptorLine({ style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } })}
              </div>
            )}
            {boxes.bio && card.bio && (
              <div {...partProps("bio")} style={{ position: "absolute", left: boxes.bio.x - identityRect.x, top: boxes.bio.y - identityRect.y, width: boxes.bio.w, height: boxes.bio.h, overflow: "hidden", transition: REFLOW_TRANSITION, ...partOutline("bio") }}>
                {BioText({ style: {
                  display: "-webkit-box",
                  WebkitLineClamp: boxes.bio.lines ?? 1,
                  WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"],
                  overflow: "hidden",
                } })}
              </div>
            )}
          </div>
        )}
        {boxes.location && card.location && (
          <div
            {...partProps("location")}
            style={{
              position: "absolute", left: boxes.location.x, top: boxes.location.y, width: boxes.location.w, height: boxes.location.h,
              overflow: "hidden", transition: dragTransition("location"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: locationBlockStyle.radius, background: locationBlockStyle.bg,
              ...partOutline("location"),
              ...dragOutline("location"),
            }}
            onMouseDown={isAnchorDraggable ? startLocationDrag : undefined}
          >
            {LocationLine({ style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } })}
          </div>
        )}
        {boxes.views && card.showViews && (
          <div
            {...partProps("views")}
            style={{
              position: "absolute", left: boxes.views.x, top: boxes.views.y, width: boxes.views.w, height: boxes.views.h,
              overflow: "hidden", transition: dragTransition("views"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: viewsBlockStyle.radius, background: viewsBlockStyle.bg,
              ...partOutline("views"),
              ...dragOutline("views"),
            }}
            onMouseDown={isAnchorDraggable ? startViewsDrag : undefined}
          >
            {ViewsLine({ style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } })}
          </div>
        )}
        {boxes.links && contactLinks.length > 0 && blockFits(boxes.links) && (
          <div
            data-canvas-hot=""
            {...partProps("links")}
            style={{
              position: "absolute", left: boxes.links.x, top: boxes.links.y, width: boxes.links.w, height: boxes.links.h,
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
              gap: CONTACT_LINK_GAP,
              transition: dragTransition("links"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: linksBlockStyle.radius, background: linksBlockStyle.bg,
              ...partOutline("links"),
              ...dragOutline("links"),
            }}
            onMouseDown={isAnchorDraggable ? startLinksDrag : undefined}
          >
            {contactLinks.filter(l => l.url).map(link => (
              <ContactLinkIcon
                key={link.id} link={link} color={linksBlockStyle.iconColor ?? resolvedColors.linksIcon} size={linksIconSize} menuOpen={menuOpen}
                didDragRef={isAnchorDraggable ? linksDidDragRef : undefined}
              />
            ))}
          </div>
        )}
        {boxes.buttons && linkButtons.length > 0 && buttonsFits && (
          <div
            data-canvas-hot=""
            {...partProps("buttons")}
            style={{
              position: "absolute", left: boxes.buttons.x, top: boxes.buttons.y, width: boxes.buttons.w, height: boxes.buttons.h,
              transition: dragTransition("buttons"), cursor: isAnchorDraggable ? "grab" : "default",
              ...partOutline("buttons"),
              ...dragOutline("buttons"),
            }}
            onMouseDown={isAnchorDraggable ? startButtonsDrag : undefined}
          >
            <LinkButtonsBlock buttons={linkButtons} style={buttonStyle} inert={menuOpen}
              didDragRef={isAnchorDraggable ? buttonsDidDragRef : undefined} />
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={menuOpen ? e => e.stopPropagation() : onMouseDown}
        onMouseDownCapture={e => { partDownRef.current = { x: e.clientX, y: e.clientY, wasSelected: isSel }; }}
        onClick={e => {
          // Phase H: report the part (closest [data-role]) — CanvasBoard decides.
          const down = partDownRef.current;
          partDownRef.current = null;
          onClick(e, {
            role: partFromTarget(e.target, cardRef.current),
            wasSelected: !!down?.wasSelected,
            moved: movedBeyondSlop(down, { x: e.clientX, y: e.clientY }),
          });
        }}
        onMouseMove={handleInteractMove}
        onMouseOver={handleInteractOver}
        onMouseLeave={handleInteractLeave}
        style={{
          position: "absolute", left: card.x, top: card.y, width: card.w, height: cardH,
          zIndex: card.zIndex + card.layer * 100 + (isSel ? SELECTION_Z_BOOST : 0),
          transform: `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform", userSelect: "none",
          cursor: draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
          ...entryAnimStyle,
        }}
      >
        <CardLayers
          cardId={card.id} effects={effectiveEffects} isSel={isSel}
          borderRadius={rad}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: rad, overflow: "hidden" }}>
            {/* bg overlay tint for image cards */}
            {effectiveEffects.bg?.image && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
                background: isLight
                  ? "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.44))"
                  : "linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.52))",
              }} />
            )}
            {/* Stage 3B/3B.3: composed layout (computeBlockLayout, built on
                computeComposition) is now the live path for every reachable
                state (default/"vertical"/"horizontal" — there is no UI to
                pick between those two anymore). "free" is the only legacy
                path still actually rendered; renderVertical/
                renderHorizontal stay defined above, unused, for a later
                cleanup stage — see Stage 3B plan. */}
            {layout === "free" && renderFree()}
            {layout !== "free" && renderComposed()}
            {renderLogo()}
          </div>
        </CardLayers>

        {/* ── "Editar" opener (Iteration 0) ── A real <button> (was a 20px
            div at the nw corner that covered the nw resize handle and left
            focus on <body>, so Esc + Backspace deleted the card). Placed by
            resolveOpenerSpot: clear of the nw handle's 24px target and
            of the fixed topbar. Focus returns here when the panel closes. */}
        {isSel && canInteract && (
          <CanvasChromeButton
            id={profileEditButtonId(card.id)}
            icon="pencil"
            label="Editar card de presentación"
            expanded={menuOpen}
            controls={panelId}
            style={{ top: openerPos.top, left: openerPos.left }}
            // Esc on "Editar" only hands focus to the canvas (CanvasChromeButton);
            // the inspector closes from inside (Esc / Cerrar) or from the canvas.
            // Activation opens it, or moves focus to / expands the open one —
            // never closes it (CanvasBoard, editor selection).
            onActivate={() => onEditActivate?.(card.id)}
          />
        )}

        {/* ── Resize handles ── */}
        {/* Position and rotation are fixed by design (singleton presentation card) —
            no lock/rotate affordances. Resize stays until Forma/proporciones is designed. */}
        {isSel && canInteract && <ResizeHandles onResizeMD={onResizeMD} light={isLight} />}

        {/* Editor v3 Phase B: the inspector is NOT mounted here any more —
            EditorHost (CanvasBoard level) mounts it from the editor
            selection; this card only reports its render-time facts (effect
            above, onEditorFacts). */}
      </div>
    </>
  );
}

function areProfilePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.card              === next.card &&
    prev.isSel             === next.isSel &&
    prev.draggingId        === next.draggingId &&
    prev.canInteract       === next.canInteract &&
    prev.parallaxTransform === next.parallaxTransform &&
    prev.currentUserId     === next.currentUserId &&
    prev.ownerUserId       === next.ownerUserId &&
    // Phase B: the inspector's geometry (width / sheet / collapsed) no
    // longer reaches the card — only whether it is open, which changes the
    // card's own render. onEditActivate / onEditorFacts are stable.
    prev.inspectorOpen     === next.inspectorOpen &&
    // Phase H: the active part's editor outline.
    prev.activePart        === next.activePart
  );
}
export default memo(ProfileCard, areProfilePropsEqual);
