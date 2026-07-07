"use client";
import { useState, useRef, useEffect, useCallback, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { LinksCardData, ProfileLink, CardEffects } from "@/types";
import { trackLinkClick } from "@/lib/trackLinkClick";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { detectPlatform, PlatformIcon, PLATFORM_COLORS, PLATFORM_LABELS } from "./SocialIcons";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import { uploadToStorage } from "@/lib/storage";
import { detectBgMode } from "@/lib/bgStyle";
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, Tabs, ColorSwatch, TextInput, ActionButton, Divider, Collapsible } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";

const FONTS = CANVAS_FONTS;

type InternalDrag = {
  id: string;
  startX: number;
  startY: number;
  startMouseX: number;
  startMouseY: number;
};

function LinkBtn({ link, editMode, ownerUserId, iconColor, iconSize, showText, fontStyle, fontSize, onDragStart, isSelected, canInteract }: {
  link: ProfileLink;
  editMode: boolean;
  ownerUserId?: string;
  iconColor: string;
  iconSize: number;
  showText: boolean;
  fontStyle: string;
  fontSize: number;
  onDragStart?: (e: React.MouseEvent, link: ProfileLink) => void;
  isSelected?: boolean;
  canInteract?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const safeUrl = !link.url ? null : link.url.startsWith("http") ? link.url : `https://${link.url}`;
  if (!safeUrl) return null;
  const platform = detectPlatform(link.url);
  const label = link.label || PLATFORM_LABELS[platform];
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseDown={canInteract && isSelected && onDragStart ? e => onDragStart(e, link) : undefined}
      onClick={e => {
        e.stopPropagation();
        if (!editMode) {
          if (ownerUserId) trackLinkClick(ownerUserId, label, safeUrl);
          window.open(safeUrl, "_blank", "noopener,noreferrer");
        }
      }}
      title={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: canInteract && isSelected ? "grab" : "pointer",
        opacity: hov ? 1 : 0.78,
        transition: "all 0.15s ease",
        userSelect: "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        flexShrink: 0,
      }}
    >
      <PlatformIcon platform={platform} size={iconSize} color={hov ? PLATFORM_COLORS[platform] : iconColor} />
      {showText && (
        <span style={{
          fontFamily: fontStyle, fontSize, fontWeight: 600,
          color: iconColor,
          letterSpacing: 1, textTransform: "uppercase" as const,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120,
        }}>
          {label}
        </span>
      )}
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
  onDelete?:         (id: string) => void;
}

function LinksCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, locked, onToggleLock, canInteract,
  ownerUserId, entryAnimStyle = {}, onDelete,
}: Props) {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [newUrl,       setNewUrl]       = useState("");
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editUrl,      setEditUrl]      = useState("");
  const [portalPos,    setPortalPos]    = useState<{ left: number; top: number } | null>(null);
  const [internalDrag, setInternalDrag] = useState<InternalDrag | null>(null);
  const pendingPositions = useRef<Record<string, { x: number; y: number }>>({});
  const cardRef  = useRef<HTMLDivElement>(null);
  const bgImgRef = useRef<HTMLInputElement>(null);

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
      radius: card.borderRadius ?? 14,
      ...card.effects?.border,
    },
    glow: {
      color:     card.glowColor,
      intensity: card.glowIntensity,
      outer:     true,
      ...card.effects?.glow,
    },
    opacity: card.effects?.opacity ?? card.opacity,
    padding: card.effects?.padding,
  };

  const borderRadius = effectiveEffects.border?.radius ?? 14;
  const fontStyle     = FONTS.find(f => f.key === card.font)?.style ?? T.font.sans;
  const fontSize      = card.textSize ?? 9;
  const iconSize      = card.iconSize ?? 20;
  const iconGap       = card.iconGap ?? 10;
  const iconColor     = card.textColor || "rgba(255,255,255,0.75)";
  const orientation   = card.iconOrientation ?? "horizontal";
  const displayMode   = card.displayMode ?? "icons";
  const contentPadding = effectiveEffects.padding ?? 14;

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

  function addLink() {
    const url = newUrl.trim();
    if (!url || (card.links ?? []).length >= 12) return;
    updateCard(card.id, {
      links: [...(card.links ?? []), {
        id: crypto.randomUUID(),
        url,
        label: PLATFORM_LABELS[detectPlatform(url)],
      }],
    });
    setNewUrl("");
  }

  function startEdit(link: ProfileLink) {
    setEditingId(link.id);
    setEditUrl(link.url);
  }

  function confirmEdit() {
    const url = editUrl.trim();
    if (url && editingId) {
      updateCard(card.id, {
        links: (card.links ?? []).map(l =>
          l.id === editingId ? { ...l, url, label: PLATFORM_LABELS[detectPlatform(url)] } : l
        ),
      });
    }
    setEditingId(null);
    setEditUrl("");
  }

  const onLinkDragStart = useCallback((e: React.MouseEvent, link: ProfileLink) => {
    if (!isSel || !canInteract) return;
    e.stopPropagation();
    e.preventDefault();
    pendingPositions.current = {};
    setInternalDrag({ id: link.id, startX: link.x ?? 0, startY: link.y ?? 0, startMouseX: e.clientX, startMouseY: e.clientY });
  }, [isSel, canInteract]);

  const onCardMouseMove = useCallback((e: React.MouseEvent) => {
    if (internalDrag) {
      e.stopPropagation();
      const dx = e.clientX - internalDrag.startMouseX;
      const dy = e.clientY - internalDrag.startMouseY;
      pendingPositions.current[internalDrag.id] = { x: internalDrag.startX + dx, y: internalDrag.startY + dy };
      return;
    }
    onInteractMove(e);
  }, [internalDrag, onInteractMove]);

  const onCardMouseUp = useCallback((e: React.MouseEvent) => {
    if (!internalDrag) return;
    e.stopPropagation();
    const link = (card.links ?? []).find(l => l.id === internalDrag.id);
    if (link) {
      let baseX = internalDrag.startX;
      let baseY = internalDrag.startY;
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
        onMouseLeave={onInteractLeave}
        onClick={onClick}
        style={{
          position:   "absolute",
          left:       card.x,
          top:        card.y,
          width:      card.w,
          height:     card.h,
          zIndex:     card.zIndex + card.layer * 100 + (isSel ? SELECTION_Z_BOOST : 0),
          transform:  `${parallaxTransform} rotate(${card.rotation}deg)`,
          willChange: "transform",
          userSelect: "none",
          cursor:     internalDrag ? "grabbing" : draggingId === card.id ? "grabbing" : menuOpen ? "default" : "grab",
          ...entryAnimStyle,
        }}
      >
        <CardLayers
          cardId={card.id}
          effects={effectiveEffects}
          isSel={isSel}
          borderRadius={borderRadius}
        >
          <div style={{
            position: "absolute", inset: 0, borderRadius,
            ...(hasPositionedLinks ? {} : {
              display: "flex", flexDirection: orientation === "vertical" ? "column" as const : "row" as const,
              flexWrap: "wrap" as const, alignItems: "center",
              justifyContent: "center", gap: iconGap, padding: `${contentPadding}px`,
            }),
            overflow: "hidden",
          }}>
            {(card.links ?? []).filter(l => l.url).length === 0 ? (
              <span style={{ fontFamily: T.font.mono, fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>links</span>
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
                      iconColor={iconColor}
                      iconSize={iconSize}
                      showText={displayMode === "icons-text"}
                      fontStyle={fontStyle}
                      fontSize={fontSize}
                      onDragStart={onLinkDragStart}
                      isSelected={isSel}
                      canInteract={canInteract}
                    />
                  </div>
                );
              })
            )}
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
                setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) });
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
            Links
          </div>

          {/* CONTENIDO */}
          <MenuSection label="Contenido" first>
            {/* Existing links — read-only row: icon + url + edit/delete */}
            {(card.links ?? []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: T.space[2] }}>
                {(card.links ?? []).map(link => (
                  <div key={link.id} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: T.surface.raised, border: `1px solid ${T.border.subtle}`,
                    borderRadius: T.radius.sm, padding: "5px 8px",
                  }}>
                    <PlatformIcon platform={detectPlatform(link.url)} size={12} color={T.text.secondary} />
                    {editingId === link.id ? (
                      <TextInput
                        value={editUrl}
                        onChange={setEditUrl}
                        onKeyDown={e => {
                          if (e.key === "Enter") confirmEdit();
                          if (e.key === "Escape") { setEditingId(null); setEditUrl(""); }
                        }}
                        placeholder="https://..."
                        type="url"
                        mono
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <span style={{
                        fontFamily: T.font.mono, fontSize: 9, color: T.text.muted, flex: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                    )}
                    {link.x !== undefined && editingId !== link.id && (
                      <button
                        title="Restablecer posición"
                        onClick={() => updateCard(card.id, { links: (card.links ?? []).map(l => l.id === link.id ? { ...l, x: undefined, y: undefined } : l) })}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 10, cursor: "pointer", padding: "0 2px" }}
                      >⊙</button>
                    )}
                    {editingId === link.id ? (
                      <button
                        title="Confirmar"
                        onClick={confirmEdit}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: "transparent", border: "none", color: T.text.secondary, fontSize: 12, cursor: "pointer", padding: "0 2px" }}
                      >✓</button>
                    ) : (
                      <button
                        title="Editar"
                        onClick={() => startEdit(link)}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 11, cursor: "pointer", padding: "0 2px" }}
                      >✎</button>
                    )}
                    <button
                      onClick={() => updateCard(card.id, { links: (card.links ?? []).filter(l => l.id !== link.id) })}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add link — paste URL, platform auto-detected */}
            {(card.links ?? []).length < 12 && (
              <div style={{ display: "flex", gap: 6 }}>
                <TextInput
                  value={newUrl}
                  onChange={setNewUrl}
                  onKeyDown={e => e.key === "Enter" && addLink()}
                  placeholder="instagram.com/usuario, github.com/user…"
                  type="url"
                  mono
                  style={{ flex: 1 }}
                />
                <button
                  onClick={addLink}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    height: T.comp.inputH, padding: "0 12px",
                    background: T.surface.raised, border: `1px solid ${T.border.default}`,
                    borderRadius: T.radius.md, color: T.text.secondary, fontFamily: T.font.mono,
                    fontSize: 12, cursor: "pointer", flexShrink: 0,
                  }}
                >+</button>
              </div>
            )}
          </MenuSection>

          <Divider />

          {/* FONDO */}
          {(() => {
            const bg   = card.effects?.bg;
            const grad = card.effects?.gradient;
            return (
              <MenuSection label="Fondo">
                <MenuRow label="Color">
                  <ColorSwatch
                    value={bg?.color ?? "#141416"}
                    onChange={v => patchBg({ color: v })}
                    clearable={!!bg?.color}
                    onClear={() => patchBg({ color: undefined })}
                  />
                </MenuRow>
                <SliderRow label="Opacidad" min={0} max={1} step={0.01}
                  value={bg?.opacity ?? 1}
                  onChange={v => patchBg({ opacity: v })}
                  fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Blur" min={0} max={24} step={1}
                  value={bg?.blur ?? 0}
                  onChange={v => patchBg({ blur: v || undefined })}
                  unit="px" />
                <MenuRow label="Glass">
                  <Toggle value={!!bg?.glass} onChange={v => patchBg({ glass: v })} />
                </MenuRow>
                <SliderRow label="Padding" min={0} max={40} step={1}
                  value={effectiveEffects.padding ?? 14}
                  onChange={v => updateCard(card.id, { effects: { ...card.effects, padding: v } })}
                  unit="px" />

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <MenuRow label="Gradiente">
                    <Toggle value={!!grad} onChange={v => {
                      if (v) updateCard(card.id, { effects: { ...card.effects, gradient: { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 } } });
                      else updateCard(card.id, { effects: { ...card.effects, gradient: undefined } });
                    }} />
                  </MenuRow>
                  {grad && (<>
                    <MenuRow label="Color A">
                      <ColorSwatch value={grad.from} onChange={v => patchGradient({ from: v })} />
                    </MenuRow>
                    <MenuRow label="Color B">
                      <ColorSwatch value={grad.to} onChange={v => patchGradient({ to: v })} />
                    </MenuRow>
                    <SliderRow label="Ángulo" min={0} max={360} step={5}
                      value={grad.angle} onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
                    <SliderRow label="Opacidad" min={0} max={1} step={0.01}
                      value={grad.opacity} onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                  </>)}
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ display: "flex", gap: T.space[2] }}>
                    <ActionButton onClick={() => bgImgRef.current?.click()} fullWidth>
                      {bg?.image ? "Cambiar imagen" : "Imagen de fondo"}
                    </ActionButton>
                    {bg?.image && (
                      <ActionButton variant="danger" onClick={() => patchBg({ image: undefined })} fullWidth>
                        Quitar
                      </ActionButton>
                    )}
                  </div>
                </div>
              </MenuSection>
            );
          })()}

          <Divider />

          {/* ÍCONOS */}
          <MenuSection label="Íconos">
            <MenuRow label="Color">
              <ColorSwatch
                value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={v => updateCard(card.id, { textColor: v })}
              />
            </MenuRow>
            <SliderRow label="Tamaño" min={12} max={40} step={1}
              value={iconSize}
              onChange={v => updateCard(card.id, { iconSize: v })}
              unit="px" />
            <SliderRow label="Separación" min={0} max={40} step={1}
              value={iconGap}
              onChange={v => updateCard(card.id, { iconGap: v })}
              unit="px" />
            <div style={{ marginTop: T.space[2] }}>
              <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>
                Orientación
              </div>
              <Tabs
                tabs={[{ id: "horizontal", label: "Horizontal" }, { id: "vertical", label: "Vertical" }]}
                active={orientation}
                onChange={v => updateCard(card.id, { iconOrientation: v as "horizontal" | "vertical" })}
              />
            </div>
            <div style={{ marginTop: T.space[3] }}>
              <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>
                Mostrar
              </div>
              <Tabs
                tabs={[{ id: "icons", label: "Solo íconos" }, { id: "icons-text", label: "Íconos + texto" }]}
                active={displayMode}
                onChange={v => updateCard(card.id, { displayMode: v as "icons" | "icons-text" })}
              />
            </div>
            {displayMode === "icons-text" && (
              <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                <SliderRow label="Tamaño texto" min={7} max={18} step={0.5}
                  value={fontSize}
                  onChange={v => updateCard(card.id, { textSize: v })}
                  unit="px" />
                <div style={{ marginTop: T.space[2] }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>
                    Fuente
                  </div>
                  <div style={{ display: "flex", gap: T.space[1], flexWrap: "wrap" as const, maxHeight: 120, overflowY: "auto" }}>
                    {FONTS.map(f => (
                      <button key={f.key} onMouseDown={e => e.stopPropagation()} onClick={() => updateCard(card.id, { font: f.key })}
                        style={{
                          padding: `${T.space[1]}px ${T.space[2]}px`, borderRadius: T.radius.xs, cursor: "pointer",
                          border: card.font === f.key ? `1px solid ${T.border.strong}` : `1px solid ${T.border.subtle}`,
                          background: card.font === f.key ? T.surface.overlay : T.surface.input,
                          color: card.font === f.key ? T.text.primary : T.text.muted,
                          fontFamily: f.style, fontSize: T.size.xs, letterSpacing: "0.02em",
                        }}
                      >{f.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                <MenuRow label="Exterior">
                  <Toggle value={!!glow?.outer} onChange={v => patchGlow({ outer: v })} />
                </MenuRow>
                <MenuRow label="Interior">
                  <Toggle value={!!glow?.inner} onChange={v => patchGlow({ inner: v })} />
                </MenuRow>
                {anyGlow && (<>
                  <MenuRow label="Color">
                    <ColorSwatch value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} />
                  </MenuRow>
                  <SliderRow label="Intensidad" min={0} max={1} step={0.01}
                    value={glow?.intensity ?? 0} onChange={v => patchGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                </>)}

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Sombra</div>
                  <MenuRow label="Color">
                    <ColorSwatch value={sh?.color ?? "#000000"} onChange={v => patchShadow({ color: v })} />
                  </MenuRow>
                  <SliderRow label="Intensidad" min={0} max={1} step={0.01}
                    value={sh?.intensity ?? 0} onChange={v => patchShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Borde</div>
                  <MenuRow label="Color">
                    <ColorSwatch value={bord?.color ?? "#ffffff"} onChange={v => patchBorder({ color: v })}
                      clearable={!!bord?.color} onClear={() => patchBorder({ color: undefined })} />
                  </MenuRow>
                  <SliderRow label="Grosor" min={0} max={6} step={0.5}
                    value={bord?.width ?? 1} onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`} />
                  <SliderRow label="Radio" min={0} max={60} step={1}
                    value={bord?.radius ?? 14} onChange={v => patchBorder({ radius: v })} unit="px" />
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
                <MenuRow label="Activar">
                  <Toggle value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} />
                </MenuRow>
                {anim?.floating && (<>
                  <SliderRow label="Altura" min={2} max={24} step={1}
                    value={anim?.floatHeight ?? 8} onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
                  <SliderRow label="Velocidad" min={1} max={8} step={0.5}
                    value={anim?.floatSpeed ?? 3} onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
                </>)}

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Inclinación 3D</div>
                  <MenuRow label="Activar">
                    <Toggle value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} />
                  </MenuRow>
                  {inter?.tilt3d && (
                    <SliderRow label="Intensidad" min={1} max={15} step={0.5}
                      value={inter?.tiltIntensity ?? 6} onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`} />
                  )}
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Spotlight</div>
                  <MenuRow label="Activar">
                    <Toggle value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} />
                  </MenuRow>
                  {inter?.spotlight && (<>
                    <MenuRow label="Color">
                      <ColorSwatch
                        value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
                        onChange={v => patchInteractions({ spotlightColor: v })} />
                    </MenuRow>
                    <SliderRow label="Radio" min={20} max={100} step={1}
                      value={inter?.spotlightSize ?? 65} onChange={v => patchInteractions({ spotlightSize: v })} unit="%" />
                  </>)}
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: T.size.label, letterSpacing: "0.08em", color: T.text.muted, textTransform: "uppercase" as const, marginBottom: T.space[1] }}>Hover</div>
                  <MenuRow label="Glow al pasar">
                    <Toggle value={!!inter?.hoverGlow} onChange={v => patchInteractions({ hoverGlow: v })} />
                  </MenuRow>
                </div>
              </>);
            })()}
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
      <input ref={bgImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
    </>
  );
}

export default memo(LinksCardWidget);
