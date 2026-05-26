"use client";
import { useState, useRef, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { trackRender } from "@/lib/perfDebug";
import type { ProfileCardData, ProfileLink, TextFont } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { bgImageStyle, detectBgMode } from "@/lib/bgStyle";
import { useFollow } from "@/hooks/useFollow";
import { useFavorite } from "@/hooks/useFavorite";
import { usePresence } from "@/hooks/usePresence";
import { useProfileViews } from "@/hooks/useProfileViews";
import type { PresenceState } from "@/types";
import { UIButton, UISlider } from "@/components/ui";

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";

const PHOTO_SIZES = { sm: 52, md: 80, lg: 112 };

const FONTS: { key: TextFont; label: string; style: string }[] = [
  { key: "DM Sans",          label: "DM Sans",    style: "'DM Sans', sans-serif" },
  { key: "Space Mono",       label: "Mono",       style: "'Space Mono', monospace" },
  { key: "Playfair Display", label: "Playfair",   style: "'Playfair Display', serif" },
  { key: "Bebas Neue",       label: "Bebas",      style: "'Bebas Neue', sans-serif" },
  { key: "Syne",             label: "Syne",       style: "'Syne', sans-serif" },
  { key: "Impact",           label: "Impact",     style: "Impact, sans-serif" },
];

function fontStyle(font: TextFont | undefined, fallback = SANS): string {
  return FONTS.find(f => f.key === font)?.style ?? fallback;
}

function luminance(hex: string): number {
  if (!hex?.startsWith("#") || hex.length < 7) return 0;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function withOpacity(hex: string, alpha: number): string {
  if (!hex.startsWith("#")) return hex;
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
  onResizeMD:        (e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateProfile:     (id: string, patch: Partial<ProfileCardData>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:         boolean;
  onMessage?:           (targetHandle: string) => void;
  currentUserId?:       string;
  ownerUserId?:         string;
  authResolved?:        boolean;
  onOpenSocialPanel?:   (mode: "followers" | "following") => void;
}

type DragTarget = "photo" | "text" | "stats" | "follow" | "message" | "favorite" | "links";

// Shared easing
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

function ProfileCard({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD, updateProfile, locked, onToggleLock, canInteract,
  onMessage, currentUserId, ownerUserId, authResolved = false, onOpenSocialPanel,
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("ProfileCard");
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [followHover,  setFollowHover]  = useState(false);
  const [msgHover,     setMsgHover]     = useState(false);
  const [favHover,     setFavHover]     = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);
  const [draggingEl,   setDraggingEl]   = useState<DragTarget | null>(null);
  const [editingField, setEditingField] = useState<"name" | "status" | null>(null);
  const [newLinkUrl,   setNewLinkUrl]   = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkIcon,  setNewLinkIcon]  = useState("");
  const innerRef    = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const favTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Portal: track the card's viewport position for the fixed-position config menu.
  // getBoundingClientRect already accounts for the parent canvas scale transform,
  // so no manual scale math is needed here.
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      // Prefer right side; flip to left if it would clip the viewport
      const MENU_W = 268;
      const GAP    = 10;
      const left   = r.right + GAP + MENU_W > window.innerWidth
        ? Math.max(4, r.left - MENU_W - GAP)
        : r.right + GAP;
      const top    = Math.min(Math.max(8, r.top), window.innerHeight - 120);
      setPortalPos({ left, top });
    };
    compute();
    // Update on scroll (page-level) and resize
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [menuOpen, card.x, card.y, card.w, card.h]);

  useEffect(() => {
    if (!isSel) { setMenuOpen(false); setEditingField(null); }
  }, [isSel]);

  useEffect(() => {
    return () => { if (favTimerRef.current) clearTimeout(favTimerRef.current); };
  }, []);

  const photoRef = useRef<HTMLInputElement>(null);
  const bgImgRef = useRef<HTMLInputElement>(null);

  // Positions — backward compat defaults
  const photoX    = card.photoX    ?? 50;
  const photoY    = card.photoY    ?? 34;
  const textX     = card.textX     ?? 50;
  const textY     = card.textY     ?? 72;
  const statsX    = card.statsX    ?? 50;
  const statsY    = card.statsY    ?? 85;
  const followX   = card.followX   ?? 30;
  const followY   = card.followY   ?? 92;
  const messageX  = card.messageX  ?? 50;
  const messageY  = card.messageY  ?? 92;
  const favoriteX = card.favoriteX ?? 70;
  const favoriteY = card.favoriteY ?? 92;

  const photoScale    = card.photoScale    ?? 1;
  const textScale     = card.textScale     ?? 1;
  const statsScale    = card.statsScale    ?? 1;
  const followScale   = card.followScale   ?? 1;
  const messageScale  = card.messageScale  ?? 1;
  const favoriteScale = card.favoriteScale ?? 1;
  const linksX        = card.linksX        ?? 50;
  const linksY        = card.linksY        ?? 78;
  const linksScale    = card.linksScale    ?? 1;

  // Social hooks — wired from props
  const targetUserId = card.userId ?? ownerUserId;
  const isSelf       = !!(targetUserId && currentUserId && targetUserId === currentUserId);
  const { isFollowing, followerCount, followingCount, follow, unfollow, justFollowed } =
    useFollow(targetUserId ?? "", currentUserId);
  const { isFavorite, addFavorite, removeFavorite, justFavorited } =
    useFavorite(targetUserId ?? "", currentUserId);
  const presenceState = usePresence(isSelf && canInteract ? undefined : targetUserId);
  const { total: totalViews } = useProfileViews(!canInteract ? (targetUserId ?? undefined) : undefined);

  const photoSizeKey   = card.photoSize      ?? "md";
  const photoSizePx    = PHOTO_SIZES[photoSizeKey];
  const nameFontSize   = card.nameFontSize   ?? 18;
  const statusFontSize = card.statusFontSize ?? 10;
  const font           = card.font           ?? "DM Sans";

  const isLight        = luminance(card.bgColor) > 0.5;
  const baseColor      = card.textColor ?? (isLight ? "#0f0f0f" : "#ffffff");
  const primaryColor   = withOpacity(baseColor, 0.95);
  const secondaryColor = withOpacity(baseColor, 0.82);
  const faintColor     = withOpacity(baseColor, 0.65);
  const globalFont     = fontStyle(font);

  // ── Drag elements within card ─────────────────────────────────────────────
  function startElDrag(which: DragTarget, e: React.MouseEvent) {
    if (!menuOpen) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingEl(which);

    const sx =
      which === "photo"    ? photoX    :
      which === "text"     ? textX     :
      which === "stats"    ? statsX    :
      which === "follow"   ? followX   :
      which === "message"  ? messageX  :
      which === "links"    ? linksX    :
                             favoriteX;
    const sy =
      which === "photo"    ? photoY    :
      which === "text"     ? textY     :
      which === "stats"    ? statsY    :
      which === "follow"   ? followY   :
      which === "message"  ? messageY  :
      which === "links"    ? linksY    :
                             favoriteY;
    const mx0 = e.clientX;
    const my0 = e.clientY;

    function onMove(ev: MouseEvent) {
      const r  = innerRef.current?.getBoundingClientRect() ?? rect;
      const nx = Math.max(5, Math.min(95, sx + ((ev.clientX - mx0) / r.width)  * 100));
      const ny = Math.max(5, Math.min(95, sy + ((ev.clientY - my0) / r.height) * 100));
      const patch: Partial<ProfileCardData> =
        which === "photo"    ? { photoX:    nx, photoY:    ny } :
        which === "text"     ? { textX:     nx, textY:     ny } :
        which === "stats"    ? { statsX:    nx, statsY:    ny } :
        which === "follow"   ? { followX:   nx, followY:   ny } :
        which === "message"  ? { messageX:  nx, messageY:  ny } :
        which === "links"    ? { linksX:    nx, linksY:    ny } :
                               { favoriteX: nx, favoriteY: ny };
      updateProfile(card.id, patch);
    }

    function onUp() {
      setDraggingEl(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  // ── Scale photo / text / stats ────────────────────────────────────────────
  function startElResize(which: "photo" | "text" | "stats", e: React.MouseEvent) {
    if (!menuOpen) return;
    e.stopPropagation();
    e.preventDefault();
    const s0  = which === "photo" ? photoScale : which === "text" ? textScale : statsScale;
    const mx0 = e.clientX;
    const my0 = e.clientY;

    function onMove(ev: MouseEvent) {
      const delta = (ev.clientX - mx0 + ev.clientY - my0) / 100;
      const ns    = Math.max(0.3, Math.min(4, s0 + delta));
      const patch: Partial<ProfileCardData> =
        which === "photo" ? { photoScale: ns } :
        which === "text"  ? { textScale:  ns } :
                            { statsScale: ns };
      updateProfile(card.id, patch);
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  // ── Scale social elements ─────────────────────────────────────────────────
  function startScaleDrag(which: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const getScale = () => {
      if (which === "follow")   return followScale;
      if (which === "message")  return messageScale;
      if (which === "favorite") return favoriteScale;
      if (which === "text")     return textScale;
      if (which === "stats")    return statsScale;
      if (which === "links")    return linksScale;
      return 1;
    };
    const startScale = getScale();

    function onMove(ev: MouseEvent) {
      const newScale = Math.max(0.6, Math.min(2.5, startScale + (ev.clientY - startY) * 0.004));
      try {
        if (which === "follow")   updateProfile(card.id, { followScale:   newScale });
        if (which === "message")  updateProfile(card.id, { messageScale:  newScale });
        if (which === "favorite") updateProfile(card.id, { favoriteScale: newScale });
        if (which === "text")     updateProfile(card.id, { textScale:     newScale });
        if (which === "stats")    updateProfile(card.id, { statsScale:    newScale });
        if (which === "links")    updateProfile(card.id, { linksScale:    newScale });
      } catch (err) {
        console.error("scale error", err);
      }
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    updateProfile(card.id, { photo: publicUrl });
    if (photoRef.current) photoRef.current.value = "";
  }

  async function handleBgImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { publicUrl: src } = await uploadToStorage(f);
    const bgMode = await detectBgMode(src);
    updateProfile(card.id, { bgImage: src, bgColor: "", bgMode });
    if (bgImgRef.current) bgImgRef.current.value = "";
  }

  const btnBase: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: withOpacity(baseColor, 0.08),
    fontFamily: globalFont, fontSize: 12, fontWeight: 600,
    letterSpacing: "1px",
    cursor: "pointer", whiteSpace: "nowrap",
    transition: `background 0.12s ${EASE}, color 0.12s ${EASE}, transform 0.12s ${EASE}, opacity 0.12s ${EASE}`,
  };

  // Visual helpers
  const dragScale  = (t: DragTarget, base: number) => base * (draggingEl === t ? 1.02 : 1);
  const dragFilter = (t: DragTarget) => draggingEl === t ? "drop-shadow(0 0 10px rgba(255,255,255,0.15))" : "none";
  const dragCursor = (t: DragTarget, disabled?: boolean): React.CSSProperties["cursor"] =>
    draggingEl === t ? "grabbing" : menuOpen ? "grab" : disabled ? "not-allowed" : "default";
  const dashBorder = (t: DragTarget) =>
    `1px dashed rgba(255,255,255,${draggingEl === t ? 0.52 : 0.22})`;

  return (
    <>
      {/* Global micro-interaction styles — always active */}
      <style>{`
        .pcfg-btn:active { transform: scale(0.96) !important; transition-duration: 0.06s !important; }
        @keyframes pcfg-star {
          0%   { transform: scale(1) translateY(0); }
          45%  { transform: scale(1.28) translateY(-2px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes nowPlaying {
          0%, 100% { opacity: 0.32; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.2); }
        }
      `}</style>

      <div
        ref={cardRef}
        onMouseDown={menuOpen ? e => e.stopPropagation() : onMouseDown}
        onClick={onClick}
        style={{
          position:   "absolute",
          left:       card.x,
          top:        card.y,
          width:      card.w,
          height:     card.h,
          zIndex:     card.zIndex + card.layer * 100,
          transform:  `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform",
          userSelect: "none",
          cursor:     draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
        }}
      >
        {/* ── Background ── */}
        <div style={{
          position:             "absolute",
          inset:                0,
          borderRadius:         card.borderRadius,
          ...(card.bgImage
            ? bgImageStyle(card.bgImage, card.bgMode)
            : { background: card.bgColor || "rgba(255,255,255,0.055)" }),
          backdropFilter:       card.bgColor || card.bgImage ? "none" : "blur(20px)",
          WebkitBackdropFilter: card.bgColor || card.bgImage ? "none" : "blur(20px)",
          border:               isSel
            ? `1px solid ${isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.22)"}`
            : `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)"}`,
          boxShadow:            "0 8px 32px rgba(0,0,0,0.25)",
          opacity:              card.opacity * (menuOpen ? 0.96 : 1),
          transition:           `opacity 0.2s ${EASE}`,
        }} />

        {/* ── Content area — free positioning ── */}
        <div
          ref={innerRef}
          style={{ position: "absolute", inset: 0, borderRadius: card.borderRadius, overflow: "hidden" }}
        >
          {card.bgImage && (
            <div style={{
              position: "absolute", inset: 0,
              background: isLight
                ? "linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0.42))"
                : "linear-gradient(to bottom, rgba(0,0,0,0.22), rgba(0,0,0,0.52))",
              pointerEvents: "none",
            }} />
          )}

          {/* ── Photo ── */}
          <div
            onMouseDown={e => startElDrag("photo", e)}
            style={{
              position:      "absolute",
              left:          `${photoX}%`,
              top:           `${photoY}%`,
              transform:     `translate(-50%, -50%) scale(${dragScale("photo", photoScale)})`,
              cursor:        dragCursor("photo"),
              pointerEvents: menuOpen ? "auto" : "none",
              filter:        dragFilter("photo"),
              transition:    `filter 0.12s ${EASE}, transform 0.12s ${EASE}`,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: dashBorder("photo"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startElResize("photo", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "nwse-resize", zIndex: 10,
                }}
              />
            )}
            <div style={{
              width: photoSizePx, height: photoSizePx, borderRadius: "50%", overflow: "hidden",
              border: `2px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)"}`,
              background: "rgba(255,255,255,0.08)",
            }}>
              {card.photo ? (
                <img src={card.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* ── Text block ── */}
          <div
            onMouseDown={e => startElDrag("text", e)}
            style={{
              position:      "absolute",
              left:          `${textX}%`,
              top:           `${textY}%`,
              transform:     `translate(-50%, -50%) scale(${dragScale("text", textScale)})`,
              cursor:        dragCursor("text"),
              pointerEvents: menuOpen ? "auto" : "none",
              textAlign:     "center",
              whiteSpace:    "nowrap",
              filter:        dragFilter("text"),
              transition:    `filter 0.12s ${EASE}, transform 0.12s ${EASE}`,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: "-6px -12px", borderRadius: 7,
                border: dashBorder("text"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startElResize("text", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "nwse-resize", zIndex: 10,
                }}
              />
            )}
            <div style={{
              fontFamily: globalFont, fontSize: nameFontSize,
              fontWeight: 700, color: primaryColor, lineHeight: 1.2,
            }}>
              {card.name || (menuOpen ? "nombre" : "")}
            </div>

            {(card.status || menuOpen) && (
              <div style={{
                fontFamily: globalFont, fontSize: statusFontSize,
                fontWeight: 500, color: secondaryColor, marginTop: 4,
              }}>
                {card.status || (menuOpen ? "estado" : "")}
              </div>
            )}

            {(card.handle || menuOpen) && (
              <div style={{
                fontFamily: globalFont, fontSize: 9,
                color: faintColor, marginTop: 5,
              }}>
                {card.handle ? `@${card.handle}` : (menuOpen ? "@handle" : "")}
              </div>
            )}

            {card.bio && (
              <div style={{
                fontFamily: MONO,
                fontSize:   7.5,
                color:      withOpacity(baseColor, 0.42),
                marginTop:  5,
                maxWidth:   "110px",
                whiteSpace: "normal" as React.CSSProperties["whiteSpace"],
                lineHeight: 1.55,
                textAlign:  "center" as React.CSSProperties["textAlign"],
                wordBreak:  "break-word" as React.CSSProperties["wordBreak"],
              }}>
                {card.bio}
              </div>
            )}


          </div>

          {/* ── Links block ── */}
          {(card.links ?? []).length > 0 && (
            <div
              onMouseDown={e => startElDrag("links", e)}
              style={{
                position:      "absolute",
                left:          `${linksX}%`,
                top:           `${linksY}%`,
                transform:     `translate(-50%, -50%) scale(${dragScale("links", linksScale)})`,
                cursor:        dragCursor("links"),
                pointerEvents: "auto",
                filter:        dragFilter("links"),
                transition:    `filter 0.12s ${EASE}, transform 0.12s ${EASE}`,
                display:       "flex",
                flexDirection: "column",
                gap:           5,
                alignItems:    "center",
                zIndex:        5,
              }}
            >
              {menuOpen && (
                <div style={{
                  position: "absolute", inset: "-6px -8px", borderRadius: 8,
                  border: dashBorder("links"), pointerEvents: "none",
                  transition: "border-color 0.12s",
                }} />
              )}
              {menuOpen && (
                <div
                  onMouseDown={e => startScaleDrag("links", e)}
                  style={{
                    position: "absolute", bottom: -6, right: -6,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "rgba(255,255,255,0.7)",
                    cursor: "ns-resize", zIndex: 10,
                  }}
                />
              )}
              {(card.links ?? []).map(link => (
                <LinkButton key={link.id} link={link} baseColor={baseColor} globalFont={globalFont} />
              ))}
            </div>
          )}

          {/* ── Stats block ── */}
          <div
            onMouseDown={e => startElDrag("stats", e)}
            style={{
              position:      "absolute",
              left:          `${statsX}%`,
              top:           `${statsY}%`,
              transform:     `translate(-50%, -50%) scale(${dragScale("stats", statsScale)})`,
              cursor:        dragCursor("stats"),
              pointerEvents: menuOpen ? "auto" : (!canInteract ? "auto" : "none"),
              fontFamily:    globalFont, fontSize: 11,
              color:         primaryColor, opacity: 0.8,
              textAlign:     "center", whiteSpace: "nowrap",
              filter:        dragFilter("stats"),
              transition:    `filter 0.12s ${EASE}, transform 0.12s ${EASE}`,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: "-4px -10px", borderRadius: 6,
                border: dashBorder("stats"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startElResize("stats", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "nwse-resize", zIndex: 10,
                }}
              />
            )}
            {!canInteract ? (
              <>
                <StatChip
                  label={`${followerCount} seg`}
                  onClick={e => { e.stopPropagation(); onOpenSocialPanel?.("followers"); }}
                  color={faintColor}
                />
                <span style={{ opacity: 0.4 }}> · </span>
                <StatChip
                  label={`${followingCount} sig`}
                  onClick={e => { e.stopPropagation(); onOpenSocialPanel?.("following"); }}
                  color={faintColor}
                />
                {totalViews > 0 && (
                  <>
                    <span style={{ opacity: 0.4 }}> · </span>
                    <span style={{ color: withOpacity(baseColor, 0.45), fontSize: 10 }}>{totalViews} views</span>
                  </>
                )}
              </>
            ) : (
              <>{followerCount} seg · {followingCount} sig</>
            )}
          </div>

          {/* ── Follow button ── */}
          {(canInteract || (authResolved && !isSelf)) && (
          <div
            onMouseDown={e => startElDrag("follow", e)}
            style={{
              position:      "absolute",
              left:          `${followX}%`,
              top:           `${followY}%`,
              transform:     `translate(-50%, -50%) scale(${dragScale("follow", followScale)})`,
              cursor:        dragCursor("follow"),
              pointerEvents: menuOpen ? "auto" : (canInteract ? "none" : "auto"),
              filter:        dragFilter("follow"),
              transition:    `filter 0.12s ${EASE}`,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: "-4px -6px", borderRadius: 8,
                border: dashBorder("follow"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startScaleDrag("follow", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "ns-resize", zIndex: 10,
                }}
              />
            )}
            <button
              className="pcfg-btn"
              onMouseDown={e => menuOpen ? startElDrag("follow", e) : e.stopPropagation()}
              onClick={e => { e.stopPropagation(); if (canInteract || isSelf || menuOpen) return; isFollowing ? unfollow() : follow(); }}
              onMouseEnter={() => setFollowHover(true)}
              onMouseLeave={() => setFollowHover(false)}
              style={{
                ...btnBase,
                color:      justFollowed
                  ? "rgba(212,240,196,1)"
                  : isFollowing
                  ? "rgba(212,240,196,0.95)"
                  : (followHover ? primaryColor : withOpacity(baseColor, 0.7)),
                background: justFollowed
                  ? "rgba(212,240,196,0.22)"
                  : isFollowing
                  ? "rgba(212,240,196,0.14)"
                  : (followHover ? withOpacity(baseColor, 0.14) : withOpacity(baseColor, 0.07)),
                outline:    isFollowing ? "1px solid rgba(212,240,196,0.28)" : "none",
                transform:  followHover ? "translateY(-1px) scale(1.04)" : "translateY(0) scale(1)",
                letterSpacing: "1.5px",
                transition: "color 0.15s ease, background 0.15s ease",
              }}
            >
              {justFollowed ? "FOLLOWED ✓" : isFollowing ? (followHover ? "UNFOLLOW" : "FOLLOWING") : "FOLLOW"}
            </button>
          </div>
          )}

          {/* ── Message button ── */}
          {(canInteract || (authResolved && !isSelf)) && (
          <div
            onMouseDown={e => startElDrag("message", e)}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              if (!menuOpen && onMessage && card.handle) {
                onMessage(card.handle);
              }
            }}
            onMouseEnter={() => setMsgHover(true)}
            onMouseLeave={() => setMsgHover(false)}
            style={{
              position:       "absolute",
              left:           `${messageX}%`,
              top:            `${messageY}%`,
              transform:      `translate(-50%, -50%) scale(${dragScale("message", messageScale)})`,
              display:        "inline-flex",
              alignItems:     "center",
              justifyContent: "center",
              padding:        "8px 12px",
              borderRadius:   8,
              background:     withOpacity(baseColor, 0.08),
              cursor:         draggingEl === "message" ? "grabbing" : menuOpen ? "grab" : !canInteract ? "pointer" : "default",
              pointerEvents:  "auto",
              userSelect:     "none",
              filter:         dragFilter("message"),
              transition:     `filter 0.12s ${EASE}`,
              opacity:        menuOpen ? 1 : 0.45,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: "-4px -6px", borderRadius: 8,
                border: dashBorder("message"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startScaleDrag("message", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "ns-resize", zIndex: 10,
                }}
              />
            )}
            <span style={{
              pointerEvents: "none", fontFamily: globalFont,
              fontSize: 13, fontWeight: 600, letterSpacing: "1px",
              color: secondaryColor,
              display: "inline-block",
              transform: msgHover ? "translateY(-1px) scale(1.05)" : "translateY(0) scale(1)",
              transition: `transform 0.12s ${EASE}`,
            }}>
              MENSAJE
            </span>
          </div>
          )}

          {/* ── Presence label ── */}
          {!(isSelf && canInteract) && presenceState !== "OFFLINE" && (
            <div style={{
              position:      "absolute",
              bottom:        9,
              left:          10,
              fontFamily:    MONO,
              fontSize:      6.5,
              letterSpacing: 2,
              textTransform: "uppercase" as React.CSSProperties["textTransform"],
              color:         presenceLabelColor(presenceState, baseColor),
              userSelect:    "none",
              pointerEvents: "none",
              whiteSpace:    "nowrap",
            }}>
              {presenceState}
            </div>
          )}

          {/* ── Favorite button ── */}
          {(canInteract || (authResolved && !isSelf)) && (
          <div
            onMouseDown={e => startElDrag("favorite", e)}
            style={{
              position:      "absolute",
              left:          `${favoriteX}%`,
              top:           `${favoriteY}%`,
              transform:     `translate(-50%, -50%) scale(${dragScale("favorite", favoriteScale)})`,
              cursor:        dragCursor("favorite"),
              pointerEvents: menuOpen ? "auto" : (canInteract ? "none" : "auto"),
              filter:        dragFilter("favorite"),
              transition:    `filter 0.12s ${EASE}`,
            }}
          >
            {menuOpen && (
              <div style={{
                position: "absolute", inset: "-4px -6px", borderRadius: 8,
                border: dashBorder("favorite"), pointerEvents: "none",
                transition: "border-color 0.12s",
              }} />
            )}
            {menuOpen && (
              <div
                onMouseDown={e => startScaleDrag("favorite", e)}
                style={{
                  position: "absolute", bottom: -4, right: -4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  cursor: "ns-resize", zIndex: 10,
                }}
              />
            )}
            <button
              className="pcfg-btn"
              onMouseDown={e => menuOpen ? startElDrag("favorite", e) : e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (canInteract || isSelf || menuOpen) return;
                if (favTimerRef.current) clearTimeout(favTimerRef.current);
                setFavAnimating(true);
                favTimerRef.current = setTimeout(() => setFavAnimating(false), 240);
                isFavorite ? removeFavorite() : addFavorite();
              }}
              onMouseEnter={() => setFavHover(true)}
              onMouseLeave={() => setFavHover(false)}
              style={{
                ...btnBase,
                fontSize:   17,
                fontWeight: 400,
                padding:    "4px 8px",
                color:      isFavorite ? primaryColor : (favHover ? primaryColor : secondaryColor),
                background: isFavorite ? withOpacity(baseColor, 0.12) : (favHover ? withOpacity(baseColor, 0.1) : withOpacity(baseColor, 0.05)),
                filter:     justFavorited
                  ? `drop-shadow(0 0 10px ${withOpacity(baseColor, 0.7)})`
                  : isFavorite ? `drop-shadow(0 0 5px ${withOpacity(baseColor, 0.35)})` : "none",
                transform:  !favAnimating ? (favHover ? "translateY(-1px) scale(1.1)" : "translateY(0) scale(1)") : undefined,
                animation:  favAnimating ? `pcfg-star 0.22s ${EASE} both` : undefined,
                transition: `${btnBase.transition ?? ""}, filter 0.2s ease`,
              }}
            >
              ★
            </button>
          </div>
          )}
        </div>

        {/* ── Gear handle ── */}
        {isSel && canInteract && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const next = !menuOpen;
              setMenuOpen(next);
              if (!next) setEditingField(null);
            }}
            style={{
              position:   "absolute", top: -10, left: -10,
              width: 20, height: 20, borderRadius: "50%",
              background: menuOpen ? "rgba(212,240,196,0.12)" : "rgba(12,12,14,0.96)",
              border:     menuOpen ? "1px solid rgba(212,240,196,0.32)" : "1px solid rgba(255,255,255,0.1)",
              cursor:     "pointer", zIndex: 20,
              display:    "flex", alignItems: "center", justifyContent: "center",
              boxShadow:  "0 2px 8px rgba(0,0,0,0.4)",
              transition: `all 0.12s ${EASE}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform  = "scale(1.12)";
              e.currentTarget.style.boxShadow  = "0 3px 12px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform  = "scale(1)";
              e.currentTarget.style.boxShadow  = "0 2px 8px rgba(0,0,0,0.4)";
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke={menuOpen ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.55)"}
              strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        )}

        {/* ── Lock toggle ── */}
        {isSel && canInteract && onToggleLock && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggleLock(); }}
            style={{
              position: "absolute", top: -22, right: 0,
              width: 16, height: 16, borderRadius: 4, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)",
              border: locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)",
              color: locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)",
              zIndex: 20,
              transition: `all 0.12s ${EASE}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {locked ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            )}
          </div>
        )}

        {/* ── Rotate handle ── */}
        {isSel && canInteract && !locked && (
          <div
            onMouseDown={e => { e.stopPropagation(); onRotateMD(e); }}
            style={{
              position: "absolute", top: -10, right: -10,
              width: 20, height: 20, borderRadius: "50%",
              background: "rgba(12,12,14,0.96)", border: "1px solid rgba(255,255,255,0.1)",
              cursor: "crosshair", zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              transition: `all 0.12s ${EASE}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(212,240,196,0.4)";
              e.currentTarget.style.background  = "rgba(212,240,196,0.08)";
              e.currentTarget.style.transform   = "scale(1.12)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.background  = "rgba(12,12,14,0.96)";
              e.currentTarget.style.transform   = "scale(1)";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
          </div>
        )}

        {/* ── Resize handle ── */}
        {isSel && canInteract && !locked && (
          <div
            onMouseDown={e => { e.stopPropagation(); onResizeMD(e); }}
            style={{
              position: "absolute", bottom: -5, right: -5,
              width: 10, height: 10, borderRadius: "50%",
              background: isLight ? "rgba(20,20,20,0.5)" : "rgba(255,255,255,0.65)",
              cursor: "nwse-resize", border: "1.5px solid rgba(0,0,0,0.2)", zIndex: 10,
              transition: `transform 0.1s ${EASE}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          />
        )}

        {/* ────────────────────────────────────────────────────────────────
            CONFIG MENU
        ──────────────────────────────────────────────────────────────── */}
        {/* style must live outside the conditional — inline <style> inside
            a toggle causes React insertBefore crashes when the browser
            moves the <style> node, breaking fiber-to-DOM tracking */}
        <style>{`
          .pcfg::-webkit-scrollbar { width: 4px; }
          .pcfg::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
          .pcfg::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
          .pcfg::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
          .pcfg-inline { background: transparent; border: none; outline: none; }
          @keyframes pcfg-in {
            from { opacity: 0; transform: translateX(6px) scale(0.98); }
            to   { opacity: 1; transform: translateX(0) scale(1); }
          }
          .pcfg { animation: pcfg-in 0.14s cubic-bezier(0.2,0.8,0.2,1) both; }
          @keyframes pcfg-up {
            from { opacity: 0; transform: translateY(5px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .pcfg-s { animation: pcfg-up 0.18s cubic-bezier(0.2,0.8,0.2,1) both; }
          .pcfg-s1 { animation-delay: 0ms; }
          .pcfg-s2 { animation-delay: 40ms; }
          .pcfg-s3 { animation-delay: 72ms; }
          .pcfg-s4 { animation-delay: 104ms; }
          .pcfg button:active { transform: scale(0.95) !important; transition-duration: 0.06s !important; }
        `}</style>

        {menuOpen && canInteract && (
            <div
              className="pcfg"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              style={{
                position:      "absolute",
                top:           0,
                left:          card.w + 12,
                width:         252,
                background:    "#09090b",
                border:        "1px solid rgba(255,255,255,0.1)",
                borderRadius:  5,
                padding:       "20px 16px 24px",
                zIndex:        50,
                boxShadow:     "0 2px 20px rgba(0,0,0,0.5)",
                fontFamily:    SANS,
                display:       "flex",
                flexDirection: "column",
                maxHeight:     "86vh",
                overflowY:     "auto",
                scrollbarWidth:  "thin" as React.CSSProperties["scrollbarWidth"],
                scrollbarColor:  "rgba(255,255,255,0.1) rgba(255,255,255,0.02)",
              } as React.CSSProperties}
            >

              {/* ════════════════ FOTO ════════════════ */}
              <div className="pcfg-s pcfg-s1">
                <PanelLabel>foto</PanelLabel>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    onClick={() => photoRef.current?.click()}
                    title="cambiar foto"
                    style={{
                      width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                      overflow: "hidden", cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      transition: `transform 0.12s ${EASE}, border-color 0.12s`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform    = "scale(1.06)";
                      (e.currentTarget as HTMLDivElement).style.borderColor  = "rgba(255,255,255,0.22)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform    = "scale(1)";
                      (e.currentTarget as HTMLDivElement).style.borderColor  = "rgba(255,255,255,0.1)";
                    }}
                  >
                    {card.photo
                      ? <img src={card.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
                            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                          </svg>
                        </div>
                    }
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 3 }}>
                    <UIButton onClick={() => photoRef.current?.click()}>upload</UIButton>
                    {card.photo && (
                      <UIButton onClick={() => updateProfile(card.id, { photo: "" })} danger>remove</UIButton>
                    )}
                  </div>
                </div>
              </div>

              <Div />

              {/* ════════════════ IDENTIDAD ════════════════ */}
              <div className="pcfg-s pcfg-s2">
                <PanelLabel>identidad</PanelLabel>

                {editingField === "name" ? (
                  <input
                    autoFocus
                    className="pcfg-inline"
                    value={card.name}
                    onChange={e => updateProfile(card.id, { name: e.target.value })}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={e => e.key === "Enter" && setEditingField(null)}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder="nombre"
                    style={{
                      width:         "100%",
                      color:         "rgba(255,255,255,0.92)",
                      fontSize:      22,
                      fontWeight:    700,
                      fontFamily:    globalFont,
                      letterSpacing: "-0.4px",
                      lineHeight:    1.15,
                      padding:       "0 0 4px",
                      borderBottom:  "1px solid rgba(255,255,255,0.22)",
                      boxSizing:     "border-box",
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("name")}
                    title="click to edit"
                    style={{
                      fontSize:      22,
                      fontWeight:    700,
                      fontFamily:    globalFont,
                      letterSpacing: "-0.4px",
                      lineHeight:    1.15,
                      color:         card.name ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.15)",
                      cursor:        "text",
                      paddingBottom: 4,
                      transition:    `opacity 0.1s ${EASE}`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0.75"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                  >
                    {card.name || "nombre"}
                  </div>
                )}

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "8px 0 10px" }} />

                {editingField === "status" ? (
                  <input
                    autoFocus
                    className="pcfg-inline"
                    value={card.status}
                    onChange={e => updateProfile(card.id, { status: e.target.value })}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={e => e.key === "Enter" && setEditingField(null)}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder="estado..."
                    style={{
                      width:        "100%",
                      color:        "rgba(255,255,255,0.55)",
                      fontSize:     12,
                      fontFamily:   globalFont,
                      padding:      "0 0 3px",
                      borderBottom: "1px solid rgba(255,255,255,0.15)",
                      boxSizing:    "border-box",
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("status")}
                    title="click to edit"
                    style={{
                      fontSize:   12,
                      fontFamily: SANS,
                      color:      card.status ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.15)",
                      cursor:     "text",
                      transition: `opacity 0.1s ${EASE}`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0.7"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                  >
                    {card.status ? `status: ${card.status}` : "status: —"}
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={MICRO}>font</span>
                    <select
                      value={font}
                      onChange={e => updateProfile(card.id, { font: e.target.value as TextFont })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        background: "transparent", border: "none", outline: "none",
                        color: "rgba(255,255,255,0.45)", fontSize: 11,
                        fontFamily: SANS, cursor: "pointer",
                      }}
                    >
                      {FONTS.map(f => (
                        <option key={f.key} value={f.key} style={{ background: "#09090b" }}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={MICRO}>color</span>
                    <div style={{
                      width: 20, height: 20, borderRadius: 2,
                      overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0,
                      transition: `transform 0.12s ${EASE}`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.12)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                    >
                      <input
                        type="color"
                        value={card.textColor ?? "#ffffff"}
                        onChange={e => updateProfile(card.id, { textColor: e.target.value })}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ width: "140%", height: "140%", transform: "translate(-14%,-14%)", border: "none", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <span style={MICRO}>bio</span>
                  <textarea
                    value={card.bio ?? ""}
                    onChange={e => updateProfile(card.id, { bio: e.target.value })}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder="short bio..."
                    maxLength={120}
                    rows={2}
                    style={{
                      display:       "block",
                      width:         "100%",
                      marginTop:     6,
                      background:    "rgba(255,255,255,0.03)",
                      border:        "1px solid rgba(255,255,255,0.09)",
                      borderRadius:  3,
                      padding:       "6px 8px",
                      color:         "rgba(255,255,255,0.52)",
                      fontFamily:    MONO,
                      fontSize:      9,
                      letterSpacing: 0.3,
                      resize:        "none" as React.CSSProperties["resize"],
                      outline:       "none",
                      lineHeight:    1.55,
                      boxSizing:     "border-box" as React.CSSProperties["boxSizing"],
                    }}
                  />
                </div>

              </div>

              <Div />

              {/* ════════════════ LINKS ════════════════ */}
              <div className="pcfg-s pcfg-s3">
                <PanelLabel>links</PanelLabel>

                {/* Existing links — inline editable */}
                {(card.links ?? []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {(card.links ?? []).map((link, idx) => (
                      <div key={link.id} style={{
                        background:   "rgba(255,255,255,0.03)",
                        border:       "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 4,
                        padding:      "8px 9px 7px",
                      }}>
                        {/* Row 1: icon + label + delete */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                          <input
                            value={link.icon ?? ""}
                            onChange={e => {
                              const updated = (card.links ?? []).map((l, i) => i === idx ? { ...l, icon: e.target.value } : l);
                              updateProfile(card.id, { links: updated });
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="🔗"
                            maxLength={2}
                            style={{
                              width:      28, flexShrink: 0,
                              background: "rgba(255,255,255,0.05)",
                              border:     "1px solid rgba(255,255,255,0.09)",
                              borderRadius: 3, padding: "3px 4px",
                              color: "rgba(255,255,255,0.8)", fontSize: 12,
                              textAlign: "center", outline: "none",
                              fontFamily: SANS,
                            }}
                          />
                          <input
                            value={link.label}
                            onChange={e => {
                              const updated = (card.links ?? []).map((l, i) => i === idx ? { ...l, label: e.target.value } : l);
                              updateProfile(card.id, { links: updated });
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="label..."
                            style={{
                              flex:          1,
                              background:    "transparent",
                              border:        "none",
                              borderBottom:  "1px solid rgba(255,255,255,0.1)",
                              outline:       "none",
                              color:         "rgba(255,255,255,0.75)",
                              fontFamily:    MONO,
                              fontSize:      9,
                              letterSpacing: 1,
                              textTransform: "uppercase" as const,
                              padding:       "2px 0 3px",
                            }}
                          />
                          <button
                            onClick={() => {
                              const updated = (card.links ?? []).filter((_, i) => i !== idx);
                              updateProfile(card.id, { links: updated });
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                              background: "transparent", border: "none",
                              color: "rgba(255,255,255,0.2)", fontSize: 14,
                              cursor: "pointer", flexShrink: 0,
                              lineHeight: 1, padding: "0 2px",
                              transition: `color 0.1s ${EASE}`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "rgba(220,80,60,0.85)"}
                            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                          >×</button>
                        </div>
                        {/* Row 2: URL */}
                        <input
                          value={link.url}
                          onChange={e => {
                            const updated = (card.links ?? []).map((l, i) => i === idx ? { ...l, url: e.target.value } : l);
                            updateProfile(card.id, { links: updated });
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          placeholder="https://..."
                          type="url"
                          style={{
                            width:         "100%",
                            background:    "rgba(255,255,255,0.03)",
                            border:        "1px solid rgba(255,255,255,0.07)",
                            borderRadius:  3,
                            padding:       "4px 7px",
                            color:         "rgba(255,255,255,0.38)",
                            fontFamily:    MONO,
                            fontSize:      8,
                            letterSpacing: 0.3,
                            outline:       "none",
                            boxSizing:     "border-box" as const,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add link button */}
                {(card.links ?? []).length < 5 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <input
                        value={newLinkLabel}
                        onChange={e => setNewLinkLabel(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder="label..."
                        style={{
                          flex:          1,
                          background:    "rgba(255,255,255,0.04)",
                          border:        "1px solid rgba(255,255,255,0.09)",
                          borderRadius:  3,
                          padding:       "5px 8px",
                          color:         "rgba(255,255,255,0.55)",
                          fontFamily:    MONO,
                          fontSize:      9,
                          outline:       "none",
                          letterSpacing: 0.5,
                          textTransform: "uppercase" as const,
                        }}
                      />
                      <input
                        value={newLinkIcon}
                        onChange={e => setNewLinkIcon(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder="🔗"
                        maxLength={2}
                        style={{
                          width:      34, flexShrink: 0,
                          background: "rgba(255,255,255,0.04)",
                          border:     "1px solid rgba(255,255,255,0.09)",
                          borderRadius: 3, padding: "5px 4px",
                          color: "rgba(255,255,255,0.7)", fontSize: 12,
                          textAlign: "center", outline: "none",
                          fontFamily: SANS,
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <input
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newLinkUrl.trim()) {
                            updateProfile(card.id, {
                              links: [...(card.links ?? []), {
                                id: crypto.randomUUID(),
                                url: newLinkUrl.trim(),
                                label: newLinkLabel.trim(),
                                icon: newLinkIcon.trim() || undefined,
                              }],
                            });
                            setNewLinkUrl(""); setNewLinkLabel(""); setNewLinkIcon("");
                          }
                        }}
                        placeholder="https://..."
                        type="url"
                        style={{
                          flex:          1,
                          background:    "rgba(255,255,255,0.04)",
                          border:        "1px solid rgba(255,255,255,0.09)",
                          borderRadius:  3,
                          padding:       "5px 8px",
                          color:         "rgba(255,255,255,0.55)",
                          fontFamily:    MONO,
                          fontSize:      9,
                          outline:       "none",
                          letterSpacing: 0.3,
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!newLinkUrl.trim()) return;
                          updateProfile(card.id, {
                            links: [...(card.links ?? []), {
                              id: crypto.randomUUID(),
                              url: newLinkUrl.trim(),
                              label: newLinkLabel.trim(),
                              icon: newLinkIcon.trim() || undefined,
                            }],
                          });
                          setNewLinkUrl(""); setNewLinkLabel(""); setNewLinkIcon("");
                        }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          background:    "rgba(255,255,255,0.05)",
                          border:        "1px solid rgba(255,255,255,0.09)",
                          borderRadius:  3,
                          color:         "rgba(255,255,255,0.45)",
                          fontFamily:    MONO,
                          fontSize:      8,
                          letterSpacing: 1,
                          cursor:        "pointer",
                          padding:       "5px 10px",
                          flexShrink:    0,
                          textTransform: "uppercase" as const,
                          transition:    `all 0.1s ${EASE}`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                      >+ add</button>
                    </div>
                  </div>
                )}
              </div>

              <Div />

              {/* ════════════════ ESTILO ════════════════ */}
              <div className="pcfg-s pcfg-s3">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <PanelLabel inline>estilo</PanelLabel>
                  {(card.bgColor || card.bgImage) && (
                    <button
                      onClick={() => updateProfile(card.id, { bgColor: "", bgImage: "" })}
                      style={{
                        background: "transparent", border: "none", padding: 0,
                        color: "rgba(255,255,255,0.22)", fontSize: 9,
                        fontFamily: MONO, letterSpacing: 1, textTransform: "uppercase",
                        cursor: "pointer", transition: `color 0.1s ${EASE}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.22)"}
                    >
                      clear
                    </button>
                  )}
                </div>

                <div
                  style={{
                    position: "relative", height: 34, borderRadius: 4,
                    overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer", marginBottom: 10,
                    transition: `border-color 0.12s ${EASE}`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  {!card.bgColor && !card.bgImage && (
                    <div style={{
                      position: "absolute", inset: 0,
                      backgroundColor: "rgba(255,255,255,0.02)",
                      backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 9px)",
                    }} />
                  )}
                  {(card.bgColor || card.bgImage) && (
                    <div style={{
                      position: "absolute", inset: 0,
                      ...(card.bgImage ? bgImageStyle(card.bgImage, card.bgMode) : { background: card.bgColor }),
                    }} />
                  )}
                  <input
                    type="color"
                    value={card.bgColor?.startsWith("#") ? card.bgColor : "#141416"}
                    onChange={e => updateProfile(card.id, { bgColor: e.target.value, bgImage: "" })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ flex: 1 }}><UIButton onClick={() => bgImgRef.current?.click()} full>image</UIButton></div>
                  {card.bgImage && (
                    <div style={{ flex: 1 }}><UIButton onClick={() => updateProfile(card.id, { bgImage: "" })} danger full>remove</UIButton></div>
                  )}
                </div>
              </div>

              <Div />

              {/* ════════════════ DISEÑO ════════════════ */}
              <div className="pcfg-s pcfg-s4">
                <PanelLabel>diseño</PanelLabel>

                <UISlider
                  label="opacity"
                  value={Math.round(card.opacity * 100)}
                  unit="%"
                  min={10} max={100}
                  onChange={v => updateProfile(card.id, { opacity: v / 100 })}
                  onMouseDown={e => e.stopPropagation()}
                />

                <div style={{ marginTop: 20 }}>
                  <UISlider
                    label="radius"
                    value={card.borderRadius}
                    unit="px"
                    min={0} max={60}
                    onChange={v => updateProfile(card.id, { borderRadius: v })}
                    onMouseDown={e => e.stopPropagation()}
                  />
                </div>
              </div>

            </div>
        )}
      </div>

      <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
      <input ref={bgImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgImgUpload} />
    </>
  );
}

// ── Music helpers ─────────────────────────────────────────────────────────────

function musicLabel(url: string): string {
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const { hostname, pathname } = new URL(full);
    const service = hostname.replace(/^(www|open)\./i, "").split(".")[0].toUpperCase();
    const slug    = pathname.split("/").filter(Boolean).pop() ?? "";
    return slug ? `${service} · ${slug.slice(0, 18)}` : service;
  } catch {
    return url.slice(0, 22);
  }
}

function NowPlaying({ url, baseColor }: { url: string; baseColor: string }) {
  const [hov, setHov] = useState(false);
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        marginTop:      6,
        display:        "flex",
        alignItems:     "center",
        gap:            6,
        paddingTop:     5,
        borderTop:      `1px solid ${withOpacity(baseColor, 0.09)}`,
        pointerEvents:  "auto" as React.CSSProperties["pointerEvents"],
        textDecoration: "none",
        cursor:         "pointer",
        opacity:        hov ? 1 : 0.82,
        transition:     "opacity 0.1s ease",
      }}
    >
      <div style={{
        width:        4,
        height:       4,
        borderRadius: "50%",
        background:   withOpacity(baseColor, hov ? 0.85 : 0.6),
        animation:    "nowPlaying 1.8s ease-in-out infinite",
        flexShrink:   0,
        transition:   "background 0.1s ease",
      }} />
      <div style={{ overflow: "hidden", minWidth: 0 }}>
        <div style={{
          fontFamily:    MONO,
          fontSize:      6,
          letterSpacing: 2,
          color:         withOpacity(baseColor, hov ? 0.55 : 0.35),
          textTransform: "uppercase" as React.CSSProperties["textTransform"],
          lineHeight:    1,
          marginBottom:  2,
          transition:    "color 0.1s ease",
        }}>
          NOW PLAYING
        </div>
        <div style={{
          fontFamily:    MONO,
          fontSize:      7,
          letterSpacing: 0.5,
          color:         withOpacity(baseColor, hov ? 0.75 : 0.52),
          whiteSpace:    "nowrap",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
          maxWidth:      "100px",
          transition:    "color 0.1s ease",
        }}>
          {musicLabel(url)}
        </div>
      </div>
    </a>
  );
}

// ── StatChip ──────────────────────────────────────────────────────────────────

function StatChip({ label, onClick, color }: { label: string; onClick: (e: React.MouseEvent) => void; color: string }) {
  const [hov, setHov] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        cursor:        "pointer",
        borderBottom:  `1px solid ${hov ? color : "transparent"}`,
        transition:    "border-color 0.1s ease",
        paddingBottom: 1,
        display:       "inline",
      }}
    >
      {label}
    </span>
  );
}

// ── Presence helpers ──────────────────────────────────────────────────────────

function presenceLabelColor(state: PresenceState, baseColor: string): string {
  const a =
    state === "ACTIVE NOW"    ? 0.55 :
    state === "EDITING SPACE" ? 0.48 :
    /* AWAY */                  0.22;
  return withOpacity(baseColor, a);
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const MICRO: React.CSSProperties = {
  fontFamily:    MONO,
  fontSize:      8,
  letterSpacing: 2,
  color:         "rgba(255,255,255,0.22)",
  textTransform: "uppercase",
  flexShrink:    0,
  userSelect:    "none",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div style={{
      fontFamily:    MONO,
      fontSize:      9,
      letterSpacing: 2,
      color:         "rgba(255,255,255,0.25)",
      textTransform: "uppercase",
      marginBottom:  inline ? 0 : 14,
      userSelect:    "none",
    }}>
      {children}
    </div>
  );
}

function Div() {
  return (
    <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "22px 0" }} />
  );
}

// ── LinkButton ────────────────────────────────────────────────────────────────

function LinkButton({ link, baseColor, globalFont }: {
  link: import("@/types").ProfileLink;
  baseColor: string;
  globalFont: string;
}) {
  const [hov, setHov] = useState(false);
  const safeUrl =
    !link.url ? null :
    link.url.startsWith("http") ? link.url : `https://${link.url}`;
  if (!link.label && !safeUrl) return null;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={e => { e.stopPropagation(); if (safeUrl) window.open(safeUrl, "_blank", "noopener,noreferrer"); }}
      style={{
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
        gap:                  5,
        padding:              "5px 14px",
        borderRadius:         100,
        background:           hov ? withOpacity(baseColor, 0.14) : withOpacity(baseColor, 0.07),
        border:               `1px solid ${hov ? withOpacity(baseColor, 0.28) : withOpacity(baseColor, 0.12)}`,
        cursor:               safeUrl ? "pointer" : "default",
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition:           "all 0.15s ease",
        minWidth:             80,
        maxWidth:             160,
        userSelect:           "none",
        transform:            hov ? "translateY(-1px)" : "translateY(0)",
        boxShadow:            hov ? `0 4px 16px ${withOpacity(baseColor, 0.12)}` : "none",
      }}
    >
      {link.icon && (
        <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{link.icon}</span>
      )}
      <span style={{
        fontFamily:    globalFont,
        fontSize:      9,
        fontWeight:    600,
        color:         hov ? withOpacity(baseColor, 0.9) : withOpacity(baseColor, 0.6),
        letterSpacing: 1.2,
        textTransform: "uppercase" as const,
        whiteSpace:    "nowrap",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        maxWidth:      110,
        transition:    "color 0.15s ease",
      }}>
        {link.label || safeUrl}
      </span>
    </div>
  );
}

function areProfilePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.card              === next.card &&
    prev.isSel             === next.isSel &&
    prev.draggingId        === next.draggingId &&
    prev.locked            === next.locked &&
    prev.canInteract       === next.canInteract &&
    prev.parallaxTransform === next.parallaxTransform &&
    prev.currentUserId     === next.currentUserId &&
    prev.ownerUserId       === next.ownerUserId &&
    prev.authResolved      === next.authResolved
  );
}
export default memo(ProfileCard, areProfilePropsEqual);

