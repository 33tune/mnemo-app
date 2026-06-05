"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { SocialCardData, SocialLink } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { SocialIconBtn, detectPlatform } from "./SocialIcons";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

type InternalDrag = {
  id: string;
  startX: number;
  startY: number;
  startMouseX: number;
  startMouseY: number;
};

interface Props {
  card:              SocialCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateCard:        (id: string, patch: Partial<SocialCardData>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function SocialCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [portalPos,    setPortalPos]    = useState<{ left: number; top: number } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalDrag | null>(null);
  // pending positions buffered during internal drag, flushed on mouseup
  const pendingPositions = useRef<Record<string, { x: number; y: number }>>({});
  const cardRef = useRef<HTMLDivElement>(null);

  const borderRadius   = card.borderRadius   ?? 14;
  const opacity        = card.opacity        ?? 1;
  const bgColor        = card.bgColor        || "rgba(255,255,255,0.055)";
  const isGlass        = !card.bgColor && !card.bgImage;
  const iconSize       = card.iconSize       ?? 16;
  const cardBorderColor = card.borderColor;
  const cardBorderWidth = card.borderWidth   ?? 1;
  const glowIntensity  = card.glowIntensity  ?? 0;
  const glowColor      = card.glowColor      || "#a855f7";

  const borderStyle = cardBorderColor
    ? `${cardBorderWidth}px solid ${cardBorderColor}`
    : isSel
      ? "1px solid rgba(255,255,255,0.22)"
      : "1px solid rgba(255,255,255,0.08)";

  const boxShadow = glowIntensity > 0
    ? `0 4px 20px rgba(0,0,0,0.2), 0 0 ${Math.round(glowIntensity * 30)}px ${glowColor}, 0 0 ${Math.round(glowIntensity * 60)}px ${glowColor}40`
    : "0 4px 20px rgba(0,0,0,0.2)";

  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const MENU_W = 260, GAP = 10;
      const left = r.right + GAP + MENU_W > window.innerWidth
        ? Math.max(4, r.left - MENU_W - GAP)
        : r.right + GAP;
      setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [menuOpen, card.x, card.y]);

  useEffect(() => { if (!isSel) setMenuOpen(false); }, [isSel]);

  function addSocialLink() {
    const url = newSocialUrl.trim();
    if (!url) return;
    const platform = detectPlatform(url);
    updateCard(card.id, {
      socialLinks: [...(card.socialLinks ?? []), { id: crypto.randomUUID(), platform, url }],
    });
    setNewSocialUrl("");
  }

  // Internal drag handlers
  const onIconMouseDown = useCallback((e: React.MouseEvent, sl: SocialLink) => {
    if (!isSel || !canInteract) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = sl.x ?? 0;
    const startY = sl.y ?? 0;
    pendingPositions.current = {};
    setInternalDrag({ id: sl.id, startX, startY, startMouseX: e.clientX, startMouseY: e.clientY });
  }, [isSel, canInteract]);

