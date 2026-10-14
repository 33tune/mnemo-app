"use client";
import React from "react";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import type { CardEffects } from "@/types";
import { SliderRow, ColorRow, MenuSection, MenuRow, MenuNote, Collapsible, OffsetRow, EffectList, EffectRow, Tabs } from "@/ui";
import { effectActions, effectState, type EffectOwner } from "@/lib/effectBinding";
import {
  CARD_GLOW_DEFAULT_COLOR, CARD_BORDER_DEFAULT_WIDTH, CARD_BORDER_DEFAULT_COLOR, CARD_RADIUS_FALLBACK,
  CARD_SPOTLIGHT_DEFAULT_SIZE, CARD_SPOTLIGHT_DEFAULT_COLOR, PROFILE_TILT_DEFAULT, CARD_EFFECT_ON_INTENSITY,
  EFFECT_ON_DEFAULTS, cardShadowDisplay, cardGlowRadius, isCardGlowFlagVisible,
} from "@/lib/effectEditorDefaults";

interface Props {
  /** getProfileCardEffects(card) — what the card renders. Display only. */
  effective: CardEffects;
  /** card.effects as stored — the base every patch is built on (Block 1:
   * read-effective / write-raw, see ProfileConfigMenu.tsx). */
  raw?: CardEffects;
  onChange: (patch: CardEffects) => void;
}

type Shadow = NonNullable<CardEffects["shadow"]>;

// Stage FASE 2 (Personalization UI/UX): the EFFECTS tab. Replaces
// PersonalizePanel's old internal Tabs (Fondo/Forma/Efectos) — Background
// moved out to its own top-level tab (ProfileBackgroundMenu.tsx), "Forma"
// is gone (renamed to "Borde" per the audit's naming-collision finding —
// see CLAUDE.md), and the old single flat "Más efectos" Collapsible is now
// 4 independent, individually-collapsible sections (Sombra/Glow/Movimiento/
// Spotlight) instead of one long list. Border stays visible by default (the
// most common of these controls); the other 4 default collapsed.
//
// FASE 1's decoupling (CardLayers.tsx) is what makes every "Avanzado"
// sub-control here safe to expose: shadow blur/offset/opacity, glow radius,
// and border opacity are all genuinely independent now — see that file's
// header for the exact formulas these menu defaults mirror.
//
// Block 1: reads `effective` (legacy borderColor/Width/Radius, glowColor/
// Intensity and the variant's default spotlight included — so the menu
// shows what the card really looks like), writes patches on `raw` only.
// Shadow and hover-scale toggles pause instead of deleting ("apagar no
// borra", effectPause.ts); Glow's Exterior/Interior flags were already
// non-destructive (color/intensity live next to the flags, untouched).
// Menu redesign Phase 2: split by OBJECT. One hook owns every handler;
// CardCornersSection ("Esquinas" — the card's border radius) is mounted by
// "Fondo de la card", CardEffectsSection (border color/width/opacity,
// shadow, glow + its pulse, motion, hover, spotlight, retro) by "Efectos de
// la card". Phase 4 replaces CardEffectsSection with effect tiles without
// touching the routing (ProfileConfigMenu.tsx's OBJECT_SECTIONS).
export function useCardEffectActions({ effective, raw, onChange }: Props) {
  const bord  = effective.border;
  const glow  = effective.glow;
  const inter = effective.interactions;
  const anim  = effective.animations;
  const sh    = effective.shadow;

  // Menu redesign Phase 1: the switch/patch semantics (read effective,
  // write raw, pause instead of delete, O3 neutral glow, clear = delete the
  // key) live in effectBinding.ts — shared with Music, PFP and text.
  const owner: EffectOwner = { kind: "profile", raw, effective, write: onChange };
  const fx = effectActions(owner);
  const patchBorder = (patch: Partial<NonNullable<CardEffects["border"]>>) => fx.patch("border", patch);
  const patchGlow = (patch: Partial<NonNullable<CardEffects["glow"]>>) => fx.patch("glow", patch);
  function patchGlowAnimation(patch: Partial<NonNullable<NonNullable<CardEffects["glow"]>["animation"]>>) {
    patchGlow({ animation: { enabled: false, ...raw?.glow?.animation, ...patch } });
  }
  const patchShadow = (patch: Partial<Shadow>) => fx.patch("shadow", patch);
  const patchInteractions = (patch: Partial<NonNullable<CardEffects["interactions"]>>) => fx.patch("interactions", patch);
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    onChange({ ...raw, animations: { ...raw?.animations, ...patch } });
  }
  function patchRetro(patch: Partial<NonNullable<CardEffects["retro"]>>) {
    onChange({ ...raw, retro: { ...raw?.retro, ...patch } });
  }

  // Bug fix (Block 1): off pauses the whole shadow config; on restores it
  // with a visible intensity (effectBinding.setEffectEnabled). Glow flags:
  // a flag turned on over intensity 0 is raised to a visible intensity, and
  // a NEW glow gets the O3 neutral color — never recolors a visible glow.
  const setShadowOn = (on: boolean) => fx.setEnabled("shadow", on);
  const setGlowFlag = (flag: "outer" | "inner", on: boolean) => fx.setGlowFlag(flag, on);
  const setHoverGlow = (on: boolean) => fx.setHoverGlow(on);

  // Iteration 0: switches show what renders (flag AND intensity > 0).
  const outerOn    = isCardGlowFlagVisible(glow, "outer");
  const innerOn    = isCardGlowFlagVisible(glow, "inner");
  const anyGlow    = outerOn || innerOn;
  const shadowOn   = effectState(raw, effective, "shadow").status === "on";
  const shadowFx   = cardShadowDisplay(sh);
  const glowInt    = glow?.intensity ?? 0;
  // Same "presence = on, 1 = no-op too" contract as useCardInteractions.ts.
  const hoverScaleOn = effectState(raw, effective, "interactions.hoverScale").status === "on";
  const retro = effective.retro;

  return {
    bord, glow, inter, anim, sh, fx, patchBorder, patchGlow, patchGlowAnimation, patchShadow, patchInteractions,
    patchAnimations, patchRetro, setShadowOn, setGlowFlag, setHoverGlow, outerOn, innerOn, anyGlow, shadowOn,
    shadowFx, glowInt, hoverScaleOn, retro,
  };
}

