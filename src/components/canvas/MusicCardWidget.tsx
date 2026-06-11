"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MusicCardData, TextFont, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import { uploadToStorage } from "@/lib/storage";
import { detectBgMode } from "@/lib/bgStyle";
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, ColorSwatch, TextInput, ActionButton, Divider, Collapsible } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";

const FONTS = CANVAS_FONTS;

export function musicLabel(url: string): string {
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
  const cardRef  = useRef<HTMLDivElement>(null);
  const bgImgRef = useRef<HTMLInputElement>(null);

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
  function patchBorder(patch: Partial<NonNullable<CardEffects["border"]>>) {
    updateCard(card.id, { effects: { ...card.effects, border: { ...card.effects?.border, ...patch } } });
  }
  function patchGlow(patch: Partial<NonNullable<CardEffects["glow"]>>) {
    updateCard(card.id, { effects: { ...card.effects, glow: { ...card.effects?.glow, ...patch } } });
  }
  function patchShadow(patch: Partial<NonNullable<CardEffects["shadow"]>>) {
    updateCard(card.id, { effects: { ...card.effects, shadow: { ...card.effects?.shadow, ...patch } } });
  }
  function patchGradient(patch: Partial<NonNullable<CardEffects["gradient"]>>) {
    const base = card.effects?.gradient ?? { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 };
    updateCard(card.id, { effects: { ...card.effects, gradient: { ...base, ...patch } } });
  }
  function patchInteractions(patch: Partial<NonNullable<CardEffects["interactions"]>>) {
    updateCard(card.id, { effects: { ...card.effects, interactions: { ...card.effects?.interactions, ...patch } } });
  }
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    updateCard(card.id, { effects: { ...card.effects, animations: { ...card.effects?.animations, ...patch } } });
  }
  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    const bgMode = await detectBgMode(publicUrl);
    updateCard(card.id, { bgImage: publicUrl, bgMode, effects: { ...card.effects, bg: { ...card.effects?.bg, image: publicUrl, imageMode: bgMode } } });
    if (bgImgRef.current) bgImgRef.current.value = "";
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
          zIndex: card.zIndex + card.layer * 100 + (isSel ? SELECTION_Z_BOOST : 0), transform: `${parallaxTransform} rotate(${card.rotation}deg)`,
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
          </MenuSection>

          <Divider />

          {/* FONDO */}
          {(() => {
            const bg   = card.effects?.bg;
            const grad = card.effects?.gradient;
            return (
              <MenuSection label="Fondo">
                <MenuRow label="Color">
                  <ColorSwatch value={bg?.color ?? "#141416"} onChange={v => patchBg({ color: v })}
                    clearable={!!bg?.color} onClear={() => patchBg({ color: undefined })} />
                </MenuRow>
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
                  onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Blur" min={0} max={24} step={1} value={bg?.blur ?? 0}
                  onChange={v => patchBg({ blur: v || undefined })} unit="px" />
                <MenuRow label="Glass">
                  <Toggle value={!!bg?.glass} onChange={v => patchBg({ glass: v })} />
                </MenuRow>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <MenuRow label="Gradiente">
                    <Toggle value={!!grad} onChange={v => {
                      if (v) updateCard(card.id, { effects: { ...card.effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } } });
                      else updateCard(card.id, { effects: { ...card.effects, gradient: undefined } });
                    }} />
                  </MenuRow>
                  {grad && (<>
                    <MenuRow label="Color A"><ColorSwatch value={grad.from} onChange={v => patchGradient({ from: v })} /></MenuRow>
                    <MenuRow label="Color B"><ColorSwatch value={grad.to} onChange={v => patchGradient({ to: v })} /></MenuRow>
                    <SliderRow label="Ángulo" min={0} max={360} step={5} value={grad.angle} onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
                    <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={grad.opacity} onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                  </>)}
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ display: "flex", gap: T.space[2] }}>
                    <ActionButton onClick={() => bgImgRef.current?.click()} fullWidth>
                      {bg?.image ? "Cambiar imagen" : "Imagen de fondo"}
                    </ActionButton>
                    {bg?.image && <ActionButton variant="danger" onClick={() => patchBg({ image: undefined })} fullWidth>Quitar</ActionButton>}
                  </div>
                </div>
              </MenuSection>
            );
          })()}

          <Divider />

          {/* TEXTO */}
          <MenuSection label="Texto">
            <MenuRow label="Color">
              <ColorSwatch value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={v => updateCard(card.id, { textColor: v })} />
            </MenuRow>
            <SliderRow label="Tamaño" min={7} max={18} step={1} value={card.textSize ?? 8}
              onChange={v => updateCard(card.id, { textSize: v })} unit="px" />
            <div style={{ marginTop: T.space[2] }}>
              <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>
                Fuente
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, maxHeight: 120, overflowY: "auto" }}>
                {FONTS.map(f => (
                  <button key={f.key} onMouseDown={e => e.stopPropagation()} onClick={() => updateCard(card.id, { font: f.key })}
                    style={{ padding: "4px 8px", borderRadius: T.radius.xs, cursor: "pointer", border: card.font === f.key ? `1px solid ${T.border.strong}` : `1px solid ${T.border.subtle}`, background: card.font === f.key ? T.surface.overlay : "transparent", color: card.font === f.key ? T.text.primary : T.text.muted, fontFamily: f.style, fontSize: 9, letterSpacing: 0.3 }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </MenuSection>

          <Divider />

          {/* EFECTOS */}
          {(() => {
            const glow = card.effects?.glow;
            const sh   = card.effects?.shadow;
            const bord = card.effects?.border;
            const anyGlow = !!(glow?.outer || glow?.inner);
            return (
              <MenuSection label="Efectos">
                <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Glow</div>
                <MenuRow label="Exterior"><Toggle value={!!glow?.outer} onChange={v => patchGlow({ outer: v })} /></MenuRow>
                <MenuRow label="Interior"><Toggle value={!!glow?.inner} onChange={v => patchGlow({ inner: v })} /></MenuRow>
                {anyGlow && (<>
                  <MenuRow label="Color"><ColorSwatch value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} /></MenuRow>
                  <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={glow?.intensity ?? 0} onChange={v => patchGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                </>)}
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Sombra</div>
                  <MenuRow label="Color"><ColorSwatch value={sh?.color ?? "#000000"} onChange={v => patchShadow({ color: v })} /></MenuRow>
                  <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={sh?.intensity ?? 0} onChange={v => patchShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Borde</div>
                  <MenuRow label="Color">
                    <ColorSwatch value={bord?.color ?? "#ffffff"} onChange={v => patchBorder({ color: v })}
                      clearable={!!bord?.color} onClear={() => patchBorder({ color: undefined })} />
                  </MenuRow>
                  <SliderRow label="Grosor" min={0} max={6} step={0.5} value={bord?.width ?? 1} onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`} />
                  <SliderRow label="Radio" min={0} max={60} step={1} value={bord?.radius ?? 10} onChange={v => patchBorder({ radius: v })} unit="px" />
                </div>
              </MenuSection>
            );
          })()}

          {/* ANIMAR */}
          <Collapsible label="Animar">
            {(() => {
              const inter = card.effects?.interactions;
              const anim  = card.effects?.animations;
              return (<>
                <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Flotación</div>
                <MenuRow label="Activar"><Toggle value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} /></MenuRow>
                {anim?.floating && (<>
                  <SliderRow label="Altura" min={2} max={24} step={1} value={anim?.floatHeight ?? 8} onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
                  <SliderRow label="Velocidad" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? 3} onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
                </>)}
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Inclinación 3D</div>
                  <MenuRow label="Activar"><Toggle value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} /></MenuRow>
                  {inter?.tilt3d && <SliderRow label="Intensidad" min={1} max={15} step={0.5} value={inter?.tiltIntensity ?? 6} onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`} />}
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Spotlight</div>
                  <MenuRow label="Activar"><Toggle value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} /></MenuRow>
                  {inter?.spotlight && (<>
                    <MenuRow label="Color">
                      <ColorSwatch value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"} onChange={v => patchInteractions({ spotlightColor: v })} />
                    </MenuRow>
                    <SliderRow label="Radio" min={20} max={100} step={1} value={inter?.spotlightSize ?? 65} onChange={v => patchInteractions({ spotlightSize: v })} unit="%" />
                  </>)}
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Hover</div>
                  <MenuRow label="Glow al pasar"><Toggle value={!!inter?.hoverGlow} onChange={v => patchInteractions({ hoverGlow: v })} /></MenuRow>
                </div>
              </>);
            })()}
          </Collapsible>

          {onDelete && (
            <div style={{ marginTop: T.space[4], paddingTop: T.space[4], borderTop: `1px solid ${T.border.subtle}` }}>
              <ActionButton variant="danger" fullWidth onClick={() => { onDelete(card.id); setMenuOpen(false); }}>
                Eliminar modulo
              </ActionButton>
            </div>
          )}
        </MenuPanel>,
        document.body
      )}
      <input ref={bgImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
    </>
  );
}

export default memo(MusicCardWidget);
