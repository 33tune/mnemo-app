"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { trackRender } from "@/lib/perfDebug";
import type { ProfileCardData, TextFont, ProfileCardVariant, CardEffects } from "@/types";
import { uploadToStorage } from "@/lib/storage";
import { bgImageStyle, detectBgMode } from "@/lib/bgStyle";
import { useFollow } from "@/hooks/useFollow";
import { useFavorite } from "@/hooks/useFavorite";
import { usePresence } from "@/hooks/usePresence";
import { useProfileViews } from "@/hooks/useProfileViews";
import type { PresenceState } from "@/types";
import { UIButton, UISlider } from "@/components/ui";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import PersonalizePanel from "./PersonalizePanel";
import CardLayers from "./CardLayers";

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
const PHOTO_SIZES = { sm: 52, md: 80, lg: 112 };
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const FONTS: { key: TextFont; label: string; style: string }[] = [
  { key: "DM Sans",          label: "DM Sans",    style: "'DM Sans', sans-serif" },
  { key: "Space Mono",       label: "Mono",       style: "'Space Mono', monospace" },
  { key: "Playfair Display", label: "Playfair",   style: "'Playfair Display', serif" },
  { key: "Bebas Neue",       label: "Bebas",      style: "'Bebas Neue', sans-serif" },
  { key: "Syne",             label: "Syne",       style: "'Syne', sans-serif" },
  { key: "Impact",           label: "Impact",     style: "Impact, sans-serif" },
];

const VARIANTS: { key: ProfileCardVariant; label: string }[] = [
  { key: "classic", label: "CL" },
  { key: "glass",   label: "GL" },
  { key: "guns",    label: "GN" },
  { key: "minimal", label: "MN" },
  { key: "poster",  label: "PS" },
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
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
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
  onAddModule?:         (moduleType: "social" | "music" | "links") => void;
  entryAnimStyle?:      CSSProperties;
}

