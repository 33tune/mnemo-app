"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MusicCardData, TextFont, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import PersonalizePanel from "./PersonalizePanel";
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, ColorSwatch, TextInput, ActionButton, Divider, Collapsible } from "@/ui";

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
  } catch { return url.slice(0, 24); }
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
  onDelete?:         (id: string) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function MusicCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, onDelete, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [hov,       setHov]       = useState(false);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const effectiveEffects: CardEffects = {
    ...card.effects,
    bg:     { color: card.bgColor, image: card.bgImage, imageMode: card.bgMode, ...card.effects?.bg },
    border: { color: card.borderColor, width: card.borderWidth, radius: card.borderRadius ?? 10, ...card.effects?.border },
    glow:   { color: card.glowColor, intensity: card.glowIntensity, outer: true, ...card.effects?.glow },
    opacity: card.effects?.opacity ?? card.opacity,
  };

  const borderRadius = effectiveEffects.border?.radius ?? 10;
  const textColor    = card.textColor || "rgba(255,255,255,0.62)";
  const textSize     = card.textSize ?? 8;
  const fontStyle    = FONTS.find(f => f.key === card.font)?.style ?? T.font.mono;
  const hasUrl       = !!(card.musicUrl?.trim());
  const href         = hasUrl ? (card.musicUrl!.startsWith("http") ? card.musicUrl! : `https://${card.musicUrl}`) : "";

  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>);

  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const left = r.right + 10 + T.comp.panelWidth > window.innerWidth ? Math.max(4, r.left - T.comp.panelWidth - 10) : r.right + 10;
      setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => { window.removeEventListener("scroll", compute, true); window.removeEventListener("resize", compute); };
  }, [menuOpen, card.x, card.y]);

  useEffect(() => { if (!isSel) setMenuOpen(false); }, [isSel]);

  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    updateCard(card.id, { effects: { ...card.effects, bg: { ...card.effects?.bg, ...patch } } });
  }

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
          position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h,
          zIndex: card.zIndex + card.layer * 100, transform: `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform", userSelect: "none",
          cursor: draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
          ...entryAnimStyle,
        }}
      >
        <CardLayers cardId={card.id} effects={effectiveEffects} isSel={isSel} borderRadius={borderRadius}>
          <a href={hasUrl ? href : undefined} target="_blank" rel="noopener noreferrer"
            onClick={e => { if (menuOpen || !hasUrl) e.preventDefault(); e.stopPropagation(); }}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ position: "absolute", inset: 0, borderRadius, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", textDecoration: "none", cursor: hasUrl ? "pointer" : "default", opacity: hov && hasUrl ? 1 : 0.85, transition: "opacity 0.12s ease" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.55)", animation: hasUrl ? "mwDot 1.8s ease-in-out infinite" : "none", flexShrink: 0 }} />
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div style={{ fontFamily: fontStyle, fontSize: 6, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, lineHeight: 1, marginBottom: 3 }}>NOW PLAYING</div>
              <div style={{ fontFamily: fontStyle, fontSize: textSize, letterSpacing: 0.5, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {hasUrl ? musicLabel(card.musicUrl!) : "paste a url →"}
              </div>
              {card.mood && <div style={{ fontFamily: fontStyle, fontSize: Math.max(6, textSize - 2), color: "rgba(255,255,255,0.28)", marginTop: 2 }}>{card.mood}</div>}
            </div>
          </a>
        </CardLayers>

        {/* Gear */}
        {isSel && canInteract && (
          <div onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); const next = !menuOpen; if (next && cardRef.current) { const r = cardRef.current.getBoundingClientRect(); const left = r.right + 10 + T.comp.panelWidth > window.innerWidth ? Math.max(4, r.left - T.comp.panelWidth - 10) : r.right + 10; setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) }); } else setPortalPos(null); setMenuOpen(next); }}
            style={{ position: "absolute", top: -10, left: -10, width: 20, height: 20, borderRadius: "50%", background: menuOpen ? T.surface.overlay : "rgba(12,12,14,0.96)", border: `1px solid ${menuOpen ? T.border.strong : T.border.default}`, cursor: "pointer", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.shadow.sm }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={menuOpen ? T.text.primary : T.text.secondary} strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        )}

        {/* Lock */}
        {isSel && canInteract && onToggleLock && (
          <div onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onToggleLock(); }}
            style={{ position: "absolute", top: -22, right: 0, width: 16, height: 16, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: locked ? "rgba(255,180,60,0.15)" : "rgba(255,255,255,0.06)", border: locked ? "1px solid rgba(255,180,60,0.3)" : "1px solid rgba(255,255,255,0.07)", color: locked ? "rgba(255,180,60,0.9)" : "rgba(255,255,255,0.32)", zIndex: 20 }}>
            {locked ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    : <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>}
          </div>
        )}

        {/* Rotate */}
        {isSel && canInteract && !locked && (
          <div onMouseDown={e => { e.stopPropagation(); onRotateMD(e); }}
            style={{ position: "absolute", top: -10, right: -10, width: 20, height: 20, borderRadius: "50%", background: "rgba(12,12,14,0.96)", border: `1px solid ${T.border.default}`, cursor: "crosshair", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: T.shadow.sm }}>
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

          <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text.muted, marginBottom: T.space[4] }}>
            Music Card
          </div>

          {/* CONTENIDO */}
          <MenuSection label="Contenido" first>
            <TextInput value={card.musicUrl ?? ""} onChange={v => updateCard(card.id, { musicUrl: v })}
              mono type="url" placeholder="spotify / youtube / soundcloud…" />
            <TextInput value={card.mood ?? ""} onChange={v => updateCard(card.id, { mood: v })}
              placeholder="mood (calm, dark, hype…)" maxLength={32} />
            {/* Font picker */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 2 }}>
              {FONTS.map(f => (
                <button key={f.key} onMouseDown={e => e.stopPropagation()} onClick={() => updateCard(card.id, { font: f.key })}
                  style={{ padding: "4px 8px", borderRadius: T.radius.xs, cursor: "pointer", border: card.font === f.key ? `1px solid ${T.border.strong}` : `1px solid ${T.border.subtle}`, background: card.font === f.key ? T.surface.overlay : "transparent", color: card.font === f.key ? T.text.primary : T.text.muted, fontFamily: f.style, fontSize: 9, letterSpacing: 0.3 }}>
                  {f.label}
                </button>
              ))}
            </div>
          </MenuSection>

          <Divider />

          {/* FONDO */}
          <MenuSection label="Fondo">
            <MenuRow label="Color">
              <ColorSwatch value={effectiveEffects.bg?.color ?? "#141416"} onChange={v => patchBg({ color: v })}
                clearable={!!effectiveEffects.bg?.color} onClear={() => patchBg({ color: undefined })} />
            </MenuRow>
            <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={effectiveEffects.bg?.opacity ?? 1}
              onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            <SliderRow label="Blur" min={0} max={24} step={1} value={effectiveEffects.bg?.blur ?? 0}
              onChange={v => patchBg({ blur: v || undefined })} unit="px" />
            <MenuRow label="Glass">
              <Toggle value={!!effectiveEffects.bg?.glass} onChange={v => patchBg({ glass: v })} />
            </MenuRow>
          </MenuSection>

          <Divider />

          {/* TEXTO */}
          <MenuSection label="Texto">
            <MenuRow label="Color">
              <ColorSwatch value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={v => updateCard(card.id, { textColor: v })} />
            </MenuRow>
            <SliderRow label="Tamano" min={7} max={18} step={1} value={card.textSize ?? 8}
              onChange={v => updateCard(card.id, { textSize: v })} unit="px" />
          </MenuSection>

          {/* EFECTOS AVANZADOS */}
          <Collapsible label="Efectos avanzados">
            <PersonalizePanel effects={card.effects} onChange={e => updateCard(card.id, { effects: e })} tabs={["efectos", "animar"]} />
          </Collapsible>

          <Divider />

          {onDelete && (
            <ActionButton variant="danger" fullWidth onClick={() => { onDelete(card.id); setMenuOpen(false); }}>
              Eliminar modulo
            </ActionButton>
          )}
        </MenuPanel>,
        document.body
      )}
    </>
  );
}

export default memo(MusicCardWidget);
