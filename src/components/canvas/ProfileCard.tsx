"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { trackRender } from "@/lib/perfDebug";
import type { ProfileCardData, TextFont, ProfileCardVariant, CardEffects, ContactLink } from "@/types";
import { getFontStyle as getCanvasFontStyle } from "@/lib/fontList";
import { useProfileViews } from "@/hooks/useProfileViews";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import { MenuPanel } from "@/ui";
import ProfileConfigMenu from "./ProfileConfigMenu";
import { computeBlockLayout, type CompositionStrategy, type ElementBox, type BlockOverrides, type LinksBlockInput, type MusicBlockInput } from "@/lib/cardComposition";
import { nextAnchorAxis } from "@/lib/anchorDrag";
import {
  rectToAnchor, snapAxis, snappedPoint, MAGNETIC_POINTS, centerAlignAnchor,
} from "@/lib/blockConstraints";
import { resolvePfpSize, pfpRadiusToPercent, getCardPadding, PFP_PHOTO_SIZES, computeRequiredCardHeight, centerCardPosition, shouldApplyGrowth } from "@/lib/cardGeometry";
import { isPfpAnchorDraggable } from "@/lib/canvasSelectionGuards";
import { detectPlatform, PlatformIcon, PLATFORM_COLORS, PLATFORM_LABELS } from "./SocialIcons";
import { contactLinksNaturalSize, composedContentBottom, CONTACT_LINK_ICON_SIZE, CONTACT_LINK_GAP } from "@/lib/contactLinksBlock";
import { computeMusicNaturalSize, MUSIC_BLOCK_GAP } from "@/lib/musicBlockSizing";
import ProfileMusicPlayer from "./ProfileMusicPlayer";
import { resolveClickAfterDrag } from "@/lib/dragClickGuard";

