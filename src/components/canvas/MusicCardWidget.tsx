"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MusicCardData, TextFont, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import PersonalizePanel from "./PersonalizePanel";

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

function musicLabel(url: string): string {
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const { hostname, pathname } = new URL(full);
    const service = hostname.replace(/^(www|open)\./i, "").split(".")[0].toUpperCase();
    const slug    = pathname.split("/").filter(Boolean).pop() ?? "";
    return slug ? `${service} · ${slug.slice(0, 20)}` : service;
  } catch {
    return url.slice(0, 24);
  }
}

interface Props {
  card:              MusicCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateCard:        (id: string, patch: Partial<MusicCardData>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function MusicCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [hov,        setHov]        = useState(false);
  const [portalPos,  setPortalPos]  = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Build effective effects (backwards compat with flat fields)
  const effectiveEffects: CardEffects = {
    ...card.effects,
    bg: {
      color:     card.bgColor,
      image:     card.bgImage,
      imageMode: card.bgMode,
      ...card.effects?.bg,
    },
    border: {
      color:  card.borderColor,
      width:  card.borderWidth,
      radius: card.borderRadius ?? 10,
      ...card.effects?.border,
    },
    glow: {
      color:     card.glowColor,
      intensity: card.glowIntensity,
      outer:     true,
      ...card.effects?.glow,
    },
    opacity: card.effects?.opacity ?? card.opacity,
  };

  const borderRadius = effectiveEffects.border?.radius ?? 10;
  const textColor    = card.textColor || "rgba(255,255,255,0.62)";
  const fontStyle    = FONTS.find(f => f.key === card.font)?.style ?? MONO;
  const hasUrl       = !!(card.musicUrl?.trim());
  const href         = hasUrl ? (card.musicUrl!.startsWith("http") ? card.musicUrl! : `https://${card.musicUrl}`) : "";

  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>);

  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const MENU_W = 272, GAP = 10;
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

  useEffect(() => { if (!isSel) { setMenuOpen(false); setPersonalize(false); } }, [isSel]);