/** "Forma y medidas" (Liquid glass, design cardBg) — the card's corner
 * radius (border.radius) + Medidas (`children`, ProfileConfigMenu), mounted
 * by "Fondo de la card". */
export function CardCornersSection({ children, summaryExtra, ...props }: Props & { children?: React.ReactNode; summaryExtra?: string }) {
  const { bord, patchBorder } = useCardEffectActions(props);
  const { raw } = props;
  const radius = bord?.radius ?? CARD_RADIUS_FALLBACK;
  return (
    <MenuSection label="Forma y medidas" icon="corner" summary={[`${Math.round(radius)} px`, summaryExtra].filter(Boolean).join(" · ")}
      changed={raw?.border?.radius !== undefined ? 1 : 0} onReset={() => patchBorder({ radius: undefined })}>
      <SliderRow label="Esquinas" icon="corner" min={0} max={60} step={1} value={radius}
        onChange={v => patchBorder({ radius: v })} unit="px" fmt={v => `${Math.round(v)} px`}
        state={raw?.border?.radius !== undefined ? "modified" : undefined} onReset={() => patchBorder({ radius: undefined })} />
      {children}
    </MenuSection>
  );
}

const GLOW_WHERE = [
  { id: "outer", label: "Exterior", withText: true }, { id: "inner", label: "Interior", withText: true }, { id: "both", label: "Ambos", withText: true },
];

/** Every card-level effect — mounted by "Efectos de la card".
 * Liquid glass (design menu-schema.js "cardFx"): four cards of tiles — Luz
 * (Borde, Sombra, Brillo, Pulso), Movimiento (Flotar, Inclinar 3D), Al pasar
 * el cursor (Brillo, Escala, Spotlight) and Retro (Scanlines, Ruido VHS,
 * Flicker, Aberración). Same controls, ranges and writes as before.
 * `borderFooter`: the "Esquinas · Fondo" jump inside Borde. */
