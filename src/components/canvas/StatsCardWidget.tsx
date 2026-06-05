"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { StatsCardData, StatBlock, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import PersonalizePanel from "./PersonalizePanel";
import { useProfileViews } from "@/hooks/useProfileViews";
import { useFavoriteCount } from "@/hooks/useFavoriteCount";

const MONO = "'Space Mono', monospace";
const SANS = "'DM Sans', sans-serif";
const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const DEFAULT_STATS: StatBlock[] = [
  { id: "views",     visible: true },
  { id: "favorites", visible: true },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  card:              StatsCardData;
  isSel:             boolean;
  draggingId:        string | null;
  parallaxTransform: string;
  onMouseDown:       (e: React.MouseEvent) => void;
  onClick:           (e: React.MouseEvent) => void;
  onResizeMD:        (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateMD:        (e: React.MouseEvent) => void;
  updateCard:        (id: string, patch: Partial<StatsCardData>) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
  ownerUserId?:      string;
}

function StatsCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  entryAnimStyle = {}, ownerUserId,
}: Props) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [portalPos,   setPortalPos]   = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { total: viewCount } = useProfileViews(ownerUserId);
  const { count: favCount  } = useFavoriteCount(ownerUserId);

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
  const textColor    = card.textColor || "rgba(255,255,255,0.75)";
  const stats        = card.stats ?? DEFAULT_STATS;
  const layout       = card.displayLayout ?? "grid";

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
      setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 140) });
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

  function getStatValue(id: string): number {
    switch (id) {
      case "views":     return viewCount;
      case "favorites": return favCount;
      default:          return 0;
    }
  }

  function getStatLabel(block: StatBlock): string {
    if (block.label) return block.label;
    switch (block.id) {
      case "views":     return "VIEWS";
      case "favorites": return "FAVS";
      default:          return block.id.toUpperCase();
    }
  }

  function toggleStat(id: string) {
    const next = stats.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    updateCard(card.id, { stats: next });
  }

  const visibleStats = stats.filter(s => s.visible);

  return (
    <>
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
          <div
            style={{
              position:    "absolute",
              inset:       0,
              borderRadius,
              display:     "flex",
              alignItems:  "center",
              justifyContent: layout === "list" ? "flex-start" : "center",
              flexDirection: layout === "list" ? "column" : "row",
              gap:         layout === "grid" ? 0 : 8,
              padding:     layout === "compact" ? "0 14px" : "8px 14px",
              overflow:    "hidden",
            }}
          >
            {layout === "grid" && (
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(visibleStats.length, 2)}, 1fr)`,
                gap: "2px 16px",
                width: "100%",
              }}>
                {visibleStats.map(block => (
                  <StatItem key={block.id} label={getStatLabel(block)} value={getStatValue(block.id)} textColor={textColor} />
                ))}
              </div>
            )}

            {layout === "list" && visibleStats.map(block => (
              <div key={block.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "2px 0" }}>
                <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const }}>
                  {getStatLabel(block)}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: textColor, fontWeight: 600 }}>
                  {fmt(getStatValue(block.id))}
                </span>
              </div>
            ))}

            {layout === "compact" && visibleStats.map((block, i) => (
              <div key={block.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>}
                <span style={{ fontFamily: MONO, fontSize: 10, color: textColor, fontWeight: 600 }}>
                  {fmt(getStatValue(block.id))}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 6.5, letterSpacing: 1, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const }}>
                  {getStatLabel(block)}
                </span>
              </div>
            ))}
          </div>
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
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 140) });
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
          {!personalize && (
            <>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>
                stats
              </div>

              {/* Stats toggles */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 8 }}>mostrar</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stats.map(block => (
                    <div key={block.id}
                      onClick={() => toggleStat(block.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 10px", borderRadius: 5, cursor: "pointer",
                        background: block.visible ? "rgba(212,240,196,0.06)" : "rgba(255,255,255,0.02)",
                        border: block.visible ? "1px solid rgba(212,240,196,0.18)" : "1px solid rgba(255,255,255,0.06)",
                        transition: `all 0.12s ${EASE}`,
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: 9, color: block.visible ? "rgba(212,240,196,0.85)" : "rgba(255,255,255,0.28)", letterSpacing: 0.5 }}>
                        {getStatLabel(block)}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: block.visible ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontWeight: 600 }}>
                        {fmt(getStatValue(block.id))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

              {/* Layout */}
              <div>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: "rgba(255,255,255,0.22)", textTransform: "uppercase" as const, marginBottom: 6 }}>diseño</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {(["grid", "list", "compact"] as const).map(l => (
                    <button key={l}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => updateCard(card.id, { displayLayout: l })}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: 4, cursor: "pointer", fontSize: 8,
                        fontFamily: MONO, letterSpacing: 0.5, textTransform: "uppercase" as const,
                        border: layout === l ? "1px solid rgba(212,240,196,0.38)" : "1px solid rgba(255,255,255,0.08)",
                        background: layout === l ? "rgba(212,240,196,0.1)" : "rgba(255,255,255,0.03)",
                        color: layout === l ? "rgba(212,240,196,0.9)" : "rgba(255,255,255,0.38)",
                      }}
                    >{l}</button>
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
                    <button onClick={() => updateCard(card.id, { bgColor: undefined, effects: { ...card.effects, bg: { ...card.effects?.bg, color: undefined } } })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 12, cursor: "pointer", padding: "0 2px" }}>×</button>
                  )}
                </div>
              </div>

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

function StatItem({ label, value, textColor }: { label: string; value: number; textColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: textColor, fontWeight: 700, lineHeight: 1 }}>
        {fmt(value)}
      </span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 6.5, letterSpacing: 1.5, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, marginTop: 3 }}>
        {label}
      </span>
    </div>
  );
}

export default memo(StatsCardWidget);