  return (
    <>
      <style>{`@keyframes mwDot{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}`}</style>
      <div
        ref={cardRef}
        onMouseDown={menuOpen ? e => e.stopPropagation() : onMouseDown}
        onMouseMove={onInteractMove}
        onMouseLeave={onInteractLeave}
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
          ...entryAnimStyle,
        }}
      >
        <CardLayers
          cardId={card.id}
          effects={effectiveEffects}
          isSel={isSel}
          borderRadius={borderRadius}
        >
          {/* Content */}
          <a
            href={hasUrl ? href : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => { if (menuOpen || !hasUrl) e.preventDefault(); e.stopPropagation(); }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
              position:       "absolute",
              inset:          0,
              borderRadius,
              display:        "flex",
              alignItems:     "center",
              gap:            10,
              padding:        "0 14px",
              textDecoration: "none",
              cursor:         hasUrl ? "pointer" : "default",
              opacity:        hov && hasUrl ? 1 : 0.85,
              transition:     "opacity 0.12s ease",
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              animation: hasUrl ? "mwDot 1.8s ease-in-out infinite" : "none",
              flexShrink: 0,
            }} />
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div style={{ fontFamily: fontStyle, fontSize: 6, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, lineHeight: 1, marginBottom: 3 }}>
                NOW PLAYING
              </div>
              <div style={{ fontFamily: fontStyle, fontSize: 8, letterSpacing: 0.5, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {hasUrl ? musicLabel(card.musicUrl!) : "paste a url →"}
              </div>
              {card.mood && (
                <div style={{ fontFamily: fontStyle, fontSize: 7, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>{card.mood}</div>
              )}
            </div>
          </a>
        </CardLayers>

        {/* Gear */}
        {isSel && canInteract && (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              const next = !menuOpen;
              if (next && cardRef.current) {
                const r = cardRef.current.getBoundingClientRect();
                const MENU_W = 272, GAP = 10;
                const left = r.right + GAP + MENU_W > window.innerWidth ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
              } else setPortalPos(null);
              setMenuOpen(next);
              if (!next) setPersonalize(false);
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
            width: 272, background: "#09090b",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
            padding: "18px 14px 22px", zIndex: 999999,
            boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
            fontFamily: SANS, display: "flex", flexDirection: "column", gap: 12,
            maxHeight: `calc(100vh - ${portalPos.top + 8}px)`, overflowY: "auto",
          } as CSSProperties}
        >
          {/* ── View A: Content ── */}
          {!personalize && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
                music
              </div>

              {/* URL */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>url</div>
                <input
                  value={card.musicUrl ?? ""}
                  onChange={e => updateCard(card.id, { musicUrl: e.target.value })}
                  onMouseDown={e => e.stopPropagation()}
                  placeholder="spotify / youtube / soundcloud..."
                  type="url"
                  style={{
                    display: "block", width: "100%",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 3, padding: "6px 8px", color: "rgba(255,255,255,0.55)",
                    fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.3,
                    outline: "none", boxSizing: "border-box" as const,
                  }}
                />
              </div>

              {/* Mood */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>mood</div>
                <input
                  value={card.mood ?? ""}
                  onChange={e => updateCard(card.id, { mood: e.target.value })}
                  onMouseDown={e => e.stopPropagation()}
                  placeholder="e.g. lofi, dark ambient..."
                  maxLength={32}
                  style={{
                    display: "block", width: "100%",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 3, padding: "6px 8px", color: "rgba(255,255,255,0.55)",
                    fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.3,
                    outline: "none", boxSizing: "border-box" as const,
                  }}
                />
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

              {/* Font picker */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>font</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                  {FONTS.map(f => (
                    <button key={f.key} onMouseDown={e => e.stopPropagation()} onClick={() => updateCard(card.id, { font: f.key })}
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

              {/* Background quick controls */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>fondo</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ position: "relative", width: 28, height: 22, borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", flexShrink: 0 }}>
                    {effectiveEffects.bg?.color && <div style={{ position: "absolute", inset: 0, background: effectiveEffects.bg.color }} />}
                    <input type="color"
                      value={effectiveEffects.bg?.color?.startsWith("#") ? effectiveEffects.bg.color : "#141416"}
                      onChange={e => updateCard(card.id, { effects: { ...card.effects, bg: { ...card.effects?.bg, color: e.target.value } } })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={effectiveEffects.bg?.opacity ?? 1}
                    onChange={e => updateCard(card.id, { effects: { ...card.effects, bg: { ...card.effects?.bg, opacity: Number(e.target.value) } } })}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ flex: 1, accentColor: "rgba(212,240,196,0.8)" }} />
                  <span style={{ fontFamily: MONO, fontSize: 7, color: "rgba(255,255,255,0.3)", minWidth: 24, textAlign: "right" }}>
                    {Math.round((effectiveEffects.bg?.opacity ?? 1) * 100)}%
                  </span>
                  {effectiveEffects.bg?.color && (
                    <button onClick={() => updateCard(card.id, { bgColor: "", effects: { ...card.effects, bg: { ...card.effects?.bg, color: undefined } } })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
                  )}
                </div>
              </div>

              {/* Personalizar button */}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setPersonalize(true); }}
                style={{
                  marginTop: 4, padding: "8px 0", borderRadius: 5, cursor: "pointer",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", fontFamily: MONO, fontSize: 8, letterSpacing: 1.5,
                  textTransform: "uppercase" as const, width: "100%", transition: `all 0.12s ${EASE}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,240,196,0.07)"; e.currentTarget.style.borderColor = "rgba(212,240,196,0.2)"; e.currentTarget.style.color = "rgba(212,240,196,0.7)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                Personalizar →
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
                onChange={newEffects => updateCard(card.id, { effects: newEffects })}
              />
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export default memo(MusicCardWidget);