  const onCardMouseMove = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const dx = e.clientX - internalDrag.startMouseX;
    const dy = e.clientY - internalDrag.startMouseY;
    const nx = internalDrag.startX + dx;
    const ny = internalDrag.startY + dy;
    pendingPositions.current[internalDrag.id] = { x: nx, y: ny };
  }, [internalDrag]);

  const onCardMouseUp = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const pending = pendingPositions.current;
    const dragged = pending[internalDrag.id];
    if (dragged) {
      // When first dragged, if no x/y existed we need a real starting position.
      // Use the dragged delta relative to the icon's original flex position.
      const sl = (card.socialLinks ?? []).find(s => s.id === internalDrag.id);
      if (sl) {
        let baseX = internalDrag.startX;
        let baseY = internalDrag.startY;
        // If this is the first drag (no prior x/y), compute from DOM
        if (sl.x === undefined || sl.y === undefined) {
          const cardEl = cardRef.current;
          const iconEl = cardEl?.querySelector(`[data-icon-id="${sl.id}"]`) as HTMLElement | null;
          if (cardEl && iconEl) {
            const cardRect = cardEl.getBoundingClientRect();
            const iconRect = iconEl.getBoundingClientRect();
            baseX = iconRect.left - cardRect.left + (iconRect.width / 2);
            baseY = iconRect.top - cardRect.top + (iconRect.height / 2);
          }
        }
        const dx = e.clientX - internalDrag.startMouseX;
        const dy = e.clientY - internalDrag.startMouseY;
        const finalX = baseX + dx;
        const finalY = baseY + dy;
        updateCard(card.id, {
          socialLinks: (card.socialLinks ?? []).map(s =>
            s.id === internalDrag.id ? { ...s, x: finalX, y: finalY } : s
          ),
        });
      }
    }
    setInternalDrag(null);
    pendingPositions.current = {};
  }, [internalDrag, card.id, card.socialLinks, updateCard]);

  // Determine if any icon has custom position
  const hasPositionedIcons = (card.socialLinks ?? []).some(sl => sl.x !== undefined && sl.y !== undefined);

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={menuOpen ? e => e.stopPropagation() : internalDrag ? undefined : onMouseDown}
        onMouseMove={onCardMouseMove}
        onMouseUp={onCardMouseUp}
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
          cursor:     internalDrag ? "grabbing" : draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
          ...entryAnimStyle,
        }}
      >
        {/* Background */}
        <div style={{
          position:             "absolute",
          inset:                0,
          borderRadius,
          ...(card.bgImage
            ? bgImageStyle(card.bgImage, card.bgMode)
            : { background: bgColor }),
          backdropFilter:       isGlass ? "blur(20px)" : "none",
          WebkitBackdropFilter: isGlass ? "blur(20px)" : "none",
          border:               borderStyle,
          boxShadow,
          opacity,
        }} />

        {/* Icons */}
        <div style={{
          position:       "absolute",
          inset:          0,
          borderRadius,
          ...(hasPositionedIcons ? {} : {
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexWrap:       "wrap" as const,
            gap:            2,
            padding:        "10px 12px",
          }),
          overflow: "hidden",
        }}>
          {(card.socialLinks ?? []).length === 0 ? (
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>
              social
            </span>
          ) : (
            (card.socialLinks ?? []).map(sl => {
              const hasPos = sl.x !== undefined && sl.y !== undefined;
              const isBeingDragged = internalDrag?.id === sl.id;

              // Get live position during drag
              let liveX = sl.x ?? 0;
              let liveY = sl.y ?? 0;
              if (isBeingDragged && internalDrag) {
                // position is tracked in pendingPositions — we re-render on mouseMove via state but
                // we use a CSS transform trick instead to avoid setState on every mousemove
              }
              void liveX; void liveY; // suppress unused lint

              return (
                <div
                  key={sl.id}
                  data-icon-id={sl.id}
                  onMouseDown={isSel && canInteract ? e => onIconMouseDown(e, sl) : undefined}
                  style={{
                    ...(hasPos ? {
                      position:  "absolute",
                      left:      sl.x,
                      top:       sl.y,
                      transform: "translate(-50%,-50%)",
                      cursor:    isSel && canInteract ? "grab" : "default",
                      zIndex:    isBeingDragged ? 10 : 1,
                    } : {
                      cursor: isSel && canInteract ? "grab" : "default",
                      flexShrink: 0,
                    }),
                  }}
                >
                  <SocialIconBtn
                    platform={detectPlatform(sl.url)}
                    url={sl.url}
                    color={card.textColor || "rgba(255,255,255,0.75)"}
                    size={iconSize}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Gear */}
        {isSel && canInteract && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const next = !menuOpen;
              if (next && cardRef.current) {
                const r = cardRef.current.getBoundingClientRect();
                const MENU_W = 260, GAP = 10;
                const left = r.right + GAP + MENU_W > window.innerWidth
                  ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
              } else setPortalPos(null);
              setMenuOpen(next);
            }}
            style={{
              position: "absolute", top: -10, left: -10,
              width: 20, height: 20, borderRadius: "50%",
              background: menuOpen ? "rgba(212,240,196,0.12)" : "rgba(12,12,14,0.96)",
              border: menuOpen ? "1px solid rgba(212,240,196,0.32)" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer", zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              transition: `all 0.12s ${EASE}`,
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

        {/* Lock */}
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
            }}
          >
            {locked ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            )}
          </div>
        )}

        {/* Rotate */}
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
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
          </div>
        )}

        {isSel && canInteract && !locked && <ResizeHandles onResizeMD={onResizeMD} />}
      </div>

      {/* Config portal */}
      {menuOpen && canInteract && portalPos && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === "Escape") setMenuOpen(false); }}
          style={{
            position: "fixed", left: portalPos.left, top: portalPos.top,
            width: 260, background: "#09090b",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
            padding: "18px 14px 22px", zIndex: 999999,
            boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
            fontFamily: SANS, display: "flex", flexDirection: "column", gap: 12,
            maxHeight: `calc(100vh - ${portalPos.top + 8}px)`, overflowY: "auto",
          } as CSSProperties}
        >
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 2 }}>
            social
          </div>

          {/* Links list */}
          {(card.socialLinks ?? []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {(card.socialLinks ?? []).map((sl, idx) => (
                <div key={sl.id} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 4, padding: "5px 8px",
                }}>
                  <SocialIconBtn platform={detectPlatform(sl.url)} url={sl.url} color="rgba(255,255,255,0.6)" size={13} />
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.38)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sl.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}
                  </span>
                  {sl.x !== undefined && (
                    <button
                      title="Reset position"
                      onClick={() => updateCard(card.id, { socialLinks: (card.socialLinks ?? []).map((s, i) => i === idx ? { ...s, x: undefined, y: undefined } : s) })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: "0 2px", transition: `color 0.1s ${EASE}` }}
                      onMouseEnter={e => e.currentTarget.style.color = "rgba(212,240,196,0.7)"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                    >⊙</button>
                  )}
                  <button
                    onClick={() => updateCard(card.id, { socialLinks: (card.socialLinks ?? []).filter((_, i) => i !== idx) })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px", transition: `color 0.1s ${EASE}` }}
                    onMouseEnter={e => e.currentTarget.style.color = "rgba(220,80,60,0.85)"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Add link */}
          {(card.socialLinks ?? []).length < 12 && (
            <div style={{ display: "flex", gap: 5 }}>
              <input
                value={newSocialUrl}
                onChange={e => setNewSocialUrl(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                onKeyDown={e => e.key === "Enter" && addSocialLink()}
                placeholder="discord, instagram, github…"
                type="url"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3,
                  padding: "5px 8px", color: "rgba(255,255,255,0.55)",
                  fontFamily: MONO, fontSize: 8.5, outline: "none", letterSpacing: 0.3,
                }}
              />
              <button
                onClick={addSocialLink}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 3, color: "rgba(255,255,255,0.45)", fontFamily: MONO,
                  fontSize: 8, letterSpacing: 1, cursor: "pointer", padding: "5px 8px",
                  flexShrink: 0, textTransform: "uppercase" as const,
                }}
              >+</button>
            </div>
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />

          {/* Opacity */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, width: 44, flexShrink: 0 }}>opacity</span>
            <input
              type="range" min={0} max={1} step={0.05} value={card.opacity ?? 1}
              onChange={e => updateCard(card.id, { opacity: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
            />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 24, textAlign: "right" }}>{Math.round((card.opacity ?? 1) * 100)}</span>
          </div>

          {/* Icon size */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, width: 44, flexShrink: 0 }}>icons</span>
            <input
              type="range" min={12} max={40} step={1} value={card.iconSize ?? 16}
              onChange={e => updateCard(card.id, { iconSize: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
            />
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.3)", width: 24, textAlign: "right" }}>{card.iconSize ?? 16}</span>
          </div>

          {/* Style: bg + border radius */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const }}>bg</span>
            <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
              {card.bgColor && <div style={{ position: "absolute", inset: 0, background: card.bgColor }} />}
              <input type="color"
                value={card.bgColor?.startsWith("#") ? card.bgColor : "#141416"}
                onChange={e => updateCard(card.id, { bgColor: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const }}>r</span>
            <input
              type="range" min={0} max={40} value={card.borderRadius ?? 14}
              onChange={e => updateCard(card.id, { borderRadius: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
            />
          </div>

          {/* Border color + width */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, width: 44, flexShrink: 0 }}>border</span>
            <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
              {card.borderColor && <div style={{ position: "absolute", inset: 0, background: card.borderColor }} />}
              <input type="color"
                value={card.borderColor?.startsWith("#") ? card.borderColor : "#ffffff"}
                onChange={e => updateCard(card.id, { borderColor: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </div>
            <input
              type="range" min={0} max={8} step={1} value={card.borderWidth ?? 1}
              onChange={e => updateCard(card.id, { borderWidth: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
            />
            {card.borderColor && (
              <button onClick={() => updateCard(card.id, { borderColor: "", borderWidth: 1 })}
                onMouseDown={e => e.stopPropagation()}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
            )}
          </div>

          {/* Glow color + intensity */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, width: 44, flexShrink: 0 }}>glow</span>
            <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
              {card.glowColor && <div style={{ position: "absolute", inset: 0, background: card.glowColor }} />}
              <input type="color"
                value={card.glowColor?.startsWith("#") ? card.glowColor : "#a855f7"}
                onChange={e => updateCard(card.id, { glowColor: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={card.glowIntensity ?? 0}
              onChange={e => updateCard(card.id, { glowIntensity: Number(e.target.value) })}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }}
            />
            {(card.glowIntensity ?? 0) > 0 && (
              <button onClick={() => updateCard(card.id, { glowIntensity: 0 })}
                onMouseDown={e => e.stopPropagation()}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default memo(SocialCardWidget);
