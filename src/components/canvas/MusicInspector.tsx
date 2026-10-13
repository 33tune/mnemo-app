"use client";
import React, { useRef } from "react";
import type { MusicCardData, CardEffects } from "@/types";
import {
  T, uv, InspectorShell, MenuSection, MenuRow, SliderRow, Toggle, ColorRow, TextInput, ActionButton, Collapsible, MenuNote,
  FontField, Icon, labelStyle, refocusFieldControl,
} from "@/ui";
import { uploadToStorage } from "@/lib/storage";
import { detectBgModeFromFile } from "@/lib/bgStyle";
import { CANVAS_FONTS } from "@/lib/fontList";
import { getMusicCardEffects, MUSIC_DEFAULT_TEXT_COLOR } from "@/lib/profileCardEffects";
import { EFFECT_DISPLAY_DEFAULTS, GRADIENT_DEFAULT, cardShadowDisplay, isCardGlowFlagVisible, isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { mergePatch } from "@/lib/effectPause";
import { effectActions, type EffectOwner } from "@/lib/effectBinding";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { MUSIC_TEXT_SIZE_DEFAULT } from "@/lib/musicPlayerFormat";
import type { LayerIndex } from "@/lib/layerOrder";
import { ObjectSection, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

/** "Predeterminada" = no stored font (the player's own DM Sans / Space Mono). */
const DEFAULT_FONT_KEY = "";
const MUSIC_FONTS = [{ key: DEFAULT_FONT_KEY, label: "Predeterminada", style: T.font.sans }, ...CANVAS_FONTS];

interface MusicInspectorProps extends ElementShellProps {
  /** The card as rendered (stack style resolved — what MusicCardWidget got). */
  card: MusicCardData;
  updateCard: (id: string, patch: Partial<MusicCardData>) => void;
  onDelete: () => void;
  onOpenLayers: () => void;
  onToggleLock: () => void;
  measures?: MeasureSpec;
}

/** One sub-group inside a section or a disclosure row (Glow / Borde…). No
 * title when its first row already names it (a "Sombra" switch row). */
function SubGroup({ title, first, children }: { title?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div style={first ? undefined : { marginTop: T.space[3], paddingTop: T.space[3], borderTop: `1px solid ${uv("line-group")}` }}>
      {title && <div role="heading" aria-level={4} style={{ ...T.type.section, color: uv("text-section"), marginBottom: T.space[1] }}>{title}</div>}
      {children}
    </div>
  );
}

// Editor v3 Phase G (design screen 07, D8): Music leaves its floating
// MenuPanel (dark-locked since Phase A, A7) and is edited in the dock like
// every other object. Same controls and the SAME writes as before — the
// effect owner model (effectBinding.ts), read-effective / write-raw, the
// pause-instead-of-erase switches, O2 (Tamaño / Fuente drive the player) and
// O4 (Music's own display defaults) are unchanged; only the container, the
// section numbers and the editor theme tokens are new. Less-used groups
// (Fuente, Efectos, Animar) collapse into rows, as in the design.
export default function MusicInspector(p: MusicInspectorProps) {
  const { card, updateCard } = p;
  const bgImgRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const idBase = `mnemo-music-${card.id}`;

  const effectiveEffects: CardEffects = getMusicCardEffects(card);
  const raw = card.effects;
  const D = EFFECT_DISPLAY_DEFAULTS.music;

  // Every patch is built on the RAW effects with mergePatch — a cleared field
  // DELETES the key (Iteration 0).
  function setEffects(next: CardEffects) {
    updateCard(card.id, { effects: next });
  }
  const owner: EffectOwner = { kind: "music", raw, effective: effectiveEffects, write: setEffects };
  const fx = effectActions(owner);
  const patchBg = (patch: Partial<NonNullable<CardEffects["bg"]>>) => fx.patch("bg", patch);
  const patchBorder = (patch: Partial<NonNullable<CardEffects["border"]>>) => fx.patch("border", patch);
  const patchGlow = (patch: Partial<NonNullable<CardEffects["glow"]>>) => fx.patch("glow", patch);
  const patchShadow = (patch: Partial<NonNullable<CardEffects["shadow"]>>) => fx.patch("shadow", patch);
  function patchGradient(patch: Partial<NonNullable<CardEffects["gradient"]>>) {
    const base = raw?.gradient ?? GRADIENT_DEFAULT;
    setEffects({ ...raw, gradient: { ...base, ...patch } });
  }
  const patchInteractions = (patch: Partial<NonNullable<CardEffects["interactions"]>>) => fx.patch("interactions", patch);
  const patchAnimations = (patch: Partial<NonNullable<CardEffects["animations"]>>) => fx.patch("animations", patch);
  const setGlowFlag = (flag: "outer" | "inner", on: boolean) => fx.setGlowFlag(flag, on);
  const setHoverGlow = (on: boolean) => fx.setHoverGlow(on);
  const setShadowOn = (on: boolean) => fx.setEnabled("shadow", on);
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

  const bg = effectiveEffects.bg;
  const grad = effectiveEffects.gradient;
  const glow = effectiveEffects.glow;
  const sh = effectiveEffects.shadow;
  const bord = effectiveEffects.border;
  const outerOn = isCardGlowFlagVisible(glow, "outer");
  const innerOn = isCardGlowFlagVisible(glow, "inner");
  const anyGlow = outerOn || innerOn;
  const shadowOn = isIntensityEffectVisible(sh);
  const shadowFx = cardShadowDisplay(sh);
  const inter = effectiveEffects.interactions;
  const anim = effectiveEffects.animations;
  const fontLabel = card.font ? (CANVAS_FONTS.find(f => f.key === card.font)?.label ?? card.font) : "Predeterminada";
  // Row hints = what is ON (never a list of what exists, which read as active).
  const fxHint = [anyGlow && "Glow", shadowOn && "Sombra", (bord?.width ?? D.borderWidth) > 0 && "Borde"].filter(Boolean).join(" · ") || "Ninguno";
  const animHint = [anim?.floating && "Flotación", inter?.tilt3d && "3D", inter?.spotlight && "Spotlight", inter?.hoverGlow && "Al pasar"].filter(Boolean).join(" · ") || "Ninguna";

  return (
    <InspectorShell
      id={p.id}
      title="Music"
      path={`music / ${(card.title?.trim() || "pista").toLowerCase()}`}
      aside={card.audioUrl ? "una pista" : "sin MP3"}
      meta={`X ${Math.round(card.x)}   Y ${Math.round(card.y)}   W ${Math.round(card.w)}   H ${Math.round(card.h)}`}
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
    >
      {/* CONTENIDO — self-hosted MP3 only (no URL field, no Spotify/YouTube). */}
      <MenuSection label="Contenido" num="01" tone={1} first>
        <div style={{ display: "flex", gap: T.space[2] }}>
          <ActionButton variant="primary" fullWidth onClick={() => audioRef.current?.click()}>
            <Icon name="upload" size={14} /> {card.audioUrl ? "Reemplazar MP3" : "Subir MP3"}
          </ActionButton>
          {card.audioUrl && (
            <ActionButton variant="danger" onClick={e => { const el = e.currentTarget as HTMLElement; updateCard(card.id, { audioUrl: "" }); refocusFieldControl(el); }}>Quitar</ActionButton>
          )}
        </div>
        <input ref={audioRef} type="file" accept="audio/mpeg,audio/mp3,.mp3" hidden tabIndex={-1} aria-hidden="true" onChange={handleAudioUpload} />
        <label id={`${idBase}-title`} style={{ ...labelStyle }}>Título</label>
        <TextInput value={card.title ?? ""} onChange={v => updateCard(card.id, { title: v })} labelledBy={`${idBase}-title`} />
        <label id={`${idBase}-artist`} style={{ ...labelStyle }}>Artista</label>
        <TextInput value={card.artist ?? ""} onChange={v => updateCard(card.id, { artist: v })} labelledBy={`${idBase}-artist`} />
        <SliderRow label="Volumen inicial" min={0} max={1} step={0.01} value={card.volume ?? 1}
          fmt={v => `${Math.round(v * 100)}%`} onChange={v => updateCard(card.id, { volume: v })} />
      </MenuSection>

      {/* FONDO — effective values (legacy bgColor included), raw writes; the
          gradient switch PAUSES instead of erasing. */}
      <MenuSection label="Fondo" num="02" tone={2}>
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
        <SubGroup>
          <MenuRow label="Gradiente">
            <Toggle value={!!grad} onChange={v => fx.setEnabled("gradient", v)} />
          </MenuRow>
          {grad && (<>
            <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
            <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
            <SliderRow label="Ángulo" min={0} max={360} step={5} value={grad.angle} onChange={v => patchGradient({ angle: v })} fmt={v => `${v}°`} />
            <SliderRow label="Opacidad del gradiente" min={0} max={1} step={0.01} value={grad.opacity} onChange={v => patchGradient({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
          </>)}
        </SubGroup>
        <SubGroup title="Imagen de fondo">
          <div style={{ display: "flex", gap: T.space[2] }}>
            <ActionButton onClick={() => bgImgRef.current?.click()} fullWidth>
              {bg?.image ? "Cambiar imagen" : "Subir imagen"}
            </ActionButton>
            {bg?.image && <ActionButton variant="danger" onClick={e => { const el = e.currentTarget as HTMLElement; updateCard(card.id, { bgImage: "", effects: { ...raw, bg: mergePatch(raw?.bg, { image: undefined }) } }); refocusFieldControl(el); }} fullWidth>Quitar</ActionButton>}
          </div>
          <input ref={bgImgRef} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={handleBgUpload} />
        </SubGroup>
      </MenuSection>

      {/* TEXTO — O2: Tamaño and Fuente drive ProfileMusicPlayer. 8 = 100% =
          today's exact sizes (title 10, artist and times 8). */}
      <MenuSection label="Texto" num="03" tone={3}>
        <ColorRow label="Color" value={card.textColor?.startsWith("#") ? card.textColor : MUSIC_DEFAULT_TEXT_COLOR}
          onChange={v => updateCard(card.id, { textColor: v })} />
        <SliderRow label="Tamaño del texto" min={7} max={18} step={1} value={card.textSize ?? MUSIC_TEXT_SIZE_DEFAULT}
          onChange={v => updateCard(card.id, { textSize: v })}
          fmt={v => `${Math.round((v / MUSIC_TEXT_SIZE_DEFAULT) * 100)}%`} displayScale={100 / MUSIC_TEXT_SIZE_DEFAULT}
          state={card.textSize !== undefined ? "modified" : undefined} onReset={() => updateCard(card.id, { textSize: undefined })} />
        {(card.textSize ?? MUSIC_TEXT_SIZE_DEFAULT) > MUSIC_TEXT_SIZE_DEFAULT && (
          <MenuNote>Agrandá el bloque si el texto no entra.</MenuNote>
        )}

        <Collapsible label="Fuente" hint={fontLabel} modified={!!card.font}>
          <FontField value={card.font ?? DEFAULT_FONT_KEY} fonts={MUSIC_FONTS} label={`Fuente: ${fontLabel}`}
            onChange={v => updateCard(card.id, { font: (v || undefined) as MusicCardData["font"] })}
            modified={!!card.font} onReset={() => updateCard(card.id, { font: undefined })} />
        </Collapsible>

        {/* EFECTOS — effective values (Music's own legacy defaults: radius 10,
            glow outer:true); switches show what renders (flag AND intensity >
            0); shadow pauses/resumes like ProfileCard's. */}
        <Collapsible label="Efectos" hint={fxHint}>
          <SubGroup title="Glow" first>
            <MenuRow label="Exterior"><Toggle value={outerOn} onChange={v => setGlowFlag("outer", v)} /></MenuRow>
            <MenuRow label="Interior"><Toggle value={innerOn} onChange={v => setGlowFlag("inner", v)} /></MenuRow>
            {anyGlow && (<>
              <ColorRow label="Color" value={glow?.color ?? D.glowColor} onChange={v => patchGlow({ color: v })} />
              <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={glow?.intensity ?? 0} onChange={v => patchGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            </>)}
          </SubGroup>
          <SubGroup>
            <MenuRow label="Sombra"><Toggle value={shadowOn} onChange={setShadowOn} /></MenuRow>
            {!shadowOn && <MenuNote>Apagada: queda la sombra base sutil.</MenuNote>}
            {shadowOn && (<>
              <ColorRow label="Color" value={shadowFx.color} onChange={v => patchShadow({ color: v })} />
              <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={sh?.intensity ?? 0} onChange={v => patchShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            </>)}
          </SubGroup>
          <SubGroup title="Borde">
            <ColorRow label="Color" value={bord?.color ?? D.borderColor} onChange={v => patchBorder({ color: v })} keepAlpha
              clearable={!!raw?.border?.color} onClear={() => patchBorder({ color: undefined })}
              state={raw?.border?.color ? "modified" : undefined} onReset={() => patchBorder({ color: undefined })} />
            <SliderRow label="Grosor" min={0} max={6} step={0.5} value={bord?.width ?? D.borderWidth} onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`}
              state={raw?.border?.width !== undefined ? "modified" : undefined} onReset={() => patchBorder({ width: undefined })} />
            <SliderRow label="Radio" min={0} max={60} step={1} value={bord?.radius ?? D.radius} onChange={v => patchBorder({ radius: v })} unit="px"
              state={raw?.border?.radius !== undefined ? "modified" : undefined} onReset={() => patchBorder({ radius: undefined })} />
          </SubGroup>
        </Collapsible>

        <Collapsible label="Animar" hint={animHint}>
          <SubGroup first>
            <MenuRow label="Flotación"><Toggle label="Activar flotación" value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} /></MenuRow>
            {anim?.floating && (<>
              <SliderRow label="Altura" min={2} max={24} step={1} value={anim?.floatHeight ?? D.floatHeight} onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
              <SliderRow label="Duración del ciclo" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? D.floatSpeed} onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
            </>)}
          </SubGroup>
          <SubGroup>
            <MenuRow label="Inclinación 3D"><Toggle label="Activar inclinación 3D" value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} /></MenuRow>
            {inter?.tilt3d && <SliderRow label="Intensidad" min={1} max={15} step={0.5} value={inter?.tiltIntensity ?? D.tilt} onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`}
              state={raw?.interactions?.tiltIntensity !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ tiltIntensity: undefined })} />}
          </SubGroup>
          <SubGroup>
            <MenuRow label="Spotlight"><Toggle label="Activar spotlight" value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} /></MenuRow>
            {inter?.spotlight && (<>
              <ColorRow label="Color" value={inter?.spotlightColor ?? D.spotlightColor} onChange={v => patchInteractions({ spotlightColor: v })} keepAlpha
                state={raw?.interactions?.spotlightColor ? "modified" : undefined} onReset={() => patchInteractions({ spotlightColor: undefined })} />
              <SliderRow label="Radio" min={20} max={100} step={1} value={inter?.spotlightSize ?? D.spotlightSize} onChange={v => patchInteractions({ spotlightSize: v })} unit="%"
                state={raw?.interactions?.spotlightSize !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ spotlightSize: undefined })} />
            </>)}
          </SubGroup>
          <SubGroup title="Al pasar el cursor">
            <MenuRow label="Glow al pasar"><Toggle value={!!inter?.hoverGlow} onChange={setHoverGlow} /></MenuRow>
          </SubGroup>
        </Collapsible>
      </MenuSection>

      <ObjectSection num="04" tone={4} layer={card.layer as LayerIndex} onOpenLayers={p.onOpenLayers}
        locked={!!card.locked} onToggleLock={p.onToggleLock} noun="Music" measures={p.measures}
        deleteLabel="Eliminar Music" onDelete={p.onDelete} />
    </InspectorShell>
  );
}
