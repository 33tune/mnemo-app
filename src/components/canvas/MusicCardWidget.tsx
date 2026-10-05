"use client";
import { useState, useRef, useEffect, memo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { MusicCardData, CardEffects } from "@/types";
import ResizeHandles from "./ResizeHandles";
import type { ResizeHandle } from "@/hooks/useDragDrop";
import { useCardInteractions } from "@/hooks/useCardInteractions";
import CardLayers from "./CardLayers";
import ProfileMusicPlayer from "./ProfileMusicPlayer";
import { uploadToStorage } from "@/lib/storage";
import { detectBgModeFromFile } from "@/lib/bgStyle";
import { withOpacity } from "@/lib/cardColors";
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";
import { T, MenuPanel, MenuSection, MenuRow, SliderRow, Toggle, ColorSwatch, ColorRow, TextInput, ActionButton, Divider, Collapsible, MenuNote, NumberField, labelStyle, refocusFieldControl } from "@/ui";
import { getMusicCardEffects, MUSIC_DEFAULT_RADIUS } from "@/lib/profileCardEffects";
import { EFFECT_DISPLAY_DEFAULTS, GRADIENT_DEFAULT, cardShadowDisplay, glowFlagPatch, isCardGlowFlagVisible, isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { mergePatch, pauseEffect, resumeWithIntensity, toggleEffect } from "@/lib/effectPause";
import { neutralGlowPatch } from "@/lib/neutralGlow";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { MUSIC_TEXT_SIZE_DEFAULT } from "@/lib/musicPlayerFormat";
import { resizeMinimums } from "@/lib/resizeMath";

const MUSIC_MIN = resizeMinimums("music");
/** Display rotation in -180..180 (the rotate drag can accumulate any angle). */
function normalizeRotation(deg: number): number {
  const r = ((deg % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}
import { SELECTION_Z_BOOST } from "@/lib/canvasZIndex";
import { resolveOpenerSpot, resolveSideSpot } from "@/lib/openerPlacement";
import { CanvasChromeButton } from "./CanvasChromeButton";

const FONTS = CANVAS_FONTS;

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
  /** Iteration 0 (O1 Medidas): numeric X/Y/W/H/rotation — CanvasBoard
   * writes them through the drag's own functions. Absent = no Medidas. */
  onGeometry?:       (g: { x?: number; y?: number; w?: number; h?: number; rotation?: number }) => void;
  /** Review r2: the canvas (same bounds the drag clamps to) — chrome
   * placement and the real X/Y ranges in Medidas. */
  canvasBounds?:     { w: number; h: number; topOffset: number };
  locked?:           boolean;
  onToggleLock?:     () => void;
  canInteract?:      boolean;
  entryAnimStyle?:   CSSProperties;
}

function MusicCardWidget({
  card, isSel, draggingId, parallaxTransform,
  onMouseDown, onClick, onResizeMD, onRotateMD,
  updateCard, onDelete, onGeometry, canvasBounds, locked, onToggleLock, canInteract,
  entryAnimStyle = {},
}: Props) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null);
  const cardRef  = useRef<HTMLDivElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const panelId = `mnemo-music-editor-${card.id}`;
  // Review r2: chrome placement on the real canvas (never clipped, never
  // under the topbar, clear of the resize handles).
  const chromeCanvas = canvasBounds ?? { w: Number.POSITIVE_INFINITY, h: Number.POSITIVE_INFINITY, topOffset: 44 };
  const openerPos = resolveOpenerSpot(card, chromeCanvas);
  const rotateSpot = resolveSideSpot(card, chromeCanvas, 0);
  const lockSpot = resolveSideSpot(card, chromeCanvas, 1);
  const bgImgRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  // Iteration 0 (O4): the exact object this file used to build inline,
  // now shared (getMusicCardEffects = getModuleCardEffects(card, 10), the
  // same call MobilePublicCanvas makes) — parity-tested. The MENU reads
  // this (effective) and writes card.effects (raw) — Block 1's rule, which
  // Music didn't follow: its Glow switch read the raw flag and showed "off"
  // while a legacy glow rendered.
  const effectiveEffects: CardEffects = getMusicCardEffects(card);
  const raw = card.effects;
  const D = EFFECT_DISPLAY_DEFAULTS.music;

  const borderRadius = effectiveEffects.border?.radius ?? MUSIC_DEFAULT_RADIUS;
  // "Product closeout": card.textColor used to color the old link-preview
  // label directly — now the base ProfileMusicPlayer derives its 3 role
  // colors from, same withOpacity derivation ProfileCard.tsx already uses.
  const musicBaseColor  = card.textColor?.startsWith("#") ? card.textColor : "#ffffff";
  const textColor       = withOpacity(musicBaseColor, 0.95);
  const secondaryColor  = withOpacity(musicBaseColor, 0.65);
  const mutedColor      = withOpacity(musicBaseColor, 0.45);

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

  // Iteration 0: every patch is built on the RAW effects with mergePatch —
  // a cleared field DELETES the key (it used to store `undefined`, which
  // JSON drops, so a legacy value reappeared after reload).
  function setEffects(next: CardEffects) {
    updateCard(card.id, { effects: next });
  }
  function patchBg(patch: Partial<NonNullable<CardEffects["bg"]>>) {
    setEffects({ ...raw, bg: mergePatch(raw?.bg, patch) });
  }
  function patchBorder(patch: Partial<NonNullable<CardEffects["border"]>>) {
    setEffects({ ...raw, border: mergePatch(raw?.border, patch) });
  }
  function patchGlow(patch: Partial<NonNullable<CardEffects["glow"]>>) {
    setEffects({ ...raw, glow: mergePatch(raw?.glow, patch) });
  }
  function patchShadow(patch: Partial<NonNullable<CardEffects["shadow"]>>) {
    setEffects({ ...raw, shadow: mergePatch(raw?.shadow, patch) });
  }
  function patchGradient(patch: Partial<NonNullable<CardEffects["gradient"]>>) {
    const base = raw?.gradient ?? GRADIENT_DEFAULT;
    setEffects({ ...raw, gradient: { ...base, ...patch } });
  }
  function patchInteractions(patch: Partial<NonNullable<CardEffects["interactions"]>>) {
    setEffects({ ...raw, interactions: mergePatch(raw?.interactions, patch) });
  }
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    setEffects({ ...raw, animations: mergePatch(raw?.animations, patch) });
  }
  // Same switch semantics as ProfileCard (ProfileEffectsMenu.tsx): glow
  // flags via glowFlagPatch (+ the O3 neutral color), shadow pause/resume.
  function setGlowFlag(flag: "outer" | "inner", on: boolean) {
    patchGlow({ ...glowFlagPatch(effectiveEffects.glow, flag, on), ...(on ? neutralGlowPatch(effectiveEffects) : {}) });
  }
  function setHoverGlow(on: boolean) {
    const colorPatch = on ? neutralGlowPatch(effectiveEffects) : {};
    setEffects({
      ...raw,
      interactions: mergePatch(raw?.interactions, { hoverGlow: on }),
      ...(colorPatch.color ? { glow: mergePatch(raw?.glow, colorPatch) } : {}),
    });
  }
  function setShadowOn(on: boolean) {
    setEffects(on ? resumeWithIntensity(raw, "shadow") : pauseEffect(raw, "shadow"));
  }
  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const [{ publicUrl }, bgMode] = await Promise.all([uploadToStorage(f), detectBgModeFromFile(f)]);
    updateCard(card.id, { bgImage: publicUrl, bgMode, effects: { ...card.effects, bg: { ...card.effects?.bg, image: publicUrl, imageMode: bgMode } } });
    if (bgImgRef.current) bgImgRef.current.value = "";
  }
  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const { publicUrl } = await uploadToStorage(f);
    updateCard(card.id, { audioUrl: publicUrl });
    if (audioRef.current) audioRef.current.value = "";
  }

  return (
    <>
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
          {/* "Product closeout": Music is now an independent canvas element —
              same real player ProfileCard used internally (ProfileMusicPlayer.tsx,
              self-hosted MP3 only), not the old Spotify/YouTube link-preview.
              Position/drag/resize/z-index/persistence are entirely the
              generic top-level element engine (useDragDrop.ts) already gives
              every canvas element — nothing new here. */}
          <div data-canvas-hot="" style={{ position: "absolute", inset: 0, borderRadius, overflow: "hidden" }}>
            <ProfileMusicPlayer
              music={{ sourceType: "upload", audioUrl: card.audioUrl ?? "", title: card.title, artist: card.artist, volume: card.volume }}
              textColor={textColor} secondaryColor={secondaryColor} mutedColor={mutedColor}
              textSize={card.textSize} fontFamily={card.font ? getFontStyle(card.font) : undefined}
            />
          </div>
        </CardLayers>

        {/* Iteration 0: "Editar" / lock / rotate are real 24px <button>s
            (were 16-20px divs; the gear covered the nw resize handle and the
            rotate dot the ne one). Placed by resolveOpenerSpot / resolveSideSpot;
            lock + rotate sit outside the right edge, clear of the ne/e
            handles' 24px target circles. */}
        {isSel && canInteract && (
          <CanvasChromeButton
            ref={editBtnRef}
            icon="pencil"
            label="Editar Music"
            expanded={menuOpen}
            controls={panelId}
            style={{ top: openerPos.top, left: openerPos.left }}
            onEscape={() => setMenuOpen(false)}
            onActivate={() => {
              const next = !menuOpen;
              if (next && cardRef.current) { const r = cardRef.current.getBoundingClientRect(); const left = r.right + 10 + T.comp.panelWidth > window.innerWidth ? Math.max(4, r.left - T.comp.panelWidth - 10) : r.right + 10; setPortalPos({ left, top: Math.min(Math.max(8, r.top), window.innerHeight - 120) }); } else setPortalPos(null);
              setMenuOpen(next);
            }}
          />
        )}

        {isSel && canInteract && !locked && (
          <CanvasChromeButton
            icon="rotate"
            label="Rotar Music (arrastrar; Enter gira 15°)"
            style={{ top: rotateSpot.top, left: rotateSpot.left }}
            onMouseDown={e => onRotateMD(e)}
            onActivate={e => { if (e.detail === 0) updateCard(card.id, { rotation: Math.round(((card.rotation ?? 0) + 15) % 360) }); }}
          />
        )}

        {isSel && canInteract && onToggleLock && (
          <CanvasChromeButton
            icon={locked ? "lock" : "unlock"}
            label={locked ? "Desbloquear Music" : "Bloquear Music"}
            pressed={!!locked}
            style={{ top: lockSpot.top, left: lockSpot.left }}
            onActivate={() => onToggleLock()}
          />
        )}

        {isSel && canInteract && !locked && <ResizeHandles onResizeMD={onResizeMD} />}
      </div>

      {/* Config portal */}
      {menuOpen && canInteract && portalPos && createPortal(
        <MenuPanel pos={portalPos} label="Editor de Music" id={panelId}
          returnFocusTo={() => editBtnRef.current}
          onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setMenuOpen(false); } }}>

          <div role="heading" aria-level={2} style={{ ...T.type.title, color: T.ui.text.primary, marginBottom: T.space[4] }}>
            Music
          </div>

          {/* CONTENIDO — same self-hosted-MP3-only contract ProfileCard's own
              Music block used (see CLAUDE.md's Music simplification notes) —
              no URL field, no Spotify/YouTube/SoundCloud. */}
          <MenuSection label="Contenido" first>
            <div style={{ display: "flex", gap: 6 }}>
              <ActionButton onClick={() => audioRef.current?.click()}>
                {card.audioUrl ? "reemplazar MP3" : "subir MP3"}
              </ActionButton>
              {card.audioUrl && (
                <ActionButton variant="danger" onClick={e => { const el = e.currentTarget as HTMLElement; updateCard(card.id, { audioUrl: "" }); refocusFieldControl(el); }}>quitar</ActionButton>
              )}
            </div>
            <input ref={audioRef} type="file" accept="audio/mpeg,audio/mp3,.mp3" style={{ display: "none" }} onChange={handleAudioUpload} />
            {/* Iteration 0: visible labels (were placeholder-only names that
                vanished while typing). */}
            <label id={`${panelId}-title`} style={{ ...labelStyle }}>Título</label>
            <TextInput value={card.title ?? ""} onChange={v => updateCard(card.id, { title: v })} labelledBy={`${panelId}-title`} />
            <label id={`${panelId}-artist`} style={{ ...labelStyle }}>Artista</label>
            <TextInput value={card.artist ?? ""} onChange={v => updateCard(card.id, { artist: v })} labelledBy={`${panelId}-artist`} />
            <SliderRow label="Volumen inicial" min={0} max={1} step={0.01} value={card.volume ?? 1}
              fmt={v => `${Math.round(v * 100)}%`} onChange={v => updateCard(card.id, { volume: v })} />
          </MenuSection>

          <Divider />

          {/* FONDO — Iteration 0: effective values (legacy bgColor included),
              raw writes; the gradient switch PAUSES instead of erasing. */}
          {(() => {
            const bg   = effectiveEffects.bg;
            const grad = effectiveEffects.gradient;
            return (
              <MenuSection label="Fondo">
                <ColorRow label="Color" value={bg?.color ?? D.bgColor} onChange={v => patchBg({ color: v })} keepAlpha
                  clearable={!!raw?.bg?.color} onClear={() => patchBg({ color: undefined })}
                  state={raw?.bg?.color ? "modified" : undefined} onReset={() => patchBg({ color: undefined })} />
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
                  onChange={v => patchBg({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`}
                  state={raw?.bg?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBg({ opacity: undefined })} />
                <SliderRow label="Desenfoque" min={0} max={24} step={1} value={bg?.blur ?? 0}
                  onChange={v => patchBg({ blur: v || undefined })} unit="px" />
                <MenuRow label="Glass">
                  <Toggle value={!!bg?.glass} onChange={v => patchBg({ glass: v })} />
                </MenuRow>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <MenuRow label="Gradiente">
                    <Toggle value={!!grad} onChange={v => setEffects(toggleEffect(raw, "gradient", v, { fallback: GRADIENT_DEFAULT }))} />
                  </MenuRow>
                  {grad && (<>
                    <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
                    <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
                    <SliderRow label="Ángulo" min={0} max={360} step={5} value={grad.angle} onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
                    <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={grad.opacity} onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                  </>)}
                </div>

                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div style={{ display: "flex", gap: T.space[2] }}>
                    <ActionButton onClick={() => bgImgRef.current?.click()} fullWidth>
                      {bg?.image ? "Cambiar imagen" : "Imagen de fondo"}
                    </ActionButton>
                    {bg?.image && <ActionButton variant="danger" onClick={e => { const el = e.currentTarget as HTMLElement; updateCard(card.id, { bgImage: "", effects: { ...raw, bg: mergePatch(raw?.bg, { image: undefined }) } }); refocusFieldControl(el); }} fullWidth>Quitar</ActionButton>}
                  </div>
                </div>
              </MenuSection>
            );
          })()}

          <Divider />

          {/* TEXTO — Iteration 0 (O2): Tamaño and Fuente now really drive
              ProfileMusicPlayer. 8px = today's exact sizes (title 10, artist
              and times 8); no font = today's DM Sans / Space Mono. */}
          <MenuSection label="Texto">
            <MenuRow label="Color">
              <ColorSwatch value={card.textColor?.startsWith("#") ? card.textColor : "#ffffff"}
                onChange={v => updateCard(card.id, { textColor: v })} />
            </MenuRow>
            {/* Review r2 (Visual-5): stored value is the old "px" number, but
                it is a SCALE of the whole player text (8 = 100% = today's
                10/8px) — shown truthfully as a percentage. */}
            <SliderRow label="Tamaño del texto" min={7} max={18} step={1} value={card.textSize ?? MUSIC_TEXT_SIZE_DEFAULT}
              onChange={v => updateCard(card.id, { textSize: v })}
              fmt={v => `${Math.round((v / MUSIC_TEXT_SIZE_DEFAULT) * 100)}%`} displayScale={100 / MUSIC_TEXT_SIZE_DEFAULT}
              state={card.textSize !== undefined ? "modified" : undefined} onReset={() => updateCard(card.id, { textSize: undefined })} />
            {(card.textSize ?? MUSIC_TEXT_SIZE_DEFAULT) > MUSIC_TEXT_SIZE_DEFAULT && (
              <MenuNote>Agrandá el bloque si el texto no entra.</MenuNote>
            )}
            <div style={{ marginTop: T.space[2] }}>
              <div id={`${panelId}-font`} role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>
                Fuente
              </div>
              <div role="group" aria-labelledby={`${panelId}-font`} style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, maxHeight: 120, overflowY: "auto" }}>
                {[{ key: undefined as string | undefined, label: "Predeterminada", style: T.font.sans }, ...FONTS].map(f => {
                  const on = f.key === undefined ? !card.font : card.font === f.key;
                  return (
                    <button key={f.key ?? "default"} type="button" aria-pressed={on} onMouseDown={e => e.stopPropagation()} onClick={() => updateCard(card.id, { font: f.key as MusicCardData["font"] })}
                      style={{ height: 24, padding: "0 8px", borderRadius: T.ui.radius.chip, cursor: "pointer", border: `0.5px solid ${on ? T.ui.line.strong : T.ui.line.group}`, background: on ? T.ui.surface.thumb : T.ui.surface.group, color: on ? T.ui.text.primary : T.ui.text.secondary, fontFamily: f.style, fontSize: 12, lineHeight: "16px" }}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </MenuSection>

          <Divider />

          {/* EFECTOS — Iteration 0 (O4): effective values (Music's own legacy
              defaults: radius 10, glow outer:true), switches show what
              renders (flag AND intensity > 0), shadow gets the same
              pause/resume switch as ProfileCard. */}
          {(() => {
            const glow = effectiveEffects.glow;
            const sh   = effectiveEffects.shadow;
            const bord = effectiveEffects.border;
            const outerOn = isCardGlowFlagVisible(glow, "outer");
            const innerOn = isCardGlowFlagVisible(glow, "inner");
            const anyGlow = outerOn || innerOn;
            const shadowOn = isIntensityEffectVisible(sh);
            const shadowFx = cardShadowDisplay(sh);
            return (
              <MenuSection label="Efectos">
                <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Glow</div>
                <MenuRow label="Exterior"><Toggle value={outerOn} onChange={v => setGlowFlag("outer", v)} /></MenuRow>
                <MenuRow label="Interior"><Toggle value={innerOn} onChange={v => setGlowFlag("inner", v)} /></MenuRow>
                {anyGlow && (<>
                  <ColorRow label="Color" value={glow?.color ?? D.glowColor} onChange={v => patchGlow({ color: v })} />
                  <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={glow?.intensity ?? 0} onChange={v => patchGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                </>)}
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Sombra</div>
                  <MenuRow label="Activar sombra"><Toggle value={shadowOn} onChange={setShadowOn} /></MenuRow>
                  {!shadowOn && <MenuNote>Apagada: queda la sombra base sutil.</MenuNote>}
                  {shadowOn && (<>
                    <ColorRow label="Color" value={shadowFx.color} onChange={v => patchShadow({ color: v })} />
                    <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={sh?.intensity ?? 0} onChange={v => patchShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                  </>)}
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Borde</div>
                  <ColorRow label="Color" value={bord?.color ?? D.borderColor} onChange={v => patchBorder({ color: v })} keepAlpha
                    clearable={!!raw?.border?.color} onClear={() => patchBorder({ color: undefined })}
                    state={raw?.border?.color ? "modified" : undefined} onReset={() => patchBorder({ color: undefined })} />
                  <SliderRow label="Grosor" min={0} max={6} step={0.5} value={bord?.width ?? D.borderWidth} onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`}
                    state={raw?.border?.width !== undefined ? "modified" : undefined} onReset={() => patchBorder({ width: undefined })} />
                  <SliderRow label="Radio" min={0} max={60} step={1} value={bord?.radius ?? D.radius} onChange={v => patchBorder({ radius: v })} unit="px"
                    state={raw?.border?.radius !== undefined ? "modified" : undefined} onReset={() => patchBorder({ radius: undefined })} />
                </div>
              </MenuSection>
            );
          })()}

          {/* ANIMAR */}
          <Collapsible label="Animar">
            {(() => {
              const inter = effectiveEffects.interactions;
              const anim  = effectiveEffects.animations;
              return (<>
                <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Flotación</div>
                <MenuRow label="Activar"><Toggle label="Activar flotación" value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} /></MenuRow>
                {anim?.floating && (<>
                  <SliderRow label="Altura" min={2} max={24} step={1} value={anim?.floatHeight ?? D.floatHeight} onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
                  <SliderRow label="Duración del ciclo" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? D.floatSpeed} onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
                </>)}
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Inclinación 3D</div>
                  <MenuRow label="Activar"><Toggle label="Activar inclinación 3D" value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} /></MenuRow>
                  {inter?.tilt3d && <SliderRow label="Intensidad" min={1} max={15} step={0.5} value={inter?.tiltIntensity ?? D.tilt} onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`}
                    state={raw?.interactions?.tiltIntensity !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ tiltIntensity: undefined })} />}
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Spotlight</div>
                  <MenuRow label="Activar"><Toggle label="Activar spotlight" value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} /></MenuRow>
                  {inter?.spotlight && (<>
                    <ColorRow label="Color" value={inter?.spotlightColor ?? D.spotlightColor} onChange={v => patchInteractions({ spotlightColor: v })} keepAlpha
                      state={raw?.interactions?.spotlightColor ? "modified" : undefined} onReset={() => patchInteractions({ spotlightColor: undefined })} />
                    <SliderRow label="Radio" min={20} max={100} step={1} value={inter?.spotlightSize ?? D.spotlightSize} onChange={v => patchInteractions({ spotlightSize: v })} unit="%"
                      state={raw?.interactions?.spotlightSize !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ spotlightSize: undefined })} />
                  </>)}
                </div>
                <div style={{ marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${T.border.subtle}` }}>
                  <div role="heading" aria-level={4} style={{ ...T.type.section, color: T.ui.text.section, marginBottom: T.space[1] }}>Hover</div>
                  <MenuRow label="Glow al pasar"><Toggle value={!!inter?.hoverGlow} onChange={setHoverGlow} /></MenuRow>
                </div>
              </>);
            })()}
          </Collapsible>

          {/* MEDIDAS (Iteration 0, O1): closed by default; secondary
              precision / keyboard alternative to dragging (WCAG 2.5.7).
              Iteration 1 moves it to "Más ajustes". */}
          {onGeometry && (() => {
            // Review r2 (A11y-4): the REAL ranges (the canvas the drag clamps
            // to), so a clamp is announced by NumberField instead of being
            // silent; disabled with the reason while locked.
            const cb = chromeCanvas;
            const finite = Number.isFinite(cb.w) && Number.isFinite(cb.h);
            const maxX = finite ? Math.max(0, Math.round(cb.w - card.w)) : 100000;
            const minY = cb.topOffset;
            const maxY = finite ? Math.max(minY, Math.round(cb.h - card.h)) : 100000;
            const maxW = finite ? Math.round(cb.w) : 2000;
            const maxH = finite ? Math.round(cb.h - cb.topOffset) : 2000;
            return (
              <Collapsible label="Medidas">
                {locked && <MenuNote>Bloqueado: desbloquealo (botón del candado junto al elemento) para cambiar sus medidas.</MenuNote>}
                <NumberField label="X (px)" min={0} max={maxX} value={Math.round(card.x)} disabled={!!locked} onChange={v => onGeometry({ x: v })} />
                <NumberField label="Y (px)" min={minY} max={maxY} value={Math.round(card.y)} disabled={!!locked} onChange={v => onGeometry({ y: v })} />
                <NumberField label="Ancho (px)" min={MUSIC_MIN.minW} max={maxW} value={Math.round(card.w)} disabled={!!locked} onChange={v => onGeometry({ w: v })} />
                <NumberField label="Alto (px)" min={MUSIC_MIN.minH} max={maxH} value={Math.round(card.h)} disabled={!!locked} onChange={v => onGeometry({ h: v })} />
                <NumberField label="Rotación (°)" min={-180} max={180} value={Math.round(normalizeRotation(card.rotation ?? 0))} disabled={!!locked} onChange={v => onGeometry({ rotation: v })} />
              </Collapsible>
            );
          })()}

          {onDelete && (
            <div style={{ marginTop: T.space[4], paddingTop: T.space[4], borderTop: `1px solid ${T.border.subtle}` }}>
              <ActionButton variant="danger" fullWidth onClick={() => { onDelete(card.id); setMenuOpen(false); }}>
                Eliminar Music
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
