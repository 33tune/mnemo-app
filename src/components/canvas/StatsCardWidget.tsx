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
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, ColorSwatch, ActionButton, Divider, Collapsible } from "@/ui";

const DEFAULT_STATS: StatBlock[] = [
  { id: "views",     visible: true },
  { id: "favorites", visible: true },
];

function fmtNum(n: number): string {
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
  onDelete?:         (id: string) => void;
}

function StatsCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  entryAnimStyle = {}, ownerUserId, onDelete,
}: Props) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
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
      const MENU_W = T.comp.panelWidth, GAP = 10;
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

  useEffect(() => { if (!isSel) setMenuOpen(false); }, [isSel]);

  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    updateCard(card.id, { effects: { ...card.effects, bg: { ...card.effects?.bg, ...patch } } });
  }

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
                <span style={{ fontFamily: T.font.mono, fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const }}>
                  {getStatLabel(block)}
                </span>
                <span style={{ fontFamily: T.font.mono, fontSize: 11, color: textColor, fontWeight: 600 }}>
                  {fmtNum(getStatValue(block.id))}
                </span>
              </div>
            ))}

            {layout === "compact" && visibleStats.map((block, i) => (
              <div key={block.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>}
                <span style={{ fontFamily: T.font.mono, fontSize: 10, color: textColor, fontWeight: 600 }}>
                  {fmtNum(getStatValue(block.id))}
                </span>
                <span style={{ fontFamily: T.font.mono, fontSize: 6.5, letterSpacing: 1, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const }}>
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
                const MENU_W = T.comp.panelWidth, GAP = 10;
                const left = r.right + GAP + MENU_W > window.innerWidth ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 140) });
              } else setPortalPos(null);
              setMenuOpen(next);
            }}
            style={{
              position: "absolute", top: -10, left: -10,
              width: 20, height: 20, borderRadius: "50%",
              background: menuOpen ? "rgba(255,255,255,0.12)" : T.surface.canvas,
              border: `1px solid ${menuOpen ? T.border.strong : T.border.default}`,
              cursor: "pointer", zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: T.shadow.sm,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
              stroke={menuOpen ? T.text.primary : T.text.secondary}
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
              border: locked ? "1px solid rgba(255,180,60,0.3)" : `1px solid ${T.border.subtle}`,
              color: locked ? "rgba(255,180,60,0.9)" : T.text.muted,
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
              background: T.surface.canvas, border: `1px solid ${T.border.default}`,
              cursor: "crosshair", zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.text.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
          </div>
        )}

        {isSel && canInteract && !locked && <ResizeHandles onResizeMD={onResizeMD} />}
      </div>

      {/* Config portal */}
      {menuOpen && canInteract && portalPos && createPortal(
        <MenuPanel pos={portalPos} onKeyDown={e => { if (e.key === "Escape") setMenuOpen(false); }}>

          {/* Header */}
          <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.12em", color: T.text.muted, textTransform: "uppercase", paddingBottom: T.space[3], marginBottom: T.space[2] }}>
            Stats
          </div>

          {/* CONTENIDO */}
          <MenuSection label="Contenido" first>
            {/* Stat toggles with live values */}
            <div style={{ display: "flex", flexDirection: "column", gap: T.space[1] }}>
              {stats.map(block => (
                <div key={block.id}
                  onClick={() => toggleStat(block.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: `${T.space[2]}px ${T.space[3]}px`, borderRadius: T.radius.sm, cursor: "pointer",
                    background: block.visible ? T.surface.overlay : T.surface.input,
                    border: `1px solid ${block.visible ? T.border.default : T.border.subtle}`,
                    transition: "all 0.12s ease",
                  }}
                >
                  <span style={{ fontFamily: T.font.mono, fontSize: T.size.xs, color: block.visible ? T.text.secondary : T.text.muted, letterSpacing: "0.05em" }}>
                    {getStatLabel(block)}
                  </span>
                  <span style={{ fontFamily: T.font.mono, fontSize: T.size.sm, color: block.visible ? T.text.primary : T.text.muted, fontWeight: 600 }}>
                    {fmtNum(getStatValue(block.id))}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: T.space[3] }}>
              <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase", marginBottom: T.space[2] }}>
                Diseño
              </div>
              <div style={{ display: "flex", gap: T.space[1] }}>
                {(["grid", "list", "compact"] as const).map(l => (
                  <button key={l}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => updateCard(card.id, { displayLayout: l })}
                    style={{
                      flex: 1, padding: `${T.space[1]}px 0`, borderRadius: T.radius.xs, cursor: "pointer",
                      fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.05em",
                      textTransform: "uppercase" as const,
                      border: layout === l ? `1px solid ${T.border.strong}` : `1px solid ${T.border.subtle}`,
                      background: layout === l ? T.surface.overlay : T.surface.input,
                      color: layout === l ? T.text.primary : T.text.muted,
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>
          </MenuSection>

          <Divider />

          {/* FONDO */}
          <MenuSection label="Fondo">
            <MenuRow label="Color">
              <ColorSwatch
                value={effectiveEffects.bg?.color ?? "#141416"}
                onChange={v => patchBg({ color: v })}
                clearable={!!effectiveEffects.bg?.color}
                onClear={() => patchBg({ color: undefined })}
              />
            </MenuRow>
            <SliderRow label="Opacidad" min={0} max={1} step={0.01}
              value={effectiveEffects.bg?.opacity ?? 1}
              onChange={v => patchBg({ opacity: v })}
              fmt={v => `${Math.round(v * 100)}%`} />
            <SliderRow label="Blur" min={0} max={24} step={1}
              value={effectiveEffects.bg?.blur ?? 0}
              onChange={v => patchBg({ blur: v || undefined })}
              unit="px" />
            <MenuRow label="Glass">
              <Toggle value={!!effectiveEffects.bg?.glass} onChange={v => patchBg({ glass: v })} />
            </MenuRow>
          </MenuSection>

          <Divider />

          {/* TEXTO */}
          <MenuSection label="Texto">
            <MenuRow label="Color">
              <ColorSwatch
                value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={v => updateCard(card.id, { textColor: v })}
              />
            </MenuRow>
            <SliderRow label="Tamaño" min={7} max={18} step={0.5}
              value={card.textSize ?? 13}
              onChange={v => updateCard(card.id, { textSize: v })}
              unit="px" />
          </MenuSection>

          {/* EFECTOS AVANZADOS */}
          <Collapsible label="Efectos avanzados">
            <PersonalizePanel
              effects={card.effects}
              onChange={newEffects => updateCard(card.id, { effects: newEffects })}
              tabs={["efectos", "animar"]}
            />
          </Collapsible>

          {/* Eliminar */}
          {onDelete && (
            <div style={{ marginTop: T.space[4], paddingTop: T.space[4], borderTop: `1px solid ${T.border.subtle}` }}>
              <ActionButton variant="danger" onClick={() => onDelete(card.id)} fullWidth>
                Eliminar modulo
              </ActionButton>
            </div>
          )}
        </MenuPanel>,
        document.body
      )}
    </>
  );
}

function StatItem({ label, value, textColor }: { label: string; value: number; textColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontFamily: T.font.mono, fontSize: 13, color: textColor, fontWeight: 700, lineHeight: 1 }}>
        {fmtNum(value)}
      </span>
      <span style={{ fontFamily: T.font.mono, fontSize: 6.5, letterSpacing: 1.5, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, marginTop: 3 }}>
        {label}
      </span>
    </div>
  );
}

export default memo(StatsCardWidget);
