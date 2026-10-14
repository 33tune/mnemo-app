"use client";
import React, { useState } from "react";
import type { MusicCardData, CardEffects } from "@/types";
import {
  T, Accordion, InspectorShell, MenuSection, MenuRow, SliderRow, ColorRow, TextInput, MenuNote, FontField, Tabs, EffectList, EffectRow, UploadField,
} from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
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
import { ObjectSection, ElementFooter, type ElementShellProps, type MeasureSpec } from "./ElementInspectorParts";

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
  /** Liquid glass footer: Fondo / Medio / Frente (Capas' own writer). */
  onSetLayer?: (layer: LayerIndex) => void;
}

const GLOW_WHERE = [
  { id: "outer", label: "Exterior", withText: true }, { id: "inner", label: "Interior", withText: true }, { id: "both", label: "Ambos", withText: true },
];

export default function MusicInspector(p: MusicInspectorProps) {
  const [openCard, setOpenCard] = useState<string | null>(null);
  const { card, updateCard } = p;
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
  async function handleBgFile(f: File) {
    const [{ publicUrl }, bgMode] = await Promise.all([uploadToStorage(f), detectBgModeFromFile(f)]);
    updateCard(card.id, { bgImage: publicUrl, bgMode, effects: { ...card.effects, bg: { ...card.effects?.bg, image: publicUrl, imageMode: bgMode } } });
  }
  async function handleAudioFile(f: File) {
    const { publicUrl } = await uploadToStorage(f);
    updateCard(card.id, { audioUrl: publicUrl });
  }

  const bg = effectiveEffects.bg;
  const grad = effectiveEffects.gradient;
  const glow = effectiveEffects.glow;
  const sh = effectiveEffects.shadow;
  const bord = effectiveEffects.border;
  const outerOn = isCardGlowFlagVisible(glow, "outer");
  const innerOn = isCardGlowFlagVisible(glow, "inner");
  const anyGlow = outerOn || innerOn;
  const where = outerOn && innerOn ? "both" : innerOn ? "inner" : "outer";
  // The Glow tile: on = the outer glow (O3 neutral / visible intensity via
  // setGlowFlag); "Dónde" switches the flags; off = both flags off at once.
  const setGlowOn = (on: boolean) => (on ? setGlowFlag("outer", true) : patchGlow({ outer: false, inner: false }));
  const setWhere = (id: string) => patchGlow({ outer: id !== "inner", inner: id !== "outer" });
  const shadowOn = isIntensityEffectVisible(sh);
  const shadowFx = cardShadowDisplay(sh);
  const inter = effectiveEffects.interactions;
  const anim = effectiveEffects.animations;
  const borderW = bord?.width ?? D.borderWidth;
  const fontLabel = card.font ? (CANVAS_FONTS.find(f => f.key === card.font)?.label ?? card.font) : "Predeterminada";
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} px`;
  const names = (l: Array<string | false | undefined>) => { const n = l.filter(Boolean) as string[]; return n.length ? n.join(", ") : "Ninguno activo"; };
  const bgColor = bg?.color ?? D.bgColor;
  const surface = [grad && "Gradiente", bg?.glass && "Vidrio", bg?.blur && "Desenfoque"];
  const light = [anyGlow && "Glow", shadowOn && "Sombra", borderW > 0 && "Borde"];
  const motion = [anim?.floating && "Flotar", inter?.tilt3d && "Inclinar 3D", inter?.spotlight && "Spotlight", inter?.hoverGlow && "Glow al pasar"];
  const textSize = card.textSize ?? MUSIC_TEXT_SIZE_DEFAULT;

  // Liquid glass (design menu-schema.js "music"): Canción (pinned) · Fondo ·
  // Texto · Luz · Movimiento y cursor · Medidas; the pinned footer holds the
  // layer, Capas, Bloquear and Eliminar. Same controls and the SAME writes as
  // before — the effect owner model (effectBinding.ts), read-effective /
  // write-raw, pause-instead-of-erase, O2 (Tamaño / Fuente drive the player)
  // and O4 (Music's own display defaults).
  return (
    <InspectorShell
      id={p.id}
      title="Music"
      icon="music"
      path="music / suelto en la sala"
      onClose={p.onClose}
      returnFocusTo={p.returnFocusTo}
      top={p.top}
      width={p.width}
      mode={p.mode}
      height={p.height}
      collapsed={p.collapsed}
      onExpand={p.onExpand}
      footer={<ElementFooter layer={card.layer as LayerIndex} onSetLayer={p.onSetLayer} onOpenLayers={p.onOpenLayers}
        locked={!!card.locked} onToggleLock={p.onToggleLock} noun="Music" onDelete={p.onDelete} />}
    >
      {/* DS accordion: every card starts closed; one open at a time. */}
      <Accordion open={openCard} onOpenChange={setOpenCard}>
      <div className="mn-swap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Self-hosted MP3 only (no URL field, no Spotify/YouTube). */}
        <MenuSection label="Canción" pinned>
          <UploadField kind="audio" value={card.audioUrl || null} label="Subir MP3" caption="MP3" accept="audio/mpeg,audio/mp3,.mp3"
            onFile={handleAudioFile} onRemove={() => updateCard(card.id, { audioUrl: "" })} />
          <label id={`${idBase}-title`} className="mn-label" style={{ padding: "0 2px" }}>Título</label>
          <TextInput value={card.title ?? ""} onChange={v => updateCard(card.id, { title: v })} labelledBy={`${idBase}-title`} placeholder="Título" />
          <label id={`${idBase}-artist`} className="mn-label" style={{ padding: "0 2px" }}>Artista</label>
          <TextInput value={card.artist ?? ""} onChange={v => updateCard(card.id, { artist: v })} labelledBy={`${idBase}-artist`} placeholder="Artista" />
          <SliderRow label="Volumen inicial" icon="volume" min={0} max={1} step={0.01} value={card.volume ?? 1}
            fmt={pct} onChange={v => updateCard(card.id, { volume: v })} />
        </MenuSection>

        {/* Effective values (legacy bgColor included), raw writes; the
            gradient switch PAUSES instead of erasing. */}
        <MenuSection label="Fondo" icon="palette" summary={[wellHex(bgColor), ...surface.filter(Boolean)].join(" · ")} swatch={bgColor}
          changed={[raw?.bg?.color, raw?.bg?.opacity].filter(v => v !== undefined).length}
          onReset={() => patchBg({ color: undefined, opacity: undefined })}>
          <ColorRow label="Color" value={bgColor} onChange={v => patchBg({ color: v })} keepAlpha
            clearable={!!raw?.bg?.color} onClear={() => patchBg({ color: undefined })}
            state={raw?.bg?.color ? "modified" : undefined} onReset={() => patchBg({ color: undefined })} />
          <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={bg?.opacity ?? 1}
            onChange={v => patchBg({ opacity: v })} fmt={pct}
            state={raw?.bg?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBg({ opacity: undefined })} />
          <EffectList label="Superficie de Music">
            <EffectRow id="gradient" label="Gradiente" icon="palette" preview="c-grad" on={!!grad} onToggle={v => fx.setEnabled("gradient", v)}
              state={grad ? `${grad.angle}°` : undefined}>
              {grad && (<>
                <ColorRow label="Color A" value={grad.from} onChange={v => patchGradient({ from: v })} />
                <ColorRow label="Color B" value={grad.to} onChange={v => patchGradient({ to: v })} />
                <SliderRow label="Ángulo" icon="rotate" min={0} max={360} step={5} value={grad.angle} onChange={v => patchGradient({ angle: v })} fmt={v => `${Math.round(v)}°`} />
                <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={grad.opacity} onChange={v => patchGradient({ opacity: v })} fmt={pct} />
              </>)}
            </EffectRow>
            <EffectRow id="glass" label="Vidrio" icon="blend" preview="c-glass" on={!!bg?.glass} onToggle={v => patchBg({ glass: v })} state="Translúcido" />
            <EffectRow id="blur" label="Desenfoque" icon="blend" preview="c-blur" active={!!bg?.blur} state={bg?.blur ? px(bg.blur) : "Sin desenfoque"}>
              <SliderRow label="Blur" icon="blend" min={0} max={24} step={1} value={bg?.blur ?? 0}
                onChange={v => patchBg({ blur: v || undefined })} unit="px" fmt={px} />
            </EffectRow>
          </EffectList>
          <UploadField kind="cover" compact value={bg?.image || null} label="Imagen de fondo" caption="Imagen de fondo" accept="image/*"
            onFile={handleBgFile}
            onRemove={() => updateCard(card.id, { bgImage: "", effects: { ...raw, bg: mergePatch(raw?.bg, { image: undefined }) } })} />
        </MenuSection>

        {/* O2: Tamaño and Fuente drive ProfileMusicPlayer. 8 = 100% = today's
            exact sizes (title 10, artist and times 8). */}
        <MenuSection label="Texto" icon="case" summary={`${fontLabel} · ${Math.round((textSize / MUSIC_TEXT_SIZE_DEFAULT) * 100)}%`}
          swatch={card.textColor?.startsWith("#") ? card.textColor : MUSIC_DEFAULT_TEXT_COLOR}
          changed={[card.font, card.textSize].filter(v => v !== undefined).length}
          onReset={() => updateCard(card.id, { font: undefined, textSize: undefined })}>
          <FontField value={card.font ?? DEFAULT_FONT_KEY} fonts={MUSIC_FONTS} label={`Fuente: ${fontLabel}`}
            onChange={v => updateCard(card.id, { font: (v || undefined) as MusicCardData["font"] })}
            modified={!!card.font} onReset={() => updateCard(card.id, { font: undefined })} />
          <ColorRow label="Color" value={card.textColor?.startsWith("#") ? card.textColor : MUSIC_DEFAULT_TEXT_COLOR}
            onChange={v => updateCard(card.id, { textColor: v })} />
          <SliderRow label="Tamaño" icon="maximize" min={7} max={18} step={1} value={textSize}
            onChange={v => updateCard(card.id, { textSize: v })}
            fmt={v => `${Math.round((v / MUSIC_TEXT_SIZE_DEFAULT) * 100)}%`} displayScale={100 / MUSIC_TEXT_SIZE_DEFAULT}
            state={card.textSize !== undefined ? "modified" : undefined} onReset={() => updateCard(card.id, { textSize: undefined })} />
          {textSize > MUSIC_TEXT_SIZE_DEFAULT && <MenuNote tone="warn">Agrandá el bloque si no entra</MenuNote>}
        </MenuSection>

        {/* Effective values (Music's own legacy defaults: radius 10, glow
            outer:true); tiles show what renders (flag AND intensity > 0);
            shadow pauses/resumes like ProfileCard's. */}
        <MenuSection label="Luz" icon="sun" active={light.filter(Boolean).length} summary={names(light)}>
          <EffectList label="Luz de Music">
            <EffectRow id="glow" label="Glow" icon="sun" preview="c-glow" on={anyGlow} onToggle={setGlowOn}
              state={anyGlow ? (where === "both" ? "Ambos" : where === "inner" ? "Interior" : "Exterior") : undefined}>
              {anyGlow && (<>
                <MenuRow label="Dónde">
                  <div style={{ width: 228 }}>
                    <Tabs tabs={GLOW_WHERE} active={where} onChange={setWhere} label="Dónde" />
                  </div>
                </MenuRow>
                <ColorRow label="Color" value={glow?.color ?? D.glowColor} onChange={v => patchGlow({ color: v })} />
                <SliderRow label="Intensidad" icon="sun" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={glow?.intensity ?? 0} onChange={v => patchGlow({ intensity: v })} fmt={pct} />
              </>)}
            </EffectRow>
            <EffectRow id="shadow" label="Sombra" icon="moon" preview="c-shadow" on={shadowOn} onToggle={setShadowOn} offState="Sombra base sutil"
              state={shadowOn ? pct(sh?.intensity ?? 0) : undefined}>
              {shadowOn && (<>
                <ColorRow label="Color" value={shadowFx.color} onChange={v => patchShadow({ color: v })} />
                <SliderRow label="Intensidad" icon="moon" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={sh?.intensity ?? 0} onChange={v => patchShadow({ intensity: v })} fmt={pct} />
              </>)}
            </EffectRow>
            <EffectRow id="border" label="Borde" icon="frame" preview="c-border" active={borderW > 0} state={borderW > 0 ? px(borderW) : "Sin borde"}>
              <ColorRow label="Color" value={bord?.color ?? D.borderColor} onChange={v => patchBorder({ color: v })} keepAlpha
                clearable={!!raw?.border?.color} onClear={() => patchBorder({ color: undefined })}
                state={raw?.border?.color ? "modified" : undefined} onReset={() => patchBorder({ color: undefined })} />
              <SliderRow label="Grosor" icon="frame" min={0} max={6} step={0.5} value={borderW} onChange={v => patchBorder({ width: v })} fmt={px}
                state={raw?.border?.width !== undefined ? "modified" : undefined} onReset={() => patchBorder({ width: undefined })} />
              <SliderRow label="Radio" icon="corner" min={0} max={60} step={1} value={bord?.radius ?? D.radius} onChange={v => patchBorder({ radius: v })} unit="px" fmt={px}
                state={raw?.border?.radius !== undefined ? "modified" : undefined} onReset={() => patchBorder({ radius: undefined })} />
            </EffectRow>
          </EffectList>
        </MenuSection>

        <MenuSection label="Movimiento y cursor" icon="move" active={motion.filter(Boolean).length} summary={names(motion)}>
          <EffectList label="Movimiento y cursor de Music">
            <EffectRow id="float" label="Flotar" icon="arrow-up" preview="c-float" on={!!anim?.floating} onToggle={v => patchAnimations({ floating: v })}
              state={anim?.floating ? px(anim?.floatHeight ?? D.floatHeight) : undefined}>
              {anim?.floating && (<>
                <SliderRow label="Altura" icon="height" min={2} max={24} step={1} value={anim?.floatHeight ?? D.floatHeight} onChange={v => patchAnimations({ floatHeight: v })} unit="px" fmt={px} />
                <SliderRow label="Ciclo" icon="rotate" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? D.floatSpeed} onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${String(v).replace(".", ",")} s`} />
              </>)}
            </EffectRow>
            <EffectRow id="tilt" label="Inclinar 3D" icon="move" preview="c-tilt" on={!!inter?.tilt3d} onToggle={v => patchInteractions({ tilt3d: v })}
              state={inter?.tilt3d ? `${inter?.tiltIntensity ?? D.tilt}°` : undefined}>
              {inter?.tilt3d && <SliderRow label="Intensidad" icon="move" min={1} max={15} step={0.5} value={inter?.tiltIntensity ?? D.tilt} onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${String(v).replace(".", ",")}°`}
                state={raw?.interactions?.tiltIntensity !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ tiltIntensity: undefined })} />}
            </EffectRow>
            <EffectRow id="spotlight" label="Spotlight" icon="sun" preview="c-spot" on={!!inter?.spotlight} onToggle={v => patchInteractions({ spotlight: v })}
              state={inter?.spotlight ? `${inter?.spotlightSize ?? D.spotlightSize}%` : undefined}>
              {inter?.spotlight && (<>
                <ColorRow label="Color" value={inter?.spotlightColor ?? D.spotlightColor} onChange={v => patchInteractions({ spotlightColor: v })} keepAlpha
                  state={raw?.interactions?.spotlightColor ? "modified" : undefined} onReset={() => patchInteractions({ spotlightColor: undefined })} />
                <SliderRow label="Radio" icon="maximize" min={20} max={100} step={1} value={inter?.spotlightSize ?? D.spotlightSize} onChange={v => patchInteractions({ spotlightSize: v })} unit="%" fmt={v => `${Math.round(v)}%`}
                  state={raw?.interactions?.spotlightSize !== undefined ? "modified" : undefined} onReset={() => patchInteractions({ spotlightSize: undefined })} />
              </>)}
            </EffectRow>
            <EffectRow id="hover" label="Glow al pasar" icon="pointer" preview="c-glow" on={!!inter?.hoverGlow} onToggle={setHoverGlow} state="Al pasar" />
          </EffectList>
        </MenuSection>

        <ObjectSection layer={card.layer as LayerIndex} locked={!!card.locked} measures={p.measures} />
      </div>
      </Accordion>
    </InspectorShell>
  );
}
