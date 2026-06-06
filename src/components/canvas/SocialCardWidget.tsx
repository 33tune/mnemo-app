"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { SocialCardData, SocialLink, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { SocialIconBtn, detectPlatform } from "./SocialIcons";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import PersonalizePanel from "./PersonalizePanel";
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, ColorSwatch, TextInput, ActionButton, Divider, Collapsible } from "@/ui";

type InternalDrag = { id: string; startX: number; startY: number; startMouseX: number; startMouseY: number };

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
  onDelete?:         (id: string) => void;
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function SocialCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, onDelete, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [portalPos,    setPortalPos]    = useState<{ left: number; top: number } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalDrag | null>(null);
  const pendingPositions = useRef<Record<string, { x: number; y: number }>>({});
  const cardRef = useRef<HTMLDivElement>(null);

  const effectiveEffects: CardEffects = {
    ...card.effects,
    bg:     { color: card.bgColor, image: card.bgImage, imageMode: card.bgMode, ...card.effects?.bg },
    border: { color: card.borderColor, width: card.borderWidth, radius: card.borderRadius ?? 14, ...card.effects?.border },
    glow:   { color: card.glowColor, intensity: card.glowIntensity, outer: true, ...card.effects?.glow },
    opacity: card.effects?.opacity ?? card.opacity,
  };

  const iconSize     = card.iconSize ?? 16;
  const borderRadius = effectiveEffects.border?.radius ?? 14;

  const { onMouseMove: onInteractMove, onMouseLeave: onInteractLeave } =
    useCardInteractions(effectiveEffects, cardRef as React.RefObject<HTMLElement | null>);

  useEffect(() => {
    if (!menuOpen) { setPortalPos(null); return; }
    const compute = () => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const MENU_W = T.comp.panelWidth, GAP = 10;
      const left = r.right + GAP + MENU_W > window.innerWidth ? Math.max(4, r.left - MENU_W - GAP) : r.right + GAP;
      setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
    };
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => { window.removeEventListener("scroll", compute, true); window.removeEventListener("resize", compute); };
  }, [menuOpen, card.x, card.y]);

  useEffect(() => { if (!isSel) setMenuOpen(false); }, [isSel]);

  function addSocialLink() {
    const url = newSocialUrl.trim();
    if (!url) return;
    updateCard(card.id, { socialLinks: [...(card.socialLinks ?? []), { id: crypto.randomUUID(), platform: detectPlatform(url), url }] });
    setNewSocialUrl("");
  }

  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    updateCard(card.id, { effects: { ...card.effects, bg: { ...card.effects?.bg, ...patch } } });
  }
  function patchEffects(patch: CardEffects) {
    updateCard(card.id, { effects: patch });
  }

  const onIconMouseDown = useCallback((e: React.MouseEvent, sl: SocialLink) => {
    if (!isSel || !canInteract) return;
    e.stopPropagation(); e.preventDefault();
    pendingPositions.current = {};
    setInternalDrag({ id: sl.id, startX: sl.x ?? 0, startY: sl.y ?? 0, startMouseX: e.clientX, startMouseY: e.clientY });
  }, [isSel, canInteract]);

  const onCardMouseMove = useCallback((e: React.MouseEvent) => {
    if (internalDrag) {
      e.stopPropagation();
      const dx = e.clientX - internalDrag.startMouseX, dy = e.clientY - internalDrag.startMouseY;
      pendingPositions.current[internalDrag.id] = { x: internalDrag.startX + dx, y: internalDrag.startY + dy };
      return;
    }
    onInteractMove(e);
  }, [internalDrag, onInteractMove]);

  const onCardMouseUp = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const dragged = pendingPositions.current[internalDrag.id];
    if (dragged) {
      const sl = (card.socialLinks ?? []).find(s => s.id === internalDrag.id);
      if (sl) {
        let baseX = internalDrag.startX, baseY = internalDrag.startY;
        if (sl.x === undefined || sl.y === undefined) {
          const cardEl = cardRef.current;
          const iconEl = cardEl?.querySelector(`[data-icon-id="${sl.id}"]`) as HTMLElement | null;
          if (cardEl && iconEl) {
            const cr = cardEl.getBoundingClientRect(), ir = iconEl.getBoundingClientRect();
            baseX = ir.left - cr.left + ir.width / 2; baseY = ir.top - cr.top + ir.height / 2;
          }
        }
        const dx = e.clientX - internalDrag.startMouseX, dy = e.clientY - internalDrag.startMouseY;
        updateCard(card.id, { socialLinks: (card.socialLinks ?? []).map(s => s.id === internalDrag.id ? { ...s, x: baseX + dx, y: baseY + dy } : s) });
      }
    }
    setInternalDrag(null); pendingPositions.current = {};
  }, [internalDrag, card.id, card.socialLinks, updateCard]);

  const hasPositionedIcons = (card.socialLinks ?? []).some(sl => sl.x !== undefined && sl.y !== undefined);

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={menuOpen ? e => e.stopPropagation() : internalDrag ? undefined : onMouseDown}
        onMouseMove={onCardMouseMove}
        onMouseUp={onCardMouseUp}
        onMouseLeave={onInteractLeave}
        onClick={onClick}
        style={{
          position: "absolute", left: card.x, top: card.y, width: card.w, height: card.h,
          zIndex: card.zIndex + card.layer * 100, transform: `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform", userSelect: "none",
          cursor: internalDrag ? "grabbing" : draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
          ...entryAnimStyle,
        }}
      >
        <CardLayers cardId={card.id} effects={effectiveEffects} isSel={isSel} borderRadius={borderRadius}>
          <div style={{
            position: "absolute", inset: 0, borderRadius,
            ...(hasPositionedIcons ? {} : { display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2, padding: "10px 12px" }),
            overflow: "hidden",
          }}>
            {(card.socialLinks ?? []).length === 0 ? (
              <span style={{ fontFamily: T.font.mono, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>social</span>
            ) : (
              (card.socialLinks ?? []).map(sl => {
                const hasPos = sl.x !== undefined && sl.y !== undefined;
                return (
                  <div key={sl.id} data-icon-id={sl.id}
                    onMouseDown={isSel && canInteract ? e => onIconMouseDown(e, sl) : undefined}
                    style={hasPos ? { position: "absolute", left: sl.x, top: sl.y, transform: "translate(-50%,-50%)", cursor: isSel && canInteract ? "grab" : "default", zIndex: internalDrag?.id === sl.id ? 10 : 1 } : { cursor: isSel && canInteract ? "grab" : "default", flexShrink: 0 }}
                  >
                    <SocialIconBtn platform={detectPlatform(sl.url)} url={sl.url} color={card.textColor || "rgba(255,255,255,0.75)"} size={iconSize} />
                  </div>
                );
              })
            )}
          </div>
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

          {/* Header */}
          <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.1em", textTransform: "uppercase", color: T.text.muted, marginBottom: T.space[4] }}>
            Social Card
          </div>

          {/* CONTENIDO */}
          <MenuSection label="Contenido" first>
            {(card.socialLinks ?? []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(card.socialLinks ?? []).map((sl, idx) => (
                  <div key={sl.id} style={{ display: "flex", alignItems: "center", gap: 6, background: T.surface.raised, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: "5px 8px" }}>
                    <SocialIconBtn platform={detectPlatform(sl.url)} url={sl.url} color={T.text.secondary} size={12} />
                    <span style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sl.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}
                    </span>
                    {sl.x !== undefined && (
                      <button title="Reset position" onClick={() => updateCard(card.id, { socialLinks: (card.socialLinks ?? []).map((s, i) => i === idx ? { ...s, x: undefined, y: undefined } : s) })} onMouseDown={e => e.stopPropagation()}
                        style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 10, cursor: "pointer", padding: "0 2px" }}
                        onMouseEnter={e => e.currentTarget.style.color = T.text.primary} onMouseLeave={e => e.currentTarget.style.color = T.text.muted}>
                        ⊙
                      </button>
                    )}
                    <button onClick={() => updateCard(card.id, { socialLinks: (card.socialLinks ?? []).filter((_, i) => i !== idx) })} onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = T.accent.danger} onMouseLeave={e => e.currentTarget.style.color = T.text.muted}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(card.socialLinks ?? []).length < 12 && (
              <div style={{ display: "flex", gap: 6 }}>
                <TextInput value={newSocialUrl} onChange={setNewSocialUrl} mono type="url"
                  placeholder="instagram, github, discord…"
                  onKeyDown={e => e.key === "Enter" && addSocialLink()} />
                <button onClick={addSocialLink} onMouseDown={e => e.stopPropagation()}
                  style={{ height: T.comp.inputH, padding: "0 12px", background: T.surface.raised, border: `1px solid ${T.border.default}`, borderRadius: T.radius.md, color: T.text.secondary, fontFamily: T.font.mono, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                  +
                </button>
              </div>
            )}
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
            <SliderRow label="Tamano icono" min={12} max={40} step={1}
              value={card.iconSize ?? 16}
              onChange={v => updateCard(card.id, { iconSize: v })} unit="px" />
          </MenuSection>

          {/* EFECTOS AVANZADOS */}
          <Collapsible label="Efectos avanzados">
            <PersonalizePanel effects={card.effects} onChange={patchEffects} tabs={["efectos", "animar"]} />
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

export default memo(SocialCardWidget);
