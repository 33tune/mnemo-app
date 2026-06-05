"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { LinksCardData, ProfileLink, TextFont } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import { trackLinkClick } from "@/lib/trackLinkClick";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const FONTS: { key: TextFont; label: string; style: string }[] = [
  { key: "DM Sans",          label: "DM Sans",  style: "'DM Sans', sans-serif" },
  { key: "Space Mono",       label: "Mono",     style: "'Space Mono', monospace" },
  { key: "Playfair Display", label: "Playfair", style: "'Playfair Display', serif" },
  { key: "Bebas Neue",       label: "Bebas",    style: "'Bebas Neue', sans-serif" },
  { key: "Syne",             label: "Syne",     style: "'Syne', sans-serif" },
  { key: "Impact",           label: "Impact",   style: "Impact, sans-serif" },
];

type InternalDrag = {
  id: string;
  startX: number;
  startY: number;
  startMouseX: number;
  startMouseY: number;
};

function LinkBtn({ link, editMode, ownerUserId, baseColor, fontStyle, onDragStart, isSelected, canInteract }: {
  link: ProfileLink;
  editMode: boolean;
  ownerUserId?: string;
  baseColor: string;
  fontStyle: string;
  onDragStart?: (e: React.MouseEvent, link: ProfileLink) => void;
  isSelected?: boolean;
  canInteract?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const safeUrl = !link.url ? null : link.url.startsWith("http") ? link.url : `https://${link.url}`;
  if (!link.label && !safeUrl) return null;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={canInteract && isSelected && onDragStart ? e => onDragStart(e, link) : undefined}
      onClick={e => {
        e.stopPropagation();
        if (!editMode && safeUrl) {
          if (ownerUserId) trackLinkClick(ownerUserId, link.label, safeUrl);
          window.open(safeUrl, "_blank", "noopener,noreferrer");
        }
      }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "5px 14px", borderRadius: 100,
        background: hov ? `${baseColor}24` : `${baseColor}12`,
        border: `1px solid ${hov ? `${baseColor}48` : `${baseColor}20`}`,
        cursor: canInteract && isSelected ? "grab" : (safeUrl ? "pointer" : "default"),
        transition: "all 0.15s ease",
        userSelect: "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {link.icon && <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{link.icon}</span>}
      <span style={{
        fontFamily: fontStyle, fontSize: 9, fontWeight: 600,
        color: hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        letterSpacing: 1.2, textTransform: "uppercase" as const,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
        transition: "color 0.15s ease",
      }}>
        {link.label || safeUrl}
      </span>
    </div>
  );
}

interface Props {
  card:              LinksCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateCard:        (id: string, patch: Partial<LinksCardData>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  ownerUserId?:      string;
  entryAnimStyle?:   CSSProperties;
}

function LinksCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  ownerUserId, entryAnimStyle = {},
}: Props) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [newLabel,    setNewLabel]    = useState("");
  const [newUrl,      setNewUrl]      = useState("");
  const [newIcon,     setNewIcon]     = useState("");
  const [portalPos,   setPortalPos]   = useState<{ left: number; top: number } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalDrag | null>(null);
  const pendingPositions = useRef<Record<string, { x: number; y: number }>>({});
  const cardRef = useRef<HTMLDivElement>(null);

  const borderRadius   = card.borderRadius   ?? 14;
  const opacity        = card.opacity        ?? 1;
  const bgColor        = card.bgColor        || "rgba(255,255,255,0.055)";
  const isGlass        = !card.bgColor && !card.bgImage;
  const glowIntensity  = card.glowIntensity  ?? 0;
  const glowColor      = card.glowColor      || "#a855f7";
  const cardBorderColor = card.borderColor;
  const cardBorderWidth = card.borderWidth   ?? 1;
  const fontStyle      = FONTS.find(f => f.key === card.font)?.style ?? SANS;

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
        ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
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

  function addLink() {
    if (!newUrl.trim()) return;
    updateCard(card.id, {
      links: [...(card.links ?? []), {
        id: crypto.randomUUID(),
        url: newUrl.trim(),
        label: newLabel.trim(),
        icon: newIcon.trim() || undefined,
      }],
    });
    setNewUrl(""); setNewLabel(""); setNewIcon("");
  }

  // Internal drag handlers
  const onLinkDragStart = useCallback((e: React.MouseEvent, link: ProfileLink) => {
    if (!isSel || !canInteract) return;
    e.stopPropagation();
    e.preventDefault();
    pendingPositions.current = {};
    setInternalDrag({
      id: link.id,
      startX: link.x ?? 0,
      startY: link.y ?? 0,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
    });
  }, [isSel, canInteract]);

  const onCardMouseMove = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const dx = e.clientX - internalDrag.startMouseX;
    const dy = e.clientY - internalDrag.startMouseY;
    pendingPositions.current[internalDrag.id] = {
      x: internalDrag.startX + dx,
      y: internalDrag.startY + dy,
    };
  }, [internalDrag]);

  const onCardMouseUp = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const link = (card.links ?? []).find(l => l.id === internalDrag.id);
    if (link) {
      let baseX = internalDrag.startX;
      let baseY = internalDrag.startY;
      // If first drag, get DOM position
      if (link.x === undefined || link.y === undefined) {
        const cardEl = cardRef.current;
        const linkEl = cardEl?.querySelector(`[data-link-id="${link.id}"]`) as HTMLElement | null;
        if (cardEl && linkEl) {
          const cardRect = cardEl.getBoundingClientRect();
          const linkRect = linkEl.getBoundingClientRect();
          baseX = linkRect.left - cardRect.left + linkRect.width / 2;
          baseY = linkRect.top  - cardRect.top  + linkRect.height / 2;
        }
      }
      const dx = e.clientX - internalDrag.startMouseX;
      const dy = e.clientY - internalDrag.startMouseY;
      updateCard(card.id, {
        links: (card.links ?? []).map(l =>
          l.id === internalDrag.id ? { ...l, x: baseX + dx, y: baseY + dy } : l
        ),
      });
    }
    setInternalDrag(null);
    pendingPositions.current = {};
  }, [internalDrag, card.id, card.links, updateCard]);

  const hasPositionedLinks = (card.links ?? []).some(l => l.x !== undefined && l.y !== undefined);

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

        {/* Links */}
        <div style={{
          position: "absolute", inset: 0, borderRadius,
          ...(hasPositionedLinks ? {} : {
            display: "flex", flexDirection: "column" as const, alignItems: "center",
            justifyContent: "center", gap: 6, padding: "12px 14px",
          }),
          overflow: "hidden",
        }}>
          {(card.links ?? []).filter(l => l.url).length === 0 ? (
            <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>links</span>
          ) : (
            (card.links ?? []).filter(l => l.url).map(link => {
              const hasPos = link.x !== undefined && link.y !== undefined;
              return (
                <div
                  key={link.id}
                  data-link-id={link.id}
                  style={hasPos ? {
                    position:  "absolute",
                    left:      link.x,
                    top:       link.y,
                    transform: "translate(-50%,-50%)",
                    zIndex:    internalDrag?.id === link.id ? 10 : 1,
                  } : {}}
                >
                  <LinkBtn
                    link={link}
                    editMode={!!menuOpen}
                    ownerUserId={ownerUserId}
                    baseColor="rgba(255,255,255"
                    fontStyle={fontStyle}
                    onDragStart={onLinkDragStart}
                    isSelected={isSel}
                    canInteract={canInteract}
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
                const left = r.right + GAP + MENU_W > window.innerWidth ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
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
            {locked
              ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            }
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
            fontFamily: SANS, display: "flex", flexDirection: "column", gap: 10,
            maxHeight: `calc(100vh - ${portalPos.top + 8}px)`, overflowY: "auto",
          } as CSSProperties}
        >
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
            links
          </div>

          {/* Links list */}
          {(card.links ?? []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(card.links ?? []).map((link, idx) => (
                <div key={link.id} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 4, padding: "7px 8px",
                }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 4 }}>
                    <input
                      value={link.icon ?? ""}
                      onChange={e => updateCard(card.id, { links: (card.links ?? []).map((l, i) => i === idx ? { ...l, icon: e.target.value } : l) })}
                      onMouseDown={e => e.stopPropagation()}
                      placeholder="🔗"
                      maxLength={2}
                      style={{ width: 26, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3, padding: "3px 4px", color: "rgba(255,255,255,0.8)", fontSize: 11, textAlign: "center", outline: "none", flexShrink: 0 }}
                    />
                    <input
                      value={link.label}
                      onChange={e => updateCard(card.id, { links: (card.links ?? []).map((l, i) => i === idx ? { ...l, label: e.target.value } : l) })}
                      onMouseDown={e => e.stopPropagation()}
                      placeholder="label..."
                      style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", outline: "none", color: "rgba(255,255,255,0.75)", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, textTransform: "uppercase" as const, padding: "2px 0 3px" }}
                    />
                    {link.x !== undefined && (
                      <button
                        title="Reset position"
                        onClick={() => updateCard(card.id, { links: (card.links ?? []).map((l, i) => i === idx ? { ...l, x: undefined, y: undefined } : l) })}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: "0 2px", transition: `color 0.1s ${EASE}` }}
                        onMouseEnter={e => e.currentTarget.style.color = "rgba(212,240,196,0.7)"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                      >⊙</button>
                    )}
                    <button
                      onClick={() => updateCard(card.id, { links: (card.links ?? []).filter((_, i) => i !== idx) })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px", transition: `color 0.1s ${EASE}` }}
                      onMouseEnter={e => e.currentTarget.style.color = "rgba(220,80,60,0.85)"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                    >×</button>
                  </div>
                  <input
                    value={link.url}
                    onChange={e => updateCard(card.id, { links: (card.links ?? []).map((l, i) => i === idx ? { ...l, url: e.target.value } : l) })}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder="https://..."
                    type="url"
                    style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 3, padding: "4px 7px", color: "rgba(255,255,255,0.38)", fontFamily: MONO, fontSize: 8, letterSpacing: 0.3, outline: "none", boxSizing: "border-box" as const }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Add link */}
          {(card.links ?? []).length < 8 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                  placeholder="label..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3, padding: "5px 8px", color: "rgba(255,255,255,0.55)", fontFamily: MONO, fontSize: 8.5, outline: "none", letterSpacing: 0.5, textTransform: "uppercase" as const }}
                />
                <input
                  value={newIcon}
                  onChange={e => setNewIcon(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                  placeholder="🔗"
                  maxLength={2}
                  style={{ width: 32, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3, padding: "5px 4px", color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center", outline: "none", flexShrink: 0 }}
                />
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onMouseDown={e => e.stopPropagation()}
                  onKeyDown={e => e.key === "Enter" && addLink()}
                  placeholder="https://..."
                  type="url"
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3, padding: "5px 8px", color: "rgba(255,255,255,0.55)", fontFamily: MONO, fontSize: 8.5, outline: "none", letterSpacing: 0.3 }}
                />
                <button
                  onClick={addLink}
                  onMouseDown={e => e.stopPropagation()}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 3, color: "rgba(255,255,255,0.45)", fontFamily: MONO, fontSize: 8, letterSpacing: 1, cursor: "pointer", padding: "5px 8px", flexShrink: 0, textTransform: "uppercase" as const }}
                >+</button>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

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

          {/* Font picker */}
          <div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>font</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
              {FONTS.map(f => (
                <button
                  key={f.key}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => updateCard(card.id, { font: f.key })}
                  style={{
                    padding: "4px 8px", borderRadius: 3, cursor: "pointer",
                    border: card.font === f.key ? "1px solid rgba(212,240,196,0.38)" : "1px solid rgba(255,255,255,0.08)",
                    background: card.font === f.key ? "rgba(212,240,196,0.1)" : "rgba(255,255,255,0.03)",
                    color: card.font === f.key ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.38)",
                    fontFamily: f.style, fontSize: 9, letterSpacing: 0.3,
                  }}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Text color */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, width: 44, flexShrink: 0 }}>text</span>
            <div style={{ position: "relative", width: 28, height: 20, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}>
              {card.textColor && <div style={{ position: "absolute", inset: 0, background: card.textColor }} />}
              <input type="color"
                value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={e => updateCard(card.id, { textColor: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* Bg + border radius */}
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

export default memo(LinksCardWidget);
