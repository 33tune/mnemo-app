"use client";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, memo, type CSSProperties } from "react";
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
import { resolveLinkButtonStyle } from "@/lib/linkButtons";
import { profileLayout, profileCardMinSize, positionsPatch, formatViewCount, type TextMeasurer, type DragState, type ProfileLayout, type BlockKey, type Rect } from "@/lib/profileCardLayout";
import { guidesFor, snapRect, type SnapState } from "@/lib/cardSolver";
import { getTextMeasurer, useFontsVersion } from "@/lib/textMeasure";
import { LinkButtonsBlock } from "./LinkButtonsBlock";
import { nextAnchorAxis } from "@/lib/anchorDrag";
import {
  anchorToRect, snapAxis, snappedPoint, MAGNETIC_POINTS,
} from "@/lib/blockConstraints";
import { resolvePfpSize, pfpRadiusToPercent, getCardPadding, PFP_PHOTO_SIZES, centerCardPosition, shouldApplyGrowth } from "@/lib/cardGeometry";
import { isPfpAnchorDraggable } from "@/lib/canvasSelectionGuards";
import { detectPlatform, PlatformIcon, PLATFORM_COLORS, PLATFORM_LABELS } from "./SocialIcons";
import { CONTACT_LINK_ICON_SIZE, CONTACT_LINK_GAP, CONTACT_LINK_ICON_OPACITY } from "@/lib/contactLinksBlock";
import { resolveClickAfterDrag } from "@/lib/dragClickGuard";
import { withOpacity, resolveCardColors, cardIsLight, cardBaseColor } from "@/lib/cardColors";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveTextEffectStyle, resolveLetterEffectStyle, roleFxOnly, anyTextGlowPulse } from "@/lib/textEffects";
import { useMotionKeyframes, resolveGlowPulseAnimation } from "@/lib/cardMotion";
import { resolveBlockStyle } from "@/lib/blockStyle";
import { PART_ATTR, PART_CLICK_SLOP, partFromTarget, movedBeyondSlop, type PartClick, type PartRole } from "@/lib/partNavigation";
import type { ObjectId } from "@/lib/inspectorObjects";
import { T as UIT } from "@/ui/tokens";