export function CardEffectsSection({ borderFooter, ...props }: Props & { borderFooter?: React.ReactNode }) {
  const { raw } = props;
  const {
    bord, glow, inter, anim, sh, fx, patchBorder, patchGlow, patchGlowAnimation, patchShadow, patchInteractions,
    patchAnimations, patchRetro, setShadowOn, setGlowFlag, setHoverGlow, outerOn, innerOn, anyGlow, shadowOn,
    shadowFx, glowInt, hoverScaleOn, retro,
  } = useCardEffectActions(props);
  // The Brillo tile: on = the outer glow (O3 neutral color and a visible
  // intensity for a new glow — effectBinding); off = both flags off in ONE
  // write (color/intensity stay, like the flags always did).
  const setGlowOn = (on: boolean) => (on ? setGlowFlag("outer", true) : patchGlow({ outer: false, inner: false }));
  const where = outerOn && innerOn ? "both" : innerOn ? "inner" : "outer";
  const setWhere = (id: string) => patchGlow({ outer: id !== "inner", inner: id !== "outer" });
  const borderW = bord?.width ?? CARD_BORDER_DEFAULT_WIDTH;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const px = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} px`;
  const x = (v: number) => `${v.toFixed(1).replace(".", ",")}x`;
  const pulseOn = !!glow?.animation?.enabled;
  const names = (l: Array<string | false | undefined>) => { const n = l.filter(Boolean) as string[]; return n.length ? n.join(", ") : "Ninguno activo"; };
  const light = [borderW > 0 && "Borde", shadowOn && "Sombra", anyGlow && "Brillo", pulseOn && anyGlow && "Pulso"];
  const motion = [!!anim?.floating && "Flotar", !!inter?.tilt3d && "Inclinar 3D"];
  const cursor = [!!inter?.hoverGlow && "Brillo", hoverScaleOn && "Escala", !!inter?.spotlight && "Spotlight"];
  const retroOn = [!!retro?.scanlines?.enabled && "Scanlines", !!retro?.noise?.enabled && "Ruido VHS", !!retro?.flicker?.enabled && "Flicker", !!retro?.chromaticAberration?.enabled && "Aberración"];
  const count = (l: unknown[]) => l.filter(Boolean).length;
  return (
    <>
      <MenuSection label="Luz" icon="sun" active={count(light)} summary={names(light)}>
        <EffectList label="Luz">
          <EffectRow id="border" label="Borde" icon="frame" preview="c-border" active={borderW > 0}
            state={borderW > 0 ? px(borderW) : "Sin borde"}>
            <ColorRow
              label="Color" value={bord?.color ?? CARD_BORDER_DEFAULT_COLOR} onChange={v => patchBorder({ color: v })} keepAlpha
              clearable={!!raw?.border?.color} onClear={() => patchBorder({ color: undefined })}
              state={raw?.border?.color ? "modified" : undefined} onReset={() => patchBorder({ color: undefined })}
            />
            <SliderRow label="Grosor" icon="frame" min={0} max={6} step={0.5} value={borderW}
              onChange={v => patchBorder({ width: v })} fmt={px}
              state={raw?.border?.width !== undefined ? "modified" : undefined} onReset={() => patchBorder({ width: undefined })} />
            {/* FASE 1: this no longer also fades shadow/glow — see CardLayers.tsx's
                Layer 0c split. */}
            <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={bord?.opacity ?? 1}
              onChange={v => patchBorder({ opacity: v })} fmt={pct}
              state={raw?.border?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBorder({ opacity: undefined })} />
            {borderFooter}
          </EffectRow>

          {/* CardLayers always draws a faint baseline shadow when this is off
              ("0 4px 20px rgba(0,0,0,0.2)") — the tile says so ("Sombra base sutil"). */}
          <EffectRow id="shadow" label="Sombra" icon="moon" preview="c-shadow" on={shadowOn} onToggle={setShadowOn}
            offState="Sombra base sutil" paused={!shadowOn && !!raw?.paused?.shadow}
            state={shadowOn ? pct(sh!.intensity ?? 0) : undefined}>
            {shadowOn && (
              <>
                <SliderRow label="Intensidad" icon="moon" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={sh!.intensity ?? 0}
                  onChange={v => patchShadow({ intensity: v })} fmt={pct} />
                <ColorRow label="Color" value={shadowFx.color} onChange={v => patchShadow({ color: v })} />
                <Collapsible label="Avanzado">
                  <SliderRow label="Blur" icon="blend" min={0} max={80} step={1} value={shadowFx.blur}
                    unit="px" fmt={px} onChange={v => patchShadow({ blur: v })} />
                  <OffsetRow
                    x={shadowFx.offsetX} y={shadowFx.offsetY} defaultX={0} defaultY={4}
                    min={-40} max={40} onChange={(nx, ny) => patchShadow({ offsetX: nx, offsetY: ny })}
                  />
                  <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={shadowFx.opacity}
                    onChange={v => patchShadow({ opacity: v })} fmt={pct} />
                </Collapsible>
              </>
            )}
          </EffectRow>

          <EffectRow id="glow" label="Brillo" icon="sun" preview="c-glow" on={anyGlow} onToggle={setGlowOn}
            state={anyGlow ? (where === "both" ? "Ambos" : where === "inner" ? "Interior" : "Exterior") : undefined}>
            {anyGlow && (
              <>
                <MenuRow label="Dónde">
                  <div style={{ width: 228 }}>
                    <Tabs tabs={GLOW_WHERE} active={where} onChange={setWhere} label="Dónde" />
                  </div>
                </MenuRow>
                <ColorRow label="Color" value={glow?.color ?? CARD_GLOW_DEFAULT_COLOR} onChange={v => patchGlow({ color: v })} />
                <SliderRow label="Intensidad" icon="sun" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={glowInt}
                  onChange={v => patchGlow({ intensity: v })} fmt={pct} />
                <Collapsible label="Avanzado">
                  <SliderRow label="Radio" icon="maximize" min={0} max={60} step={1} value={cardGlowRadius(glow)}
                    unit="px" fmt={px} onChange={v => patchGlow({ radius: v })} />
                </Collapsible>
              </>
            )}
          </EffectRow>

          {/* Stage FASE 3: the "border animation" pulses the card's own Glow
              (CardEffects.glow.animation) — its own tile, "Pulso". */}
          <EffectRow id="pulse" label="Pulso" icon="sparkles" preview="c-pulse" on={pulseOn} onToggle={v => patchGlowAnimation({ enabled: v })}
            state={pulseOn ? x(glow?.animation?.speed ?? 1) : undefined}>
            {pulseOn && (
              <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={glow?.animation?.speed ?? 1}
                onChange={v => patchGlowAnimation({ speed: v })} fmt={x} />
            )}
            {pulseOn && !anyGlow && <MenuNote tone="warn">Prendé Brillo para ver el pulso</MenuNote>}
          </EffectRow>
        </EffectList>
      </MenuSection>

      <MenuSection label="Movimiento" icon="move" active={count(motion)} summary={names(motion)}>
        <EffectList label="Movimiento">
          <EffectRow id="float" label="Flotar" icon="arrow-up" preview="c-float" on={!!anim?.floating} onToggle={v => patchAnimations({ floating: v })}
            state={anim?.floating ? px(anim?.floatHeight ?? 8) : undefined}>
            {anim?.floating ? (
              <>
                <SliderRow label="Amplitud" icon="height" min={2} max={24} step={1} value={anim?.floatHeight ?? 8}
                  onChange={v => patchAnimations({ floatHeight: v })} unit="px" fmt={px} />
                <SliderRow label="Ciclo" icon="rotate" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? 3}
                  onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${String(v).replace(".", ",")} s`} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="tilt" label="Inclinar 3D" icon="move" preview="c-tilt" on={!!inter?.tilt3d} onToggle={v => patchInteractions({ tilt3d: v })}
            state={inter?.tilt3d ? `${inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}°` : undefined}>
            {inter?.tilt3d ? (
              <SliderRow label="Intensidad" icon="move" min={1} max={20} step={0.5} value={inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}
                onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${String(v).replace(".", ",")}°`} />
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      {/* Stage FASE 3: hover glow / scale, each on its own nested layer
          (useCardInteractions.ts + CardLayers.tsx) — two independent tiles. */}
      <MenuSection label="Al pasar el cursor" icon="pointer" active={count(cursor)} summary={names(cursor)}>
        <EffectList label="Al pasar el cursor">
          <EffectRow id="hover" label="Brillo" icon="sun" preview="c-glow" on={!!inter?.hoverGlow} onToggle={setHoverGlow} state="Al pasar" />
          <EffectRow id="hoverScale" label="Escala" icon="maximize" on={hoverScaleOn}
            onToggle={v => fx.setEnabled("interactions.hoverScale", v)}
            state={hoverScaleOn ? `+${Math.round(((inter?.hoverScale ?? EFFECT_ON_DEFAULTS.hoverScale) - 1) * 100)}%` : undefined}>
            {hoverScaleOn && (
              <SliderRow label="Intensidad" icon="maximize" min={1.01} max={1.15} step={0.01} value={inter?.hoverScale ?? EFFECT_ON_DEFAULTS.hoverScale}
                onChange={v => patchInteractions({ hoverScale: v })} fmt={v => `+${Math.round((v - 1) * 100)}%`}
                displayScale={100} displayOffset={-1} />
            )}
          </EffectRow>
          <EffectRow id="spotlight" label="Spotlight" icon="sun" preview="c-spot" on={!!inter?.spotlight} onToggle={v => patchInteractions({ spotlight: v })}
            state={inter?.spotlight ? `${inter?.spotlightSize ?? CARD_SPOTLIGHT_DEFAULT_SIZE}%` : undefined}>
            {inter?.spotlight ? (
              <>
                {/* Effective color (usually the variant's derived rgba); a
                    stored color shows the modified state, whose reset drops
                    back to the variant's. Position follows the cursor. */}
                <ColorRow
                  label="Color"
                  value={inter?.spotlightColor ?? CARD_SPOTLIGHT_DEFAULT_COLOR}
                  onChange={v => patchInteractions({ spotlightColor: v })} keepAlpha
                  state={raw?.interactions?.spotlightColor ? "modified" : undefined}
                  onReset={() => patchInteractions({ spotlightColor: undefined })}
                />
                <SliderRow label="Radio" icon="maximize" min={20} max={100} step={1} value={inter?.spotlightSize ?? CARD_SPOTLIGHT_DEFAULT_SIZE}
                  onChange={v => patchInteractions({ spotlightSize: v })} unit="%" fmt={v => `${Math.round(v)}%`}
                  state={raw?.interactions?.spotlightSize !== undefined ? "modified" : undefined}
                  onReset={() => patchInteractions({ spotlightSize: undefined })} />
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      {/* "Product closeout": composable analog/retro screen effects — each
          independent, own switch/intensity (CardLayers.tsx renders them). */}
      <MenuSection label="Retro" icon="disc" active={count(retroOn)} summary={names(retroOn)}>
        <EffectList label="Retro">
          <EffectRow id="scanlines" label="Scanlines" icon="align-left" preview="c-scan" on={!!retro?.scanlines?.enabled}
            onToggle={v => patchRetro({ scanlines: { enabled: v, intensity: retro?.scanlines?.intensity } })}
            state={retro?.scanlines?.enabled ? pct(retro.scanlines.intensity ?? 0.5) : undefined}>
            {retro?.scanlines?.enabled ? (
              <SliderRow label="Intensidad" icon="align-left" min={0} max={1} step={0.01} value={retro.scanlines.intensity ?? 0.5}
                onChange={v => patchRetro({ scanlines: { enabled: true, intensity: v } })} fmt={pct} />
            ) : null}
          </EffectRow>
          <EffectRow id="noise" label="Ruido VHS" icon="sparkles" preview="c-noise" on={!!retro?.noise?.enabled}
            onToggle={v => patchRetro({ noise: { enabled: v, intensity: retro?.noise?.intensity } })}
            state={retro?.noise?.enabled ? pct(retro.noise.intensity ?? 0.5) : undefined}>
            {retro?.noise?.enabled ? (
              <SliderRow label="Intensidad" icon="sparkles" min={0} max={1} step={0.01} value={retro.noise.intensity ?? 0.5}
                onChange={v => patchRetro({ noise: { enabled: true, intensity: v } })} fmt={pct} />
            ) : null}
          </EffectRow>
          <EffectRow id="flicker" label="Flicker" icon="sun" preview="c-flick" on={!!retro?.flicker?.enabled}
            onToggle={v => patchRetro({ flicker: { enabled: v, intensity: retro?.flicker?.intensity, speed: retro?.flicker?.speed } })}
            state={retro?.flicker?.enabled ? pct(retro.flicker.intensity ?? 0.5) : undefined}>
            {retro?.flicker?.enabled ? (
              <>
                <SliderRow label="Intensidad" icon="sun" min={0} max={1} step={0.01} value={retro.flicker.intensity ?? 0.5}
                  onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, intensity: v } })} fmt={pct} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={retro.flicker.speed ?? 1}
                  onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, speed: v } })} fmt={x} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="chroma" label="Aberración" icon="blend" preview="c-chroma" on={!!retro?.chromaticAberration?.enabled}
            onToggle={v => patchRetro({ chromaticAberration: { enabled: v, intensity: retro?.chromaticAberration?.intensity } })}
            state={retro?.chromaticAberration?.enabled ? pct(retro.chromaticAberration.intensity ?? 0.4) : undefined}>
            {retro?.chromaticAberration?.enabled ? (
              <SliderRow label="Intensidad" icon="blend" min={0} max={1} step={0.01} value={retro.chromaticAberration.intensity ?? 0.4}
                onChange={v => patchRetro({ chromaticAberration: { enabled: true, intensity: v } })} fmt={pct} />
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>
    </>
  );
}
