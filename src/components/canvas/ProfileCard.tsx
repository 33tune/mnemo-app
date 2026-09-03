"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { trackRender } from "@/lib/perfDebug";
import type { ProfileCardData, TextFont, ProfileCardVariant, CardEffects } from "@/types";
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
import { computeComposition, type CompositionStrategy, type ElementBox } from "@/lib/cardComposition";

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
const PHOTO_SIZES = { sm: 52, md: 80, lg: 112 };
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";
// Reflow transition for composed-layout content boxes — never applied to the
// pfp box itself (see startAnchorDrag / renderComposed): it must track the
// mouse 1:1 with zero lag, so it never gets a transition, dragging or not.
const REFLOW_TRANSITION = `left 0.2s ${EASE}, top 0.2s ${EASE}, width 0.2s ${EASE}, height 0.2s ${EASE}`;

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
  currentUserId, ownerUserId, entryAnimStyle = {},
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("ProfileCard");

  const [menuOpen,     setMenuOpen]     = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Layout mode
  const layout = (card.layout ?? "vertical") as "vertical" | "horizontal" | "free";

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
  const photoSizeKey   = card.photoSize ?? "md";
  const basePx         = PHOTO_SIZES[photoSizeKey];
  const avatarSize     = variant === "guns" || variant === "poster" ? Math.max(basePx, 88) :
                         variant === "minimal" ? Math.min(basePx, 56) : basePx;
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

  const gap = variant === "minimal" ? 5 : 7;
  const pad = variant === "minimal" ? 14 : 20;

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
  const startAnchorDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canInteract || layout === "free") return;

    isDraggingAnchor.current = true;
    const startMX = e.clientX, startMY = e.clientY;
    const startAnchor = { ...anchor };
    const availW = Math.max(1, card.w - 2 * pad - avatarSize);
    const availH = Math.max(1, card.h - 2 * pad - avatarSize);

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startMX) / availW;
      const dy = (ev.clientY - startMY) / availH;
      setAnchor({
        x: Math.max(0, Math.min(1, startAnchor.x + dx)),
        y: Math.max(0, Math.min(1, startAnchor.y + dy)),
      });
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
  }, [canInteract, layout, anchor, card.id, card.w, card.h, pad, avatarSize, updateProfile]);

  // ── Element renderers ─────────────────────────────────────────────────────

  function AvatarEl({ size = avatarSize, style }: { size?: number; style?: CSSProperties }) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
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
      <div style={{ fontFamily: globalFont, fontSize: nameFontSize, fontWeight: 700, color: primaryColor, lineHeight: 1.2, ...style }}>
        {card.name}
      </div>
    );
  }

  function HandleLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: faintColor, letterSpacing: 0.4, ...style }}>
        @{card.handle}
      </div>
    );
  }

  function DescriptorLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: secondaryColor, letterSpacing: 0.5, ...style }}>
        {card.status}
      </div>
    );
  }

  function LocationLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 8, color: faintColor, letterSpacing: 0.3, ...style }}>
        ● {card.location}
      </div>
    );
  }

  function BioText({ style }: { style?: CSSProperties }) {
    return (
      <div style={{
        fontFamily: MONO, fontSize: card.bioFontSize ?? 8, color: withOpacity(baseColor, 0.42),
        lineHeight: 1.6, whiteSpace: "pre-wrap" as CSSProperties["whiteSpace"], ...style,
      } as CSSProperties}>{card.bio}</div>
    );
  }

  function ViewsLine({ style }: { style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, color: faintColor, letterSpacing: 1.5, textTransform: "uppercase" as CSSProperties["textTransform"], ...style }}>
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

  // ── Composed layout (Stage 3B) ────────────────────────────────────────────
  // Replaces the manual vertical/horizontal flex stacks: the user only moves
  // the PFP (startAnchorDrag → anchor), and computeComposition() decides
  // where everything else goes. renderVertical/renderHorizontal above stay
  // defined but unused — legacy cleanup is a separate later stage.
  function renderComposed() {
    const result = computeComposition({
      format: card.format ?? "vertical",
      boxW: card.w,
      boxH: card.h,
      padding: pad,
      pfp: { anchorX: anchor.x, anchorY: anchor.y, size: avatarSize },
      content: {
        name:       { present: !!card.name,     length: card.name?.length ?? 0 },
        handle:     { present: !!card.handle,   length: card.handle?.length ?? 0 },
        bio:        { present: !!card.bio,      length: card.bio?.length ?? 0 },
        descriptor: { present: !!card.status,   length: card.status?.length ?? 0 },
        location:   { present: !!card.location, length: card.location?.length ?? 0 },
        views:      { present: !!card.showViews },
      },
      typography: { nameFontSize, bioFontSize: card.bioFontSize ?? 8 },
      incumbent: incumbentRef.current,
    });
    incumbentRef.current = result.strategy;
    const { boxes } = result;
    const isAnchorDraggable = canInteract && layout !== "free";

    // While actively dragging, the pfp box always renders at the raw
    // anchor-derived position (same padding+anchor*(avail-size) formula the
    // engine itself uses — see resolveAxis/resolveCentered in
    // cardComposition.ts) rather than boxes.pfp, so it tracks the mouse 1:1
    // even in the rare case the engine had to compromise (anchorDistance>0)
    // to keep content readable. Content boxes still use the engine's
    // (possibly compromised) result, so they stay consistent with each
    // other; only the pfp visual can momentarily diverge from them, and it
    // reconciles instantly (no transition) once the drag ends.
    const pfpBox: ElementBox | undefined = isDraggingAnchor.current
      ? {
          x: pad + anchor.x * Math.max(0, card.w - 2 * pad - avatarSize),
          y: pad + anchor.y * Math.max(0, card.h - 2 * pad - avatarSize),
          w: avatarSize, h: avatarSize,
        }
      : boxes.pfp;

    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 3, overflow: "hidden" }}>
        {pfpBox && (
          <div
            style={{
              position: "absolute", left: pfpBox.x, top: pfpBox.y, width: pfpBox.w, height: pfpBox.h,
              cursor: isAnchorDraggable ? "grab" : "default",
            }}
            onMouseDown={isAnchorDraggable ? startAnchorDrag : undefined}
          >
            <AvatarEl size={pfpBox.w} style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        {boxes.name && card.name && (
          <div style={{ position: "absolute", left: boxes.name.x, top: boxes.name.y, width: boxes.name.w, height: boxes.name.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <NameLine style={{ whiteSpace: "nowrap" }} />
          </div>
        )}
        {boxes.handle && card.handle && (
          <div style={{ position: "absolute", left: boxes.handle.x, top: boxes.handle.y, width: boxes.handle.w, height: boxes.handle.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <HandleLine style={{ whiteSpace: "nowrap" }} />
          </div>
        )}
        {boxes.descriptor && card.status && (
          <div style={{ position: "absolute", left: boxes.descriptor.x, top: boxes.descriptor.y, width: boxes.descriptor.w, height: boxes.descriptor.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <DescriptorLine style={{ whiteSpace: "nowrap" }} />
          </div>
        )}
        {boxes.location && card.location && (
          <div style={{ position: "absolute", left: boxes.location.x, top: boxes.location.y, width: boxes.location.w, height: boxes.location.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <LocationLine style={{ whiteSpace: "nowrap" }} />
          </div>
        )}
        {boxes.bio && card.bio && (
          <div style={{ position: "absolute", left: boxes.bio.x, top: boxes.bio.y, width: boxes.bio.w, height: boxes.bio.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <BioText style={{
              display: "-webkit-box",
              WebkitLineClamp: boxes.bio.lines ?? 1,
              WebkitBoxOrient: "vertical" as CSSProperties["WebkitBoxOrient"],
              overflow: "hidden",
            }} />
          </div>
        )}
        {boxes.views && card.showViews && (
          <div style={{ position: "absolute", left: boxes.views.x, top: boxes.views.y, width: boxes.views.w, height: boxes.views.h, overflow: "hidden", transition: REFLOW_TRANSITION }}>
            <ViewsLine style={{ whiteSpace: "nowrap" }} />
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
            {/* Stage 3B: composed layout (computeComposition) is now the live
                path for every reachable state (default/"vertical"/"horizontal" —
                there is no UI to pick between those two anymore). "free" is
                the only legacy path still actually rendered; renderVertical/
                renderHorizontal stay defined above, unused, for a later
                cleanup stage — see Stage 3B plan. */}
            {layout === "free" && renderFree()}
            {layout !== "free" && renderComposed()}
          </div>
        </CardLayers>

        {/* ── Gear handle ── */}
        {isSel && canInteract && (
          <div
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