// ── Draggable blocks (free layout engine, 2026-10-15) ──────────────────────
// photo / text group (name + @user + phrase + bio) / location / views /
// icons / buttons — see cardSolver.ts and profileCardLayout.ts. Every block
// is dragged the same way (startPartDrag).
const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";
// Reflow transition for the blocks the engine moves out of the way — never
// for the block being dragged (it tracks the mouse 1:1, zero lag).
const REFLOW_TRANSITION = `left 0.2s ${EASE}, top 0.2s ${EASE}, width 0.2s ${EASE}, height 0.2s ${EASE}`;
// A press only becomes a drag past this many px (a click never moves anything).
const DRAG_SLOP = PART_CLICK_SLOP;
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
  link, color, size, opacity, menuOpen, didDragRef,
}: {
  link: ContactLink; color: string; size: number; opacity: number; menuOpen: boolean;
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
        opacity: hov ? 1 : opacity, transition: "opacity 0.15s ease", textDecoration: "none",
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
  const fontsVersion = useFontsVersion();
  const [measure, setMeasure] = useState<TextMeasurer | undefined>(undefined);
  useEffect(() => { setMeasure(getTextMeasurer()); }, []);
  // The smallest height where everything fits at this width. A card saved
  // smaller than that (before this engine) renders at the minimum right away
  // — nothing is dropped, also on the public page — and the growth effect
  // below persists it in the editor. space_mobile keeps its stored size.
  const minSize = useMemo(
    () => (layout === "free" ? undefined : profileCardMinSize(card, card.w, { measure, viewCount })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, card, measure, viewCount, fontsVersion],
  );
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

  // ── Free layout drag (2026-10-15) ─────────────────────────────────────────
  // The live drag (target rect of the dragged block over the positions every
  // block had when it started) — re-rendered on every mousemove; the layout
  // of each render is kept in refs so the mouseup can save exactly what is
  // on screen. Nothing is written until the drag ends (positionsPatch).
  const [drag, setDrag] = useState<(DragState & { lineX?: number; lineY?: number }) | null>(null);
  const lastLayoutRef = useRef<ProfileLayout | undefined>(undefined);
  const renderHRef = useRef(card.h);
  // Whether the current/last links / buttons drag actually moved (Stage
  // 4.2-C.2.1): left set after mouseup so the trailing `click` on their
  // <a> can consume it (resolveClickAfterDrag) and not navigate.
  const linksDidDragRef = useRef(false);
  /** Same as linksDidDragRef, for the link buttons' <a>s. */
  const buttonsDidDragRef = useRef(false);

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
    linksIcon: card.linksIconColor, about: card.aboutColor,
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
  const aboutEffectStyle      = resolveTextEffectStyle(effectiveEffects.text, textRoles?.about, resolvedColors.about);
  // Product closeout — shimmer fix: shimmer no longer requires gradient to
  // be set (see textEffects.ts's header), so "is shimmer active anywhere"
  // is now just "is `shimmer` present", not "gradient AND shimmer".
  const anyShimmerActive = !!(
    textRoles?.name?.shimmer || textRoles?.handle?.shimmer || textRoles?.descriptor?.shimmer ||
    textRoles?.location?.shimmer || textRoles?.bio?.shimmer || textRoles?.views?.shimmer || textRoles?.about?.shimmer
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
  const aboutBlockStyle    = resolveBlockStyle(card, "about");

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

  // ── Drag of any block (free layout engine) ────────────────────────────────
  // 1:1 with the mouse after DRAG_SLOP px; the target snaps to the card's
  // edges / center and the other blocks' edges / centers (snapRect — it
  // helps, never blocks). Every mousemove re-renders through profileLayout,
  // which moves whatever the dragged block collides with (cardSolver.ts).
  // On mouseup ONE patch saves every block's position and the card height.
  const startPartDrag = (e: React.MouseEvent, key: BlockKey) => {
    e.stopPropagation();
    if (!isPfpAnchorDraggable(canInteract, layout, isSel)) return;
    const l = lastLayoutRef.current;
    const start = l?.rects[key];
    if (!l || !start) return;
    const base = { ...l.rects };
    const boxH = renderHRef.current;
    const guides = guidesFor(card.w, boxH, l.blocks.pad, (Object.keys(base) as BlockKey[]).filter(k => k !== key).map(k => base[k]!));
    const sx = e.clientX, sy = e.clientY;
    let active = false;
    let snap: SnapState = {};
    linksDidDragRef.current = false;
    buttonsDidDragRef.current = false;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!active && Math.hypot(dx, dy) <= DRAG_SLOP) return;
      if (!active) {
        active = true;
        if (key === "links") linksDidDragRef.current = true;
        if (key === "buttons") buttonsDidDragRef.current = true;
      }
      const pad = l.blocks.pad;
      const x = Math.max(pad, Math.min(card.w - pad - start.w, start.x + dx));
      const y = Math.max(pad, start.y + dy);
      const s = snapRect({ x, y, w: start.w, h: start.h }, guides, snap);
      snap = s.state;
      setDrag({ key, base, x: Math.max(pad, Math.min(card.w - pad - start.w, s.x)), y: Math.max(pad, s.y), lineX: s.lineX, lineY: s.lineY });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!active) return;
      const done = lastLayoutRef.current;
      const h = renderHRef.current;
      if (done) updateProfile(card.id, { ...positionsPatch(card, done, card.w, h), h });
      setDrag(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

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

  /** "Sobre mí" (2026-10-21): plain text (React escapes it), line breaks kept. */
  function AboutText({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: fontStyle(card.aboutFont, MONO), fontSize: typography.about.fontSize, color: resolvedColors.about,
        lineHeight: typography.about.lineHeight, whiteSpace: "pre-wrap" as CSSProperties["whiteSpace"], textAlign,
        ...(typography.about.fontWeight != null ? { fontWeight: typography.about.fontWeight } : {}),
        ...aboutEffectStyle, ...style,
      } as CSSProperties}>{card.aboutText}</div>
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

  // ── Layout (free layout engine, 2026-10-15) ──────────────────────────────
  // profileCardLayout.ts: block sizes, desired positions, collisions — the
  // same module the resize floor uses. While a block is dragged the card may
  // grow downward (renderH) instead of throwing a block far away; it is
  // saved with the positions on mouseup. "free" mode (legacy) doesn't use it.
  const contactLinks = card.contactLinks ?? [];
  const linksIconSize = card.linksIconSize ?? CONTACT_LINK_ICON_SIZE;
  const linkButtons = (card.linkButtons ?? []).filter(b => b.url);
  const buttonStyle = resolveLinkButtonStyle(card.linkButtonStyle, baseColor);
  const composed = layout === "free" ? undefined
    : profileLayout(card, {
      w: card.w, h: cardH, measure, viewCount,
      drag: drag ?? undefined,
      // Continuity while the shape of things changes under the pointer.
      prev: drag || isResizing ? lastLayoutRef.current?.rects : undefined,
    });
  const renderH = composed && drag ? Math.max(cardH, Math.ceil(composed.neededH)) : cardH;
  lastLayoutRef.current = composed;
  renderHRef.current = renderH;

  // ── Content floor + centering ─────────────────────────────────────────────
  // The card is never smaller than what it holds (profileCardMinSize — the
  // same floor the resize handles, Ctrl/⌘+arrows and Medidas clamp to):
  // adding content grows it right away (an h/x/y-only write is the system's,
  // editorHistory.ts's isSystemLayoutWrite, never its own undo step). It
  // only grows; removing content never shrinks it.
  //
  // Recentering (Stage 4.2-C.2.4) stays in this one effect: x/y come from
  // centerCardPosition() — the same formula the resize drag uses — so there
  // is never a second writer of the position during a gesture. Paused while
  // a resize (Stage 4.2-C.2.5) or a block drag is active. space_mobile (no
  // viewport props): never writes (mobile legacy rule).
  useEffect(() => {
    if (layout === "free" || viewportW == null || viewportH == null || drag) return;
    if (!shouldApplyGrowth(isResizing)) return;
    const patch: Partial<ProfileCardData> = {};
    if (cardH !== card.h) patch.h = cardH;
    const { x: cx, y: cy } = centerCardPosition(viewportW, viewportH, card.w, cardH, CANVAS_TOP_OFFSET);
    if (cx !== card.x) patch.x = cx;
    if (cy !== card.y) patch.y = cy;
    if (Object.keys(patch).length > 0) updateProfile(card.id, patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, isResizing, drag, cardH, card.h, card.w, card.x, card.y, card.id, viewportW, viewportH]);

  // Every block always has a place now (the card grows to fit), so the
  // inspector's "doesn't fit" notes only show for a layout that does not fit
  // at all (the card at its maximum size).
  const linksFits = composed && contactLinks.length > 0 ? composed.fits : undefined;
  const buttonsFits = composed && linkButtons.length > 0 ? composed.fits : undefined;

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
    if (!composed) return null; // only called when layout !== "free"
    const { rects, rows } = composed;
    const dragging = drag?.key;

    // A faint dashed outline ONLY on the block being dragged (Stage 3B.3-B
    // §7: no permanent handles / boxes).
    const dragOutline = (key: BlockKey): CSSProperties =>
      dragging === key ? { outline: `1px dashed ${withOpacity(baseColor, 0.35)}`, outlineOffset: 2 } : {};
    // The dragged block tracks the mouse with zero lag; the blocks the engine
    // moves out of its way slide (REFLOW_TRANSITION) instead of jumping.
    const motion = (key: BlockKey): string => (dragging === key ? "none" : REFLOW_TRANSITION);
    const grab = isAnchorDraggable ? (dragging ? "grabbing" : "grab") : "default";
    const down = (key: BlockKey) => (isAnchorDraggable ? (e: React.MouseEvent) => startPartDrag(e, key) : undefined);
    // Texts wrap onto more lines instead of being cut (the engine sized the
    // rows for exactly that).
    const wrap: CSSProperties = { whiteSpace: "normal", overflowWrap: "anywhere" };
    const row = (role: "name" | "handle" | "descriptor" | "bio" | "location" | "views" | "about", content: React.ReactNode) => {
      const r = rows[role];
      if (!r) return null;
      return (
        <div {...partProps(role)} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, overflow: "hidden", transition: REFLOW_TRANSITION, ...partOutline(role) }}>
          {content}
        </div>
      );
    };
    const box = (r: Rect): CSSProperties => ({ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h });

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3, overflow: "hidden" }}>
        {rects.pfp && (
          <div
            data-canvas-hot=""
            {...partProps("photo")}
            style={{ ...box(rects.pfp), transition: motion("pfp"), cursor: grab, ...partOutline("photo"), ...dragOutline("pfp") }}
            onMouseDown={down("pfp")}
          >
            {AvatarEl({ size: rects.pfp.w, style: { width: "100%", height: "100%" } })}
          </div>
        )}
        {rects.identity && (
          <div
            style={{
              ...box(rects.identity), transition: motion("identity"), cursor: grab,
              borderRadius: identityBlockStyle.radius, background: identityBlockStyle.bg,
              ...dragOutline("identity"),
            }}
            onMouseDown={down("identity")}
          >
            {card.name && row("name", NameLine({ style: wrap }))}
            {card.handle && row("handle", HandleLine({ style: wrap }))}
            {card.status && row("descriptor", DescriptorLine({ style: wrap }))}
            {card.bio && row("bio", BioText({ style: { overflowWrap: "anywhere" } }))}
          </div>
        )}
        {rects.location && card.location && (
          <div
            style={{
              ...box(rects.location), transition: motion("location"), cursor: grab,
              borderRadius: locationBlockStyle.radius, background: locationBlockStyle.bg,
              ...dragOutline("location"),
            }}
            onMouseDown={down("location")}
          >
            {row("location", LocationLine({ style: wrap }))}
          </div>
        )}
        {rects.views && card.showViews && (
          <div
            style={{
              ...box(rects.views), transition: motion("views"), cursor: grab,
              borderRadius: viewsBlockStyle.radius, background: viewsBlockStyle.bg,
              ...dragOutline("views"),
            }}
            onMouseDown={down("views")}
          >
            {row("views", ViewsLine({ style: wrap }))}
          </div>
        )}
        {rects.about && card.aboutText?.trim() && (
          <div
            style={{
              ...box(rects.about), transition: motion("about"), cursor: grab,
              borderRadius: aboutBlockStyle.radius, background: aboutBlockStyle.bg,
              ...dragOutline("about"),
            }}
            onMouseDown={down("about")}
          >
            {row("about", AboutText({ style: { overflowWrap: "anywhere" } }))}
          </div>
        )}
        {rects.links && contactLinks.length > 0 && (
          <div
            data-canvas-hot=""
            {...partProps("links")}
            style={{
              ...box(rects.links),
              display: "flex", flexWrap: "wrap", alignContent: "flex-start", alignItems: "center",
              justifyContent: textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center",
              gap: CONTACT_LINK_GAP,
              transition: motion("links"), cursor: grab,
              borderRadius: linksBlockStyle.radius, background: linksBlockStyle.bg,
              ...partOutline("links"),
              ...dragOutline("links"),
            }}
            onMouseDown={down("links")}
          >
            {contactLinks.filter(l => l.url).map(link => (
              <ContactLinkIcon
                key={link.id} link={link} color={linksBlockStyle.iconColor ?? resolvedColors.linksIcon} size={linksIconSize} opacity={card.linksIconOpacity ?? CONTACT_LINK_ICON_OPACITY} menuOpen={menuOpen}
                didDragRef={isAnchorDraggable ? linksDidDragRef : undefined}
              />
            ))}
          </div>
        )}
        {rects.buttons && linkButtons.length > 0 && (
          <div
            data-canvas-hot=""
            {...partProps("buttons")}
            style={{ ...box(rects.buttons), transition: motion("buttons"), cursor: grab, ...partOutline("buttons"), ...dragOutline("buttons") }}
            onMouseDown={down("buttons")}
          >
            <LinkButtonsBlock buttons={linkButtons} style={buttonStyle} inert={menuOpen}
              didDragRef={isAnchorDraggable ? buttonsDidDragRef : undefined} />
          </div>
        )}
        {/* Magnet guides — editor only, while dragging. */}
        {drag && drag.lineX != null && (
          <div aria-hidden style={{ position: "absolute", left: drag.lineX - 0.5, top: 0, bottom: 0, width: 1, background: withOpacity(baseColor, 0.4), pointerEvents: "none" }} />
        )}
        {drag && drag.lineY != null && (
          <div aria-hidden style={{ position: "absolute", top: drag.lineY - 0.5, left: 0, right: 0, height: 1, background: withOpacity(baseColor, 0.4), pointerEvents: "none" }} />
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
          position: "absolute", left: card.x, top: card.y, width: card.w, height: renderH,
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