function ProfileCard({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD, updateProfile, locked, onToggleLock, canInteract,
  onMessage, currentUserId, ownerUserId, authResolved = false, onOpenSocialPanel, onAddModule,
  entryAnimStyle = {},
}: Props) {
  if (process.env.NODE_ENV !== "production") trackRender("ProfileCard");

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [personalize,  setPersonalize]  = useState(false);
  const [followHover,  setFollowHover]  = useState(false);
  const [msgHover,     setMsgHover]     = useState(false);
  const [favHover,     setFavHover]     = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "status" | null>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const innerRef    = useRef<HTMLDivElement>(null);
  const favTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute variant early — needed for effectiveEffects
  const variant: ProfileCardVariant = (card.variant as ProfileCardVariant) ?? "classic";
  const isGlassVariant = variant === "glass" || (!card.bgColor && !card.bgImage);
  const spotlightIntensity =
    variant === "guns"    ? 0.09 :
    variant === "minimal" ? 0    :
    variant === "glass"   ? 0.07 : 0.055;

  // Effective effects: flat fields as fallback, card.effects as override
  const effectiveEffects: CardEffects = {
    ...card.effects,
    bg: {
      color:     card.effects?.bg?.color     ?? (card.bgColor || undefined),
      image:     card.effects?.bg?.image     ?? (card.bgImage || undefined),
      imageMode: card.effects?.bg?.imageMode ?? card.bgMode,
      opacity:   card.effects?.bg?.opacity   ?? card.opacity,
      ...card.effects?.bg,
    },
    border: {
      color:  card.effects?.border?.color  ?? card.borderColor,
      width:  card.effects?.border?.width  ?? card.borderWidth,
      radius: card.effects?.border?.radius ?? card.borderRadius,
      ...card.effects?.border,
    },
    glow: {
      color:     card.effects?.glow?.color     ?? card.glowColor,
      intensity: card.effects?.glow?.intensity ?? card.glowIntensity,
      outer:     card.effects?.glow?.outer     ?? ((card.glowIntensity ?? 0) > 0),
      ...card.effects?.glow,
    },
    layers: {
      glass:     isGlassVariant,
      glassBlur: 20,
      ...card.effects?.layers,
    },
    interactions: {
      spotlight:          spotlightIntensity > 0,
      spotlightColor:     `rgba(255,255,255,${spotlightIntensity * 2.5})`,
      spotlightIntensity: spotlightIntensity,
      ...card.effects?.interactions,
    },
  };
  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>, true);

  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const MENU_W = 268, GAP = 10;
      const left = r.right + GAP + MENU_W > window.innerWidth
        ? Math.max(4, r.left - MENU_W - GAP)
        : r.right + GAP;
      const top = Math.min(Math.max(8, r.top), window.innerHeight - 120);
      setPortalPos({ left, top });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [menuOpen, card.x, card.y, card.w, card.h]);

  useEffect(() => {
    if (!isSel) { setMenuOpen(false); setEditingField(null); setPersonalize(false); }
  }, [isSel]);

  useEffect(() => {
    return () => { if (favTimerRef.current) clearTimeout(favTimerRef.current); };
  }, []);

  const photoRef  = useRef<HTMLInputElement>(null);
  const bgImgRef  = useRef<HTMLInputElement>(null);

  const targetUserId = card.userId ?? ownerUserId;
  const isSelf       = !!(targetUserId && currentUserId && targetUserId === currentUserId);
  const { isFollowing, followerCount, followingCount, follow, unfollow, justFollowed } =
    useFollow(targetUserId ?? "", currentUserId);
  const { isFavorite, addFavorite, removeFavorite, justFavorited } =
    useFavorite(targetUserId ?? "", currentUserId);
  const presenceState = usePresence(isSelf && canInteract ? undefined : targetUserId);
  const { total: totalViews } = useProfileViews(!canInteract ? (targetUserId ?? undefined) : undefined);

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

  // Visual values (variant/spotlightIntensity already computed above for effectiveEffects)
  const photoSizeKey = card.photoSize ?? "md";
  const basePx       = PHOTO_SIZES[photoSizeKey];
  const avatarSize   = variant === "guns" || variant === "poster" ? Math.max(basePx, 88) :
                       variant === "minimal"                       ? Math.min(basePx, 56) :
                       basePx;
  const nameFontSize   = card.nameFontSize   ?? (variant === "guns" || variant === "poster" ? 17 : 15);
  const statusFontSize = card.statusFontSize ?? 10;
  const font           = card.font           ?? "DM Sans";
  const isLight        = luminance(effectiveEffects.bg?.color ?? card.bgColor) > 0.5;
  const baseColor      = card.textColor ?? (isLight ? "#0f0f0f" : "#ffffff");
  const primaryColor   = withOpacity(baseColor, 0.95);
  const secondaryColor = withOpacity(baseColor, 0.72);
  const faintColor     = withOpacity(baseColor, 0.45);
  const globalFont     = fontStyle(font);

  const avatarBorder =
    variant === "minimal"              ? "none" :
    variant === "guns" || variant === "poster"
      ? `2px solid ${withOpacity(baseColor, 0.22)}`
      : `2px solid ${withOpacity(baseColor, 0.14)}`;

  const avatarShadow =
    variant === "guns" || variant === "poster"
      ? `0 6px 28px ${withOpacity(baseColor, 0.14)}`
      : "none";

  const btnBase: React.CSSProperties = {
    padding:        "7px 11px",
    borderRadius:   7,
    border:         "none",
    background:     withOpacity(baseColor, 0.08),
    fontFamily:     globalFont,
    fontSize:       11,
    fontWeight:     600,
    letterSpacing:  "1.2px",
    cursor:         "pointer",
    whiteSpace:     "nowrap",
    transition:     `background 0.12s ${EASE}, color 0.12s ${EASE}, transform 0.12s ${EASE}`,
  };

  const gap = variant === "minimal" ? 5 : 7;
  const pad = variant === "minimal" ? 14 : 20;

  return (
    <>
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
        onMouseMove={onInteractMove}
        onMouseLeave={onInteractLeave}
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
          ...entryAnimStyle,
        }}
      >
        <CardLayers
          cardId={card.id}
          effects={effectiveEffects}
          isSel={isSel}
          borderRadius={effectiveEffects.border?.radius ?? card.borderRadius}
          style={{ opacity: effectiveEffects.opacity ?? 1 }}
        >

        {/* ── Content ── */}
        <div
          ref={innerRef}
          style={{ position: "absolute", inset: 0, borderRadius: effectiveEffects.border?.radius ?? card.borderRadius, overflow: "hidden" }}
        >
          {/* bg overlay tint for image cards */}
          {(effectiveEffects.bg?.image) && (
            <div style={{
              position:      "absolute",
              inset:         0,
              background:    isLight
                ? "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.44))"
                : "linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.52))",
              pointerEvents: "none",
              zIndex:        1,
            }} />
          )}

          {/* ── Structured column layout ── */}
          <div style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            padding:        `${pad}px ${pad}px`,
            gap:            gap,
            zIndex:         3,
            overflowY:      "hidden",
          }}>

            {/* Avatar */}
            <div style={{
              width:        avatarSize,
              height:       avatarSize,
              borderRadius: "50%",
              overflow:     "hidden",
              border:       avatarBorder,
              background:   "rgba(255,255,255,0.06)",
              boxShadow:    avatarShadow,
              flexShrink:   0,
            }}>
              {card.photo ? (
                <img src={card.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={avatarSize * 0.34} height={avatarSize * 0.34} viewBox="0 0 24 24" fill="none" stroke={faintColor} strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* Name */}
            {(card.name || menuOpen) && (
              <div style={{
                fontFamily: globalFont,
                fontSize:   nameFontSize,
                fontWeight: 700,
                color:      primaryColor,
                lineHeight: 1.2,
                textAlign:  "center",
                marginTop:  variant === "minimal" ? 2 : 4,
              }}>
                {card.name || (menuOpen ? "nombre" : "")}
              </div>
            )}

            {/* @handle */}
            {(card.handle || menuOpen) && (
              <div style={{
                fontFamily:    MONO,
                fontSize:      9,
                color:         faintColor,
                letterSpacing: 0.4,
                marginTop:     -2,
              }}>
                {card.handle ? `@${card.handle}` : "@handle"}
              </div>
            )}

            {/* Status */}
            {(card.status || menuOpen) && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "rgba(160,230,120,0.85)", flexShrink: 0,
                }} />
                <span style={{ fontFamily: globalFont, fontSize: statusFontSize, color: secondaryColor }}>
                  {card.status || (menuOpen ? "status" : "")}
                </span>
              </div>
            )}

            {/* Bio */}
            {card.bio && (
              <div style={{
                fontFamily:           MONO,
                fontSize:             8,
                color:                withOpacity(baseColor, 0.42),
                maxWidth:             "100%",
                textAlign:            "center",
                lineHeight:           1.6,
                overflow:             "hidden",
                display:              "-webkit-box",
                WebkitLineClamp:      2,
                WebkitBoxOrient:      "vertical",
              } as React.CSSProperties}>
                {card.bio}
              </div>
            )}

            {/* Divider */}
            {variant !== "minimal" && (
              <div style={{ width: "100%", height: 1, background: withOpacity(baseColor, 0.07), flexShrink: 0 }} />
            )}

            {/* Stats */}
            <div style={{
              fontFamily:  globalFont,
              fontSize:    10,
              color:       faintColor,
              textAlign:   "center",
              whiteSpace:  "nowrap",
              userSelect:  "none",
              pointerEvents: menuOpen ? "none" : "auto",
            }}>
              {!canInteract ? (
                <>
                  <StatChip
                    label={`${followerCount} seg`}
                    onClick={e => { e.stopPropagation(); onOpenSocialPanel?.("followers"); }}
                    color={faintColor}
                  />
                  <span style={{ opacity: 0.38 }}> · </span>
                  <StatChip
                    label={`${followingCount} sig`}
                    onClick={e => { e.stopPropagation(); onOpenSocialPanel?.("following"); }}
                    color={faintColor}
                  />
                  {totalViews > 0 && (
                    <><span style={{ opacity: 0.38 }}> · </span>
                    <span style={{ color: withOpacity(baseColor, 0.36), fontSize: 9 }}>{totalViews}v</span></>
                  )}
                </>
              ) : (
                <>{followerCount} seg · {followingCount} sig</>
              )}
            </div>

            {/* Action buttons */}
            {(canInteract || (authResolved && !isSelf)) && (
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                {/* Follow */}
                <button
                  className="pcfg-btn"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    if (canInteract || isSelf || menuOpen) return;
                    isFollowing ? unfollow() : follow();
                  }}
                  onMouseEnter={() => setFollowHover(true)}
                  onMouseLeave={() => setFollowHover(false)}
                  style={{
                    ...btnBase,
                    color:      justFollowed ? "rgba(212,240,196,1)" : isFollowing ? "rgba(212,240,196,0.95)" : (followHover ? primaryColor : withOpacity(baseColor, 0.7)),
                    background: justFollowed ? "rgba(212,240,196,0.22)" : isFollowing ? "rgba(212,240,196,0.14)" : (followHover ? withOpacity(baseColor, 0.14) : withOpacity(baseColor, 0.07)),
                    outline:    isFollowing ? "1px solid rgba(212,240,196,0.28)" : "none",
                    transform:  followHover ? "translateY(-1px) scale(1.04)" : "translateY(0) scale(1)",
                    letterSpacing: "1.4px",
                    transition: `color 0.14s ease, background 0.14s ease, transform 0.14s ease`,
                  }}
                >
                  {justFollowed ? "FOLLOWED ✓" : isFollowing ? (followHover ? "UNFOLLOW" : "FOLLOWING") : "FOLLOW"}
                </button>

                {/* Message */}
                <div
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!menuOpen && onMessage && card.handle) onMessage(card.handle);
                  }}
                  onMouseEnter={() => setMsgHover(true)}
                  onMouseLeave={() => setMsgHover(false)}
                  style={{
                    ...btnBase,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    cursor:         !canInteract ? "pointer" : "default",
                    userSelect:     "none",
                    opacity:        menuOpen ? 1 : 0.52,
                  }}
                >
                  <span style={{
                    fontFamily:   globalFont,
                    fontSize:     11,
                    fontWeight:   600,
                    letterSpacing: "1.2px",
                    color:        secondaryColor,
                    transform:    msgHover ? "translateY(-1px)" : "none",
                    transition:   `transform 0.12s ${EASE}`,
                    pointerEvents: "none",
                  }}>
                    MSG
                  </span>
                </div>

                {/* Favorite */}
                <button
                  className="pcfg-btn"
                  onMouseDown={e => e.stopPropagation()}
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
                    fontSize:   15,
                    fontWeight: 400,
                    padding:    "4px 7px",
                    color:      isFavorite ? primaryColor : (favHover ? primaryColor : secondaryColor),
                    background: isFavorite ? withOpacity(baseColor, 0.12) : (favHover ? withOpacity(baseColor, 0.1) : withOpacity(baseColor, 0.05)),
                    filter:     justFavorited ? `drop-shadow(0 0 8px ${withOpacity(baseColor, 0.7)})` : isFavorite ? `drop-shadow(0 0 5px ${withOpacity(baseColor, 0.35)})` : "none",
                    transform:  !favAnimating ? (favHover ? "translateY(-1px) scale(1.1)" : "translateY(0) scale(1)") : undefined,
                    animation:  favAnimating ? `pcfg-star 0.22s ${EASE} both` : undefined,
                    transition: `color 0.14s ease, background 0.14s ease, filter 0.2s ease`,
                  }}
                >
                  ★
                </button>
              </div>
            )}

          </div>

          {/* Presence indicator — always absolute bottom-left */}
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
              zIndex:        4,
            }}>
              {presenceState}
            </div>
          )}
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
                const MENU_W = 268, GAP = 10;
                const left = r.right + GAP + MENU_W > window.innerWidth
                  ? Math.max(4, r.left - MENU_W - GAP)
                  : r.right + GAP;
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
              } else {
                setPortalPos(null);
              }
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
              e.currentTarget.style.transform = "scale(1.12)";
              e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
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

        {/* ── Resize handles ── */}
        {isSel && canInteract && !locked && (
          <ResizeHandles onResizeMD={onResizeMD} light={isLight} />
        )}

        {/* ── Config menu styles (must live outside the conditional) ── */}
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
          .pcfg-s  { animation: pcfg-up 0.18s cubic-bezier(0.2,0.8,0.2,1) both; }
          .pcfg-s1 { animation-delay: 0ms; }
          .pcfg-s2 { animation-delay: 40ms; }
          .pcfg-s3 { animation-delay: 72ms; }
          .pcfg-s4 { animation-delay: 104ms; }
          .pcfg-s5 { animation-delay: 136ms; }
          .pcfg button:active { transform: scale(0.95) !important; transition-duration: 0.06s !important; }
        `}</style>

        {/* ── Config menu portal ── */}
        {menuOpen && canInteract && portalPos && createPortal(
          <div
            className="pcfg"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === "Escape") setMenuOpen(false); }}
            style={{
              position:      "fixed",
              left:          portalPos.left,
              top:           portalPos.top,
              width:         268,
              background:    "#09090b",
              border:        "1px solid rgba(255,255,255,0.12)",
              borderRadius:  6,
              padding:       "20px 16px 24px",
              zIndex:        999999,
              boxShadow:     "0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
              fontFamily:    SANS,
              display:       "flex",
              flexDirection: "column",
              maxHeight:     `calc(100vh - ${portalPos.top + 8}px)`,
              overflowY:     "auto",
              scrollbarWidth:  "thin" as React.CSSProperties["scrollbarWidth"],
              scrollbarColor:  "rgba(255,255,255,0.1) rgba(255,255,255,0.02)",
            } as React.CSSProperties}
          >

            {/* ── Main view (hidden when personalizing) ── */}
            {!personalize && <>

            {/* ════ FOTO ════ */}
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
                    (e.currentTarget as HTMLDivElement).style.transform   = "scale(1.06)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.22)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform   = "scale(1)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)";
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

            {/* ════ IDENTIDAD ════ */}
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
                    width: "100%", color: "rgba(255,255,255,0.92)", fontSize: 22,
                    fontWeight: 700, fontFamily: globalFont, letterSpacing: "-0.4px",
                    lineHeight: 1.15, padding: "0 0 4px",
                    borderBottom: "1px solid rgba(255,255,255,0.22)", boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingField("name")}
                  title="click to edit"
                  style={{
                    fontSize: 22, fontWeight: 700, fontFamily: globalFont,
                    letterSpacing: "-0.4px", lineHeight: 1.15,
                    color: card.name ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.15)",
                    cursor: "text", paddingBottom: 4, transition: `opacity 0.1s ${EASE}`,
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
                    width: "100%", color: "rgba(255,255,255,0.55)", fontSize: 12,
                    fontFamily: globalFont, padding: "0 0 3px",
                    borderBottom: "1px solid rgba(255,255,255,0.15)", boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingField("status")}
                  title="click to edit"
                  style={{
                    fontSize: 12, fontFamily: SANS,
                    color: card.status ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.15)",
                    cursor: "text", transition: `opacity 0.1s ${EASE}`,
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
                    style={{ background: "transparent", border: "none", outline: "none", color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: SANS, cursor: "pointer" }}
                  >
                    {FONTS.map(f => (
                      <option key={f.key} value={f.key} style={{ background: "#09090b" }}>{f.label}</option>
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
                    display: "block", width: "100%", marginTop: 6,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 3, padding: "6px 8px", color: "rgba(255,255,255,0.52)",
                    fontFamily: MONO, fontSize: 9, letterSpacing: 0.3,
                    resize: "none" as React.CSSProperties["resize"], outline: "none", lineHeight: 1.55,
                    boxSizing: "border-box" as React.CSSProperties["boxSizing"],
                  }}
                />
              </div>

            </div>

            <Div />

            {/* ════ ESTILO ════ */}
            <div className="pcfg-s pcfg-s4">
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
                  >clear</button>
                )}
              </div>

              {/* Variant picker */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {VARIANTS.map(v => (
                  <button
                    key={v.key}
                    onClick={() => updateProfile(card.id, { variant: v.key })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      flex:          1,
                      padding:       "5px 0",
                      borderRadius:  4,
                      border:        variant === v.key
                        ? "1px solid rgba(212,240,196,0.38)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background:    variant === v.key
                        ? "rgba(212,240,196,0.1)"
                        : "rgba(255,255,255,0.03)",
                      color:         variant === v.key
                        ? "rgba(212,240,196,0.9)"
                        : "rgba(255,255,255,0.38)",
                      fontFamily:    MONO,
                      fontSize:      8,
                      letterSpacing: 0.5,
                      cursor:        "pointer",
                      transition:    `all 0.12s ${EASE}`,
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Border color + width */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, flexShrink: 0 }}>border</span>
                <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
                  {card.borderColor && <div style={{ position: "absolute", inset: 0, background: card.borderColor }} />}
                  <input type="color"
                    value={card.borderColor?.startsWith("#") ? card.borderColor : "#ffffff"}
                    onChange={e => updateProfile(card.id, { borderColor: e.target.value })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                  />
                </div>
                <input
                  type="range" min={0} max={8} step={1} value={card.borderWidth ?? 1}
                  onChange={e => updateProfile(card.id, { borderWidth: Number(e.target.value) })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
                />
                {card.borderColor && (
                  <button onClick={() => updateProfile(card.id, { borderColor: "", borderWidth: 1 })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
                )}
              </div>

              {/* Glow color + intensity */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, flexShrink: 0 }}>glow</span>
                <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
                  {card.glowColor && <div style={{ position: "absolute", inset: 0, background: card.glowColor }} />}
                  <input type="color"
                    value={card.glowColor?.startsWith("#") ? card.glowColor : "#a855f7"}
                    onChange={e => updateProfile(card.id, { glowColor: e.target.value })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
                  />
                </div>
                <input
                  type="range" min={0} max={1} step={0.05} value={card.glowIntensity ?? 0}
                  onChange={e => updateProfile(card.id, { glowIntensity: Number(e.target.value) })}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
                />
                {(card.glowIntensity ?? 0) > 0 && (
                  <button onClick={() => updateProfile(card.id, { glowIntensity: 0 })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
                )}
              </div>

              {/* Bg color picker */}
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
                <div style={{ flex: 1 }}><UIButton onClick={() => bgImgRef.current?.click()} full>image / gif</UIButton></div>
                {card.bgImage && (
                  <div style={{ flex: 1 }}><UIButton onClick={() => updateProfile(card.id, { bgImage: "" })} danger full>remove</UIButton></div>
                )}
              </div>
            </div>

            </>} {/* end main view */}

            {onAddModule && !personalize && (
              <>
                <Div />
                <div>
                  <PanelLabel>módulos</PanelLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["social", "music", "links"] as const).map(mod => (
                      <button
                        key={mod}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => onAddModule(mod)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "rgba(255,255,255,0.65)",
                          fontFamily: MONO,
                          fontSize: 9,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        + {mod}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!personalize && (
              <>
                <Div />

                {/* ════ DISEÑO ════ */}
                <div className="pcfg-s pcfg-s5">
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

                <Div />

                {/* ════ PERSONALIZAR ════ */}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setPersonalize(true); }}
                  style={{
                    padding: "9px 0", borderRadius: 6, cursor: "pointer",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontSize: 8, letterSpacing: 1.5,
                    textTransform: "uppercase" as const, width: "100%",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,240,196,0.07)"; e.currentTarget.style.borderColor = "rgba(212,240,196,0.2)"; e.currentTarget.style.color = "rgba(212,240,196,0.7)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                  Personalizar efectos →
                </button>
              </>
            )}

            {/* ── View B: PersonalizePanel ── */}
            {personalize && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setPersonalize(false); }}
                    style={{
                      background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4, color: "rgba(255,255,255,0.4)", fontFamily: MONO,
                      fontSize: 8, letterSpacing: 1, cursor: "pointer", padding: "3px 8px",
                    }}
                  >← Volver</button>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const }}>personalizar</span>
                </div>
                <PersonalizePanel
                  effects={card.effects}
                  onChange={newEffects => updateProfile(card.id, { effects: newEffects })}
                  isProfileCard
                />
              </>
            )}

          </div>
        , document.body)}
      </div>

      <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
      <input ref={bgImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgImgUpload} />
    </>
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
      style={{ cursor: "pointer", borderBottom: `1px solid ${hov ? color : "transparent"}`, transition: "border-color 0.1s ease", paddingBottom: 1, display: "inline" }}
    >
      {label}
    </span>
  );
}

// ── Presence helpers ──────────────────────────────────────────────────────────

function presenceLabelColor(state: PresenceState, baseColor: string): string {
  const a = state === "ACTIVE NOW" ? 0.55 : state === "EDITING SPACE" ? 0.48 : 0.22;
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
      fontFamily: MONO, fontSize: 9, letterSpacing: 2,
      color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
      marginBottom: inline ? 0 : 14, userSelect: "none",
    }}>
      {children}
    </div>
  );
}

function Div() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "22px 0" }} />;
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