// ── Draggable block keys (Stage 3B.3-B) ─────────────────────────────────────
// Identity = name+handle+descriptor+bio, moved as one block — see
// computeBlockLayout()'s identityRect in cardComposition.ts. Location/Views
// are single boxes already. PFP has its own separate, older anchor system
// (pfpAnchorX/Y, startAnchorDrag) and is NOT one of these — see Stage 3B.2-B.
// Stage 4.2-A: "links" added as a 4th block key — infrastructure only, so a
// future Links UI (Stage 4.2-B) can call startBlockDrag(..., "links", ...)
// without touching this type again. Stage 4.2-C.1 adds "music" the same way,
// now wired for real (drag works; the player UI itself is Stage 4.2-C.2).
type BlockKey = "identity" | "location" | "views" | "links" | "music";
const BLOCK_ANCHOR_FIELDS: Record<BlockKey, readonly [
  "identityAnchorX" | "locationAnchorX" | "viewsAnchorX" | "linksAnchorX" | "musicAnchorX",
  "identityAnchorY" | "locationAnchorY" | "viewsAnchorY" | "linksAnchorY" | "musicAnchorY",
]> = {
  identity: ["identityAnchorX", "identityAnchorY"],
  location: ["locationAnchorX", "locationAnchorY"],
  views:    ["viewsAnchorX", "viewsAnchorY"],
  links:    ["linksAnchorX", "linksAnchorY"],
  music:    ["musicAnchorX", "musicAnchorY"],
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
const CANVAS_TOP_OFFSET = 44;

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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
function luminance(hex: string): number {
  if (!hex?.startsWith("#") || hex.length < 7) return 0;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function withOpacity(hex: string, alpha: number): string {
  if (!hex?.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  onClick:           (e: React.MouseEvent) => void;
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
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("ProfileCard");

  const [menuOpen,     setMenuOpen]     = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Layout mode
  const layout = (card.layout ?? "vertical") as "vertical" | "horizontal" | "free";
  // Decides whether the PFP div even gets a mousedown handler at all — see
  // startAnchorDrag's onMouseDown wiring below. Requires the card to be
  // individually selected first (Stage 3B.2-B) — see isPfpAnchorDraggable's
  // own doc comment for why.
  const isAnchorDraggable = isPfpAnchorDraggable(canInteract, layout, isSel);

  // Views counter — fetched once per mount, same hook used by StatsCardWidget
  const { total: viewCount } = useProfileViews(ownerUserId);

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
  // Winning strategy from the last computeComposition() call, fed back in as
  // `incumbent` so hysteresis holds across the whole drag, not just at rest.
  const incumbentRef = useRef<CompositionStrategy | undefined>(undefined);

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
    music:    card.musicAnchorX    != null && card.musicAnchorY    != null ? { x: card.musicAnchorX,    y: card.musicAnchorY    } : undefined,
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
  // views/music blocks contain no real <a> that navigation could leak into.
  const linksDidDragRef = useRef(false);

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
      music: draggingBlockRef.current === "music" ? prev.music
        : (card.musicAnchorX != null && card.musicAnchorY != null ? { x: card.musicAnchorX, y: card.musicAnchorY } : undefined),
    }));
  }, [card.identityAnchorX, card.identityAnchorY, card.locationAnchorX, card.locationAnchorY, card.viewsAnchorX, card.viewsAnchorY, card.linksAnchorX, card.linksAnchorY, card.musicAnchorX, card.musicAnchorY]);

  // ── Variant / effects ──
  const variant: ProfileCardVariant = (card.variant as ProfileCardVariant) ?? "classic";
  const effectiveEffects: CardEffects = getProfileCardEffects(card);

  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>, true);

  // ── Portal position ──
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const MENU_W = 288, GAP = 10;
      const left = r.right + GAP + MENU_W > window.innerWidth
        ? Math.max(4, r.left - MENU_W - GAP)
        : r.right + GAP;
      setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => { window.removeEventListener("scroll", compute, true); window.removeEventListener("resize", compute); };
  }, [menuOpen, card.x, card.y, card.w, card.h]);

  useEffect(() => {
    if (!isSel) { setMenuOpen(false); }
  }, [isSel]);


  // ── Visual values ──
  const gap = variant === "minimal" ? 5 : 7;
  const pad = getCardPadding(variant);

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
  const avatarSize     = resolvePfpSize(photoSizeKey, pfpBaseNudged, card.w, card.h, pad);
  const avatarRadiusPct = pfpRadiusToPercent(card.pfpRadius);
  const textAlign      = card.textAlign ?? "left";
  const nameFontSize   = card.nameFontSize ?? (variant === "guns" || variant === "poster" ? 17 : 15);
  const font           = card.font ?? "DM Sans";
  const isLight        = luminance(effectiveEffects.bg?.color ?? card.bgColor) > 0.5;
  const baseColor      = card.textColor ?? (isLight ? "#0f0f0f" : "#ffffff");
  const primaryColor   = withOpacity(baseColor, 0.95);
  const secondaryColor = withOpacity(baseColor, 0.72);
  const faintColor     = withOpacity(baseColor, 0.45);
  const globalFont     = fontStyle(font);
  const rad            = effectiveEffects.border?.radius ?? card.borderRadius;

  const avatarBorder =
    variant === "minimal" ? "none" :
    variant === "guns" || variant === "poster"
      ? `2px solid ${withOpacity(baseColor, 0.22)}`
      : `2px solid ${withOpacity(baseColor, 0.14)}`;
  const avatarShadow = variant === "guns" || variant === "poster"
    ? `0 6px 28px ${withOpacity(baseColor, 0.14)}` : "none";

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
    // Raw geometric room on each axis — deliberately NOT floored to a minimum.
    // See nextAnchorAxis in anchorDrag.ts for why a degenerate axis (<=0) must
    // freeze instead of becoming hypersensitive.
    const rawAvailW = card.w - 2 * pad - avatarSize;
    const rawAvailH = card.h - 2 * pad - avatarSize;
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
  }, [canInteract, layout, isSel, anchor, card.id, card.w, card.h, pad, avatarSize, updateProfile]);

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
    const startMX = e.clientX, startMY = e.clientY;
    const rawAvailW = card.w - 2 * pad - blockW;
    const rawAvailH = card.h - 2 * pad - blockH;
    const alignX = pfpBox ? centerAlignAnchor(pfpBox.x + pfpBox.w / 2, blockW, rawAvailW, pad) : undefined;
    const alignY = pfpBox ? centerAlignAnchor(pfpBox.y + pfpBox.h / 2, blockH, rawAvailH, pad) : undefined;
    const pointsX = alignX != null ? [...MAGNETIC_POINTS, alignX] : undefined;
    const pointsY = alignY != null ? [...MAGNETIC_POINTS, alignY] : undefined;
    let snappedX = snappedPoint(startAnchor.x, pointsX);
    let snappedY = snappedPoint(startAnchor.y, pointsY);

    const onMove = (ev: MouseEvent) => {
      if (key === "links") linksDidDragRef.current = true;
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
  }, [canInteract, layout, isSel, card.id, card.w, card.h, pad, updateProfile]);

  // ── Element renderers ─────────────────────────────────────────────────────

  function AvatarEl({ size = avatarSize, style }: { size?: number; style?: CSSProperties }) {
    return (
      <div style={{
        width: size, height: size, borderRadius: `${avatarRadiusPct}%`, overflow: "hidden",
        border: avatarBorder, background: "rgba(255,255,255,0.06)",
        boxShadow: avatarShadow, flexShrink: 0, ...style,
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
    );
  }

  // ── Field content renderers ───────────────────────────────────────────────
  // One definition per field, reused by all three layouts. Each layout stays
  // responsible for wrapping/positioning; only the `style` delta between
  // layouts is passed in, so existing output (vertical/horizontal/free) is
  // unchanged — only descriptor/location are genuinely new content.

  function NameLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: globalFont, fontSize: nameFontSize, fontWeight: 700, color: primaryColor, lineHeight: 1.2, textAlign, ...style }}>
        {card.name}
      </div>
    );
  }

  function HandleLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: faintColor, letterSpacing: 0.4, textAlign, ...style }}>
        @{card.handle}
      </div>
    );
  }

  function DescriptorLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: secondaryColor, letterSpacing: 0.5, textAlign, ...style }}>
        {card.status}
      </div>
    );
  }

  function LocationLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 8, color: faintColor, letterSpacing: 0.3, textAlign, ...style }}>
        ● {card.location}
      </div>
    );
  }

  function BioText({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: MONO, fontSize: card.bioFontSize ?? 8, color: withOpacity(baseColor, 0.42),
        lineHeight: 1.6, whiteSpace: "pre-wrap" as CSSProperties["whiteSpace"], textAlign, ...style,
      } as CSSProperties}>{card.bio}</div>
    );
  }

  function ViewsLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: faintColor, letterSpacing: 1.5, textTransform: "uppercase" as CSSProperties["textTransform"], textAlign, ...style }}>
        {fmtNum(viewCount)} views
      </div>
    );
  }

  // ── Free-layout wrapper per element ──────────────────────────────────────

  function FreeWrap({ elemKey, children }: { elemKey: FreeKey; children: React.ReactNode }) {
    const pos = freePos[elemKey];
    const isFreeDraggable = layout === "free" && canInteract;
    return (
      <div
        style={{
          position: "absolute",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: `translate(-50%, -50%) scale(${pos.s})`,
          cursor: isFreeDraggable ? "grab" : "default",
          zIndex: 3,
          userSelect: "none",
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
        <AvatarEl />
        {card.name && <NameLine style={{ textAlign: "center", marginTop: variant === "minimal" ? 2 : 4 }} />}
        {card.handle && <HandleLine style={{ marginTop: -2 }} />}
        {card.status && <DescriptorLine style={{ textAlign: "center" }} />}
        {card.location && <LocationLine style={{ textAlign: "center" }} />}
        {card.bio && <BioText style={{ maxWidth: "100%", textAlign: "center", overflow: "hidden", minHeight: 0 }} />}
        {card.showViews && <ViewsLine />}
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
        <AvatarEl style={{ flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          {card.name && <NameLine />}
          {card.handle && <HandleLine />}
          {card.status && <DescriptorLine />}
          {card.location && <LocationLine />}
          {card.bio && <BioText style={{ overflow: "hidden", minHeight: 0 }} />}
          {card.showViews && <ViewsLine />}
        </div>
        {/* suppress unused warning */}
        <span style={{ display: "none" }}>{photoW}</span>
      </div>
    );
  }

  function renderFree() {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
        <FreeWrap elemKey="photo"><AvatarEl /></FreeWrap>
        {card.name && <FreeWrap elemKey="name"><NameLine style={{ whiteSpace: "nowrap" }} /></FreeWrap>}
        {card.handle && <FreeWrap elemKey="handle"><HandleLine style={{ whiteSpace: "nowrap" }} /></FreeWrap>}
        {card.status && <FreeWrap elemKey="descriptor"><DescriptorLine style={{ whiteSpace: "nowrap" }} /></FreeWrap>}
        {card.location && <FreeWrap elemKey="location"><LocationLine style={{ whiteSpace: "nowrap" }} /></FreeWrap>}
        {card.bio && <FreeWrap elemKey="bio"><BioText style={{ maxWidth: 160, textAlign: "center" }} /></FreeWrap>}
        {card.showViews && <FreeWrap elemKey="views"><ViewsLine style={{ whiteSpace: "nowrap" }} /></FreeWrap>}
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

  // ── Contact Links (Stage 4.2-B) ───────────────────────────────────────────
  // Data + natural size only here — rendering/drag lives in renderComposed()
  // below, growth (§8) in the effect right after. `contactLinks` absent/empty
  // is the pre-4.2-B state: linksBlockInput below stays undefined, and
  // computeBlockLayout takes the exact same code path it always did (see the
  // "no links block" regression test in cardComposition.test.ts).
  const contactLinks = card.contactLinks ?? [];
  // Stage 4.2-C.2.1: user-configurable icon size (menu slider, see
  // ProfileContactLinksMenu.tsx), clamped there to CONTACT_LINK_ICON_SIZE_MIN/MAX.
  // Absent -> the original fixed constant, so every existing card renders
  // byte-identical to before this stage.
  const linksIconSize = card.linksIconSize ?? CONTACT_LINK_ICON_SIZE;
  const linksAvailWidth = Math.max(0, card.w - 2 * pad);
  const linksNaturalSize = contactLinksNaturalSize(contactLinks.length, linksAvailWidth, linksIconSize);

  // ── Music (Stage 4.2-C.1, redesigned minimalist in 4.2-C.2.2, width made
  //    user-controlled in 4.2-C.2.3) ─────────────────────────────────────────
  // Data + natural size only — same shape as Contact Links above. `card.music`
  // absent is the pre-4.2-C state: musicBlockInput below stays undefined, and
  // computeBlockLayout takes the exact same code path it always did (see the
  // "no music block" regression test in cardComposition.test.ts). Width is
  // `card.musicWidth` (set via the slider in ProfileMusicMenu.tsx), never
  // content-driven — this is the ONLY dimension Music can resize; height
  // stays MUSIC_BLOCK_HEIGHT regardless. This exact `musicNaturalSize` is
  // what feeds MusicBlockInput below, so render/drag/growth all agree on
  // the same box — no parallel sizing path.
  const hasMusic = !!card.music;
  const musicAvailWidth = Math.max(0, card.w - 2 * pad);
  const musicNaturalSize = computeMusicNaturalSize({
    availableWidth: musicAvailWidth,
    width: card.musicWidth,
  });

  // ── Composed layout (Stage 3B / 3B.3, extended in 4.2-B for Contact Links,
  //    4.2-C.1 for Music) ────────────────────────────────────────────────────
  // The user moves the PFP (startAnchorDrag → anchor) and, as of Stage 3B.3,
  // may additionally override where the identity group (name+handle+
  // descriptor+bio, moved as one block)/location/views/(4.2-B) links/(4.2-C.1)
  // music sit — see computeBlockLayout in cardComposition.ts. With none of
  // the six set, this produces byte-identical output to the plain
  // computeComposition() call it replaces. renderVertical/renderHorizontal
  // above stay defined but unused — legacy cleanup is a separate later stage.
  //
  // Hoisted out of renderComposed() (rather than computed inside it) so the
  // growth effect right below can read the SAME boxes renderComposed() draws
  // from, without a second computeBlockLayout() call — neither the links nor
  // the music extension ever moves an earlier, higher-priority block (see
  // cardComposition.test.ts), so one result is valid for both "what to draw"
  // and "how tall must the card be". Only computed for the composed layouts;
  // "free" mode doesn't use this engine (or Contact Links/Music) at all.
  const composedResult = layout === "free" ? undefined : (() => {
    // Local drag state (blockAnchors), not the raw card props — this is what
    // makes computeBlockLayout re-resolve live on every mousemove-driven
    // re-render during a drag (see startBlockDrag above). Falls back to the
    // persisted value automatically: blockAnchors is synced from card.* by
    // the effect above whenever nothing's being dragged.
    const blockOverrides: BlockOverrides = {
      identity: blockAnchors.identity,
      location: blockAnchors.location,
      views: blockAnchors.views,
      links: blockAnchors.links,
      music: blockAnchors.music,
    };
    const linksBlockInput: LinksBlockInput | undefined =
      contactLinks.length > 0 ? { size: linksNaturalSize } : undefined;
    const musicBlockInput: MusicBlockInput | undefined =
      hasMusic ? { size: musicNaturalSize } : undefined;
    const r = computeBlockLayout({
      format: card.format ?? "vertical",
      boxW: card.w,
      boxH: card.h,
      padding: pad,
      pfp: { anchorX: anchor.x, anchorY: anchor.y, size: avatarSize },
      content: {
        name:       { present: !!card.name,     length: card.name?.length ?? 0 },
        // +1/+2: HandleLine/LocationLine below render "@handle" and "● location"
        // — the engine must reserve space for the prefix it can't see here, or
        // the estimate undershoots and the real text clips.
        handle:     { present: !!card.handle,   length: (card.handle?.length ?? 0) + 1 },
        bio:        { present: !!card.bio,      length: card.bio?.length ?? 0 },
        descriptor: { present: !!card.status,   length: card.status?.length ?? 0 },
        location:   { present: !!card.location, length: (card.location?.length ?? 0) + 2 },
        views:      { present: !!card.showViews },
      },
      typography: { nameFontSize, bioFontSize: card.bioFontSize ?? 8 },
      incumbent: incumbentRef.current,
      textAlign,
    }, blockOverrides, linksBlockInput, musicBlockInput);
    incumbentRef.current = r.strategy;
    return r;
  })();

  // ── Vertical growth (Stage 4.2-B §8, generalized in 4.2-C.1 for Music) ────
  // Structural only: the effect's dependency array is what content/blocks
  // actually change how tall the card needs to be — link count, whether
  // Music is enabled, each block's natural height, format, padding, and
  // where the existing content currently ends. Pure math
  // (computeRequiredCardHeight in cardGeometry.ts) decides the number every
  // render (cheap); this effect's only job is PERSISTING it, and only when
  // it actually differs from stored state.
  //
  // extraBlocks is built here (Links entry, then Music entry, in that order)
  // rather than calling a single-block helper per block: two SEPARATE calls
  // to computeRequiredCardHeight (one per block) can't correctly stack more
  // than one block — each would independently measure "room needed" from the
  // same contentBottom and take a max, not a sum, under-reporting the
  // required height whenever both are present. See computeRequiredCardHeight's
  // doc comment in cardGeometry.ts.
  //
  // Stage 4.2-C.2.4: this effect also owns recentering (folded in from a
  // previously separate "vertical recentering" effect) — x/y are recomputed
  // via centerCardPosition() (cardGeometry.ts, the SAME formula
  // useDragDrop.ts's resize-drag uses) whenever card.w/h or the viewport
  // change. Keeping this as one effect, not two independent ones each
  // writing part of the position, is the actual fix for the reported
  // resize jump/drift: a separate y-only effect reacting to card.h a render
  // cycle AFTER the resize-drag's own direct state update was a second,
  // competing writer of position during the same gesture. During an active
  // drag this effect is a pure no-op — the drag already set x/y/w/h
  // synchronously to exactly what this same formula would compute, so the
  // patch below ends up empty and no updateProfile call happens at all.
  // Requires viewportW/viewportH from CanvasBoard.tsx — without them
  // (undefined, e.g. space_mobile), recentering simply doesn't run; only
  // the height-growth part still does.
  const contentBottom = composedResult
    ? composedContentBottom(composedResult.boxes, composedResult.identityRect)
    : 0;
  useEffect(() => {
    if (layout === "free") return;
    // Stage 4.2-C.2.5: manual resize gets exclusive control of size while
    // it's in progress — growth must not fight the drag (see
    // shouldApplyGrowth's doc comment in cardGeometry.ts for what
    // running both at once actually caused: the reported vertical
    // resize jump/oscillation). isResizing comes from CanvasBoard.tsx's
    // own `resizing` state, already the single source of truth for "is a
    // resize gesture active" — no second resize-state system here.
    if (!shouldApplyGrowth(isResizing)) return;
    const extraBlocks: { naturalHeight: number; gap: number }[] = [];
    if (contactLinks.length > 0) extraBlocks.push({ naturalHeight: linksNaturalSize.height, gap: CONTACT_LINK_GAP });
    if (hasMusic) extraBlocks.push({ naturalHeight: musicNaturalSize.height, gap: MUSIC_BLOCK_GAP });
    const requiredH = extraBlocks.length > 0
      ? Math.round(computeRequiredCardHeight({ format: card.format, currentH: card.h, contentBottom, padding: pad, extraBlocks }))
      : card.h;

    const patch: Partial<ProfileCardData> = {};
    if (requiredH !== card.h) patch.h = requiredH;

    if (viewportW != null && viewportH != null) {
      const { x: cx, y: cy } = centerCardPosition(viewportW, viewportH, card.w, requiredH, CANVAS_TOP_OFFSET);
      if (cx !== card.x) patch.x = cx;
      if (cy !== card.y) patch.y = cy;
    }

    if (Object.keys(patch).length > 0) updateProfile(card.id, patch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, isResizing, contactLinks.length, linksNaturalSize.height, hasMusic, musicNaturalSize.height, card.format, card.h, card.w, card.x, card.y, contentBottom, pad, card.id, viewportW, viewportH]);

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
      const start = blockAnchors.identity ?? rectToAnchor(identityRect, identityRect.w, identityRect.h, card.w, card.h, pad);
      startBlockDrag(e, "identity", start, identityRect.w, identityRect.h, pfpBox);
    };
    const startLocationDrag = (e: React.MouseEvent) => {
      if (!boxes.location) return;
      const start = blockAnchors.location ?? rectToAnchor(boxes.location, boxes.location.w, boxes.location.h, card.w, card.h, pad);
      startBlockDrag(e, "location", start, boxes.location.w, boxes.location.h, pfpBox);
    };
    const startViewsDrag = (e: React.MouseEvent) => {
      if (!boxes.views) return;
      const start = blockAnchors.views ?? rectToAnchor(boxes.views, boxes.views.w, boxes.views.h, card.w, card.h, pad);
      startBlockDrag(e, "views", start, boxes.views.w, boxes.views.h, pfpBox);
    };
    const startLinksDrag = (e: React.MouseEvent) => {
      if (!boxes.links) return;
      const start = blockAnchors.links ?? rectToAnchor(boxes.links, boxes.links.w, boxes.links.h, card.w, card.h, pad);
      startBlockDrag(e, "links", start, boxes.links.w, boxes.links.h, pfpBox);
    };
    const startMusicDrag = (e: React.MouseEvent) => {
      if (!boxes.music) return;
      const start = blockAnchors.music ?? rectToAnchor(boxes.music, boxes.music.w, boxes.music.h, card.w, card.h, pad);
      startBlockDrag(e, "music", start, boxes.music.w, boxes.music.h, pfpBox);
    };

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3, overflow: "hidden" }}>
        {pfpBox && (
          <div
            data-canvas-hot=""
            style={{
              position: "absolute", left: pfpBox.x, top: pfpBox.y, width: pfpBox.w, height: pfpBox.h,
              cursor: isAnchorDraggable ? "grab" : "default",
            }}
            onMouseDown={isAnchorDraggable ? startAnchorDrag : undefined}
          >
            <AvatarEl size={pfpBox.w} style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        {identityRect && (identityRect.w > 0 || identityRect.h > 0) && (
          <div
            style={{
              position: "absolute", left: identityRect.x, top: identityRect.y,
              width: identityRect.w, height: identityRect.h,
              transition: dragTransition("identity"),
              cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: 2, ...dragOutline("identity"),
            }}
            onMouseDown={isAnchorDraggable ? startIdentityDrag : undefined}
          >
            {boxes.name && card.name && (
              <div style={{ position: "absolute", left: boxes.name.x - identityRect.x, top: boxes.name.y - identityRect.y, width: boxes.name.w, height: boxes.name.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
                <NameLine style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
              </div>
            )}
            {boxes.handle && card.handle && (
              <div style={{ position: "absolute", left: boxes.handle.x - identityRect.x, top: boxes.handle.y - identityRect.y, width: boxes.handle.w, height: boxes.handle.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
                <HandleLine style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
              </div>
            )}
            {boxes.descriptor && card.status && (
              <div style={{ position: "absolute", left: boxes.descriptor.x - identityRect.x, top: boxes.descriptor.y - identityRect.y, width: boxes.descriptor.w, height: boxes.descriptor.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
                <DescriptorLine style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
              </div>
            )}
            {boxes.bio && card.bio && (
              <div style={{ position: "absolute", left: boxes.bio.x - identityRect.x, top: boxes.bio.y - identityRect.y, width: boxes.bio.w, height: boxes.bio.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
                <BioText style={{
                  display: "-webkit-box",
                  WebkitLineClamp: boxes.bio.lines ?? 1,
                  WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"],
                  overflow: "hidden",
                }} />
              </div>
            )}
          </div>
        )}
        {boxes.location && card.location && (
          <div
            style={{
              position: "absolute", left: boxes.location.x, top: boxes.location.y, width: boxes.location.w, height: boxes.location.h,
              overflow: "hidden", transition: dragTransition("location"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: 2, ...dragOutline("location"),
            }}
            onMouseDown={isAnchorDraggable ? startLocationDrag : undefined}
          >
            <LocationLine style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
          </div>
        )}
        {boxes.views && card.showViews && (
          <div
            style={{
              position: "absolute", left: boxes.views.x, top: boxes.views.y, width: boxes.views.w, height: boxes.views.h,
              overflow: "hidden", transition: dragTransition("views"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: 2, ...dragOutline("views"),
            }}
            onMouseDown={isAnchorDraggable ? startViewsDrag : undefined}
          >
            <ViewsLine style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
          </div>
        )}
        {boxes.links && contactLinks.length > 0 && (
          <div
            data-canvas-hot=""
            style={{
              position: "absolute", left: boxes.links.x, top: boxes.links.y, width: boxes.links.w, height: boxes.links.h,
              display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center",
              gap: CONTACT_LINK_GAP,
              transition: dragTransition("links"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: 2, ...dragOutline("links"),
            }}
            onMouseDown={isAnchorDraggable ? startLinksDrag : undefined}
          >
            {contactLinks.filter(l => l.url).map(link => (
              <ContactLinkIcon
                key={link.id} link={link} color={faintColor} size={linksIconSize} menuOpen={menuOpen}
                didDragRef={isAnchorDraggable ? linksDidDragRef : undefined}
              />
            ))}
          </div>
        )}
        {boxes.music && card.music && (
          // Stage 4.2-C.2: the wrapper owns position + block-level drag
          // (same contract as every other block); ProfileMusicPlayer owns
          // its own interactive controls, each stopping propagation so they
          // never trigger startMusicDrag — see that file's header. Stage
          // 4.2-C.2.2: no background/border by default — a heavy wrapper
          // read as "a card inside the card" (see CLAUDE.md's Music
          // redesign notes); it now inherits the ProfileCard's own
          // background, same treatment as Contact Links' wrapper.
          // `overflow: visible` (not hidden) so ProfileMusicPlayer's volume
          // popover can render outside the block's own compact box.
          <div
            data-canvas-hot=""
            style={{
              position: "absolute", left: boxes.music.x, top: boxes.music.y, width: boxes.music.w, height: boxes.music.h,
              transition: dragTransition("music"), cursor: isAnchorDraggable ? "grab" : "default",
              borderRadius: 6, overflow: "visible",
              ...dragOutline("music"),
            }}
            onMouseDown={isAnchorDraggable ? startMusicDrag : undefined}
          >
            <ProfileMusicPlayer music={card.music} textColor={primaryColor} secondaryColor={secondaryColor} mutedColor={faintColor} />
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
        onClick={onClick}
        onMouseMove={onInteractMove}
        onMouseLeave={onInteractLeave}
        style={{
          position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h,
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
          </div>
        </CardLayers>

        {/* ── Gear handle ── */}
        {isSel && canInteract && (
          <div
            data-canvas-hot=""
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const next = !menuOpen;
              if (next && cardRef.current) {
                const r = cardRef.current.getBoundingClientRect();
                const MENU_W = 288, GAP = 10;
                const left = r.right + GAP + MENU_W > window.innerWidth ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
              } else setPortalPos(null);
              setMenuOpen(next);
            }}
            style={{
              position: "absolute", top: -10, left: -10, width: 20, height: 20, borderRadius: "50%",
              background: menuOpen ? "rgba(255,255,255,0.12)" : "rgba(12,12,14,0.96)",
              border: menuOpen ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)", transition: `all 0.12s ${EASE}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke={menuOpen ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.55)"}
              strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        )}

        {/* ── Resize handles ── */}
        {/* Position and rotation are fixed by design (singleton presentation card) —
            no lock/rotate affordances. Resize stays until Forma/proporciones is designed. */}
        {isSel && canInteract && <ResizeHandles onResizeMD={onResizeMD} light={isLight} />}

        {/* ── Config menu ── */}
        {menuOpen && canInteract && portalPos && createPortal(
          <MenuPanel pos={portalPos} width={288} onKeyDown={e => { if (e.key === "Escape") setMenuOpen(false); }}>
            <ProfileConfigMenu card={card} onChange={patch => updateProfile(card.id, patch)} />
          </MenuPanel>
        , document.body)}
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
    prev.ownerUserId       === next.ownerUserId
  );
}
export default memo(ProfileCard, areProfilePropsEqual);
