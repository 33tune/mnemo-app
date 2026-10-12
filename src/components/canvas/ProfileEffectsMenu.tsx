"use client";
import React, { useId } from "react";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import type { CardEffects } from "@/types";
import { SliderRow, Toggle, ColorRow, MenuSection, MenuRow, MenuNote, Collapsible, OffsetRow, EffectList, EffectRow } from "@/ui";
import { countActiveCardEffects } from "@/lib/inspectorObjects";
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

/** "Esquinas" — the card's border radius (border.radius), a property of the
 * card's shape: mounted by "Fondo de la card". */
export function CardCornersSection(props: Props) {
  const { bord, patchBorder } = useCardEffectActions(props);
  const { raw } = props;
  return (
    <MenuSection label="Esquinas" first>
      <SliderRow label="Radio de las esquinas" min={0} max={60} step={1} value={bord?.radius ?? CARD_RADIUS_FALLBACK}
        onChange={v => patchBorder({ radius: v })} unit="px"
        state={raw?.border?.radius !== undefined ? "modified" : undefined} onReset={() => patchBorder({ radius: undefined })} />
    </MenuSection>
  );
}

/** Every card-level effect — mounted by "Efectos de la card".
 * `borderFooter` (r2): the link to "Esquinas" under Fondo de la card.
 * Editor v3 Phase F (design screen 08): one row per effect — swatch, name,
 * state and its switch; the name unfolds the effect's parameters inline,
 * one row at a time (EffectRow). Same controls, ranges and writes as before. */
export function CardEffectsSection({ borderFooter, ...props }: Props & { borderFooter?: React.ReactNode }) {
  const { raw } = props;
  const {
    bord, glow, inter, anim, sh, fx, patchBorder, patchGlow, patchGlowAnimation, patchShadow, patchInteractions,
    patchAnimations, patchRetro, setShadowOn, setGlowFlag, setHoverGlow, outerOn, innerOn, anyGlow, shadowOn,
    shadowFx, glowInt, hoverScaleOn, retro,
  } = useCardEffectActions(props);
  // The Brillo row's switch: on = the outer glow (O3 neutral color and a
  // visible intensity for a new glow — effectBinding); off = both flags off
  // in ONE write (color/intensity stay, like the flags always did).
  const setGlowOn = (on: boolean) => (on ? setGlowFlag("outer", true) : patchGlow({ outer: false, inner: false }));
  const borderW = bord?.width ?? CARD_BORDER_DEFAULT_WIDTH;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const hoverParts = [inter?.hoverGlow && "brillo", hoverScaleOn && "escala"].filter(Boolean) as string[];
  const active = countActiveCardEffects(raw, props.effective);
  const retroId = useId();
  return (
    <MenuSection label="Efectos de la tarjeta" num="01" tone={4} active={active} first>
      <EffectList label="Efectos de la tarjeta">
        <EffectRow id="border" label="Borde" tone={1} active={borderW > 0}
          state={borderW > 0 ? `${String(borderW).replace(".", ",")} px` : "Sin borde"}>
          <ColorRow
            label="Color" value={bord?.color ?? CARD_BORDER_DEFAULT_COLOR} onChange={v => patchBorder({ color: v })} keepAlpha
            clearable={!!raw?.border?.color} onClear={() => patchBorder({ color: undefined })}
            state={raw?.border?.color ? "modified" : undefined} onReset={() => patchBorder({ color: undefined })}
          />
          <SliderRow label="Grosor" min={0} max={6} step={0.5} value={borderW}
            onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`}
            state={raw?.border?.width !== undefined ? "modified" : undefined} onReset={() => patchBorder({ width: undefined })} />
          {/* FASE 1: this no longer also fades shadow/glow — see CardLayers.tsx's
              Layer 0c split. */}
          <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bord?.opacity ?? 1}
            onChange={v => patchBorder({ opacity: v })} fmt={pct}
            state={raw?.border?.opacity !== undefined ? "modified" : undefined} onReset={() => patchBorder({ opacity: undefined })} />
          {borderFooter}
        </EffectRow>

        <EffectRow id="shadow" label="Sombra" tone={1} on={shadowOn} onToggle={setShadowOn}
          state={shadowOn ? pct(sh!.intensity ?? 0) : undefined}>
          {/* CardLayers always draws a faint baseline shadow when this is off
              ("0 4px 20px rgba(0,0,0,0.2)") — say so instead of implying none. */}
          {!shadowOn && <MenuNote>Apagada: queda la sombra base sutil de la tarjeta.</MenuNote>}
          {shadowOn && (
            <>
              <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={sh!.intensity ?? 0}
                onChange={v => patchShadow({ intensity: v })} fmt={pct} />
              <ColorRow label="Color" value={shadowFx.color} onChange={v => patchShadow({ color: v })} />
              <Collapsible label="Avanzado">
                <SliderRow label="Blur" min={0} max={80} step={1} value={shadowFx.blur}
                  unit="px" onChange={v => patchShadow({ blur: v })} />
                <OffsetRow
                  x={shadowFx.offsetX} y={shadowFx.offsetY}
                  min={-40} max={40} onChange={(x, y) => patchShadow({ offsetX: x, offsetY: y })}
                />
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={shadowFx.opacity}
                  onChange={v => patchShadow({ opacity: v })} fmt={pct} />
              </Collapsible>
            </>
          )}
        </EffectRow>

        <EffectRow id="glow" label="Brillo" tone={2} on={anyGlow} onToggle={setGlowOn}
          state={anyGlow ? [outerOn && innerOn ? "ambos" : outerOn ? "exterior" : "interior", glow?.animation?.enabled ? "pulso" : ""].filter(Boolean).join(" · ") : undefined}>
          <MenuRow label="Exterior">
            <Toggle value={outerOn} onChange={v => setGlowFlag("outer", v)} />
          </MenuRow>
          <MenuRow label="Interior">
            <Toggle value={innerOn} onChange={v => setGlowFlag("inner", v)} />
          </MenuRow>
          {anyGlow && (
            <>
              <ColorRow label="Color" value={glow?.color ?? CARD_GLOW_DEFAULT_COLOR} onChange={v => patchGlow({ color: v })} />
              <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={glowInt}
                onChange={v => patchGlow({ intensity: v })} fmt={pct} />
              <Collapsible label="Avanzado">
                <SliderRow label="Radio" min={0} max={60} step={1} value={cardGlowRadius(glow)}
                  unit="px" onChange={v => patchGlow({ radius: v })} />
              </Collapsible>
            </>
          )}
          {/* Stage FASE 3: the "border animation" pulses the card's own Glow
              (CardEffects.glow.animation) — named "Pulso", next to it. */}
          <MenuRow label="Pulso">
            <Toggle value={!!glow?.animation?.enabled} onChange={v => patchGlowAnimation({ enabled: v })} />
          </MenuRow>
          {glow?.animation?.enabled && (
            <SliderRow label="Velocidad del pulso" min={0.3} max={3} step={0.1} value={glow?.animation?.speed ?? 1}
              onChange={v => patchGlowAnimation({ speed: v })} fmt={v => `${v.toFixed(1)}x`} />
          )}
          {!anyGlow && glow?.animation?.enabled && (
            <MenuNote>El pulso está activado, pero no hay glow visible que animar: activá Exterior o Interior.</MenuNote>
          )}
        </EffectRow>

        <EffectRow id="float" label="Flotación" tone={4} on={!!anim?.floating} onToggle={v => patchAnimations({ floating: v })}
          state={anim?.floating ? `${anim?.floatHeight ?? 8} px` : undefined}>
          {anim?.floating ? (
            <>
              <SliderRow label="Amplitud" min={2} max={24} step={1} value={anim?.floatHeight ?? 8}
                onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
              <SliderRow label="Duración del ciclo" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? 3}
                onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
            </>
          ) : <MenuNote>La tarjeta sube y baja suavemente.</MenuNote>}
        </EffectRow>

        <EffectRow id="tilt" label="Inclinación 3D" tone={3} on={!!inter?.tilt3d} onToggle={v => patchInteractions({ tilt3d: v })}
          state={inter?.tilt3d ? `${inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}°` : undefined}>
          {inter?.tilt3d ? (
            <SliderRow label="Intensidad" min={1} max={20} step={0.5} value={inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}
              onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`} />
          ) : <MenuNote>La tarjeta se inclina siguiendo el cursor.</MenuNote>}
          {(!!anim?.floating || !!inter?.tilt3d) && (
            <MenuNote>Flotación e inclinación pueden estar activas al mismo tiempo.</MenuNote>
          )}
        </EffectRow>

        {/* Stage FASE 3: hover glow / scale, each on its own nested layer
            (useCardInteractions.ts + CardLayers.tsx) — two independent
            switches, so the row has none of its own. */}
        <EffectRow id="hover" label="Al pasar el cursor" tone={2} active={hoverParts.length > 0}
          state={hoverParts.length ? hoverParts.join(" · ") : undefined}>
          <MenuRow label="Glow al pasar">
            <Toggle value={!!inter?.hoverGlow} onChange={setHoverGlow} />
          </MenuRow>
          <MenuRow label="Escala al pasar">
            <Toggle
              value={hoverScaleOn}
              onChange={v => fx.setEnabled("interactions.hoverScale", v)}
            />
          </MenuRow>
          {hoverScaleOn && (
            <SliderRow label="Intensidad" min={1.01} max={1.15} step={0.01} value={inter?.hoverScale ?? EFFECT_ON_DEFAULTS.hoverScale}
              onChange={v => patchInteractions({ hoverScale: v })} fmt={v => `${Math.round((v - 1) * 100)}%`}
              displayScale={100} displayOffset={-1} />
          )}
        </EffectRow>

        <EffectRow id="spotlight" label="Spotlight" tone={1} on={!!inter?.spotlight} onToggle={v => patchInteractions({ spotlight: v })}>
          {inter?.spotlight ? (
            <>
              {/* Effective color (usually the variant's derived rgba); a
                  stored color shows the modified dot, whose reset drops back
                  to the variant's. Position follows the cursor (no fixed
                  position infrastructure exists). */}
              <ColorRow
                label="Color"
                value={inter?.spotlightColor ?? CARD_SPOTLIGHT_DEFAULT_COLOR}
                onChange={v => patchInteractions({ spotlightColor: v })} keepAlpha
                state={raw?.interactions?.spotlightColor ? "modified" : undefined}
                onReset={() => patchInteractions({ spotlightColor: undefined })}
              />
              <SliderRow label="Radio" min={20} max={100} step={1} value={inter?.spotlightSize ?? CARD_SPOTLIGHT_DEFAULT_SIZE}
                onChange={v => patchInteractions({ spotlightSize: v })} unit="%"
                state={raw?.interactions?.spotlightSize !== undefined ? "modified" : undefined}
                onReset={() => patchInteractions({ spotlightSize: undefined })} />
            </>
          ) : <MenuNote>Una luz que sigue al cursor sobre la tarjeta.</MenuNote>}
        </EffectRow>

        {/* "Product closeout": composable analog/retro screen effects — each
            independent, own switch/intensity (CardLayers.tsx renders them). */}
        <div role="group" aria-labelledby={retroId} className="mn-fxlist__group">
        <div className="mn-fxlist__label" id={retroId}>Retro</div>
        <EffectRow id="scanlines" label="Scanlines" tone={3} on={!!retro?.scanlines?.enabled}
          onToggle={v => patchRetro({ scanlines: { enabled: v, intensity: retro?.scanlines?.intensity } })}
          state={retro?.scanlines?.enabled ? pct(retro.scanlines.intensity ?? 0.5) : undefined}>
          {retro?.scanlines?.enabled ? (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.scanlines.intensity ?? 0.5}
              onChange={v => patchRetro({ scanlines: { enabled: true, intensity: v } })} fmt={pct} />
          ) : <MenuNote>Líneas de pantalla CRT sobre la tarjeta.</MenuNote>}
        </EffectRow>
        <EffectRow id="noise" label="Ruido VHS" tone={4} on={!!retro?.noise?.enabled}
          onToggle={v => patchRetro({ noise: { enabled: v, intensity: retro?.noise?.intensity } })}
          state={retro?.noise?.enabled ? pct(retro.noise.intensity ?? 0.5) : undefined}>
          {retro?.noise?.enabled ? (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.noise.intensity ?? 0.5}
              onChange={v => patchRetro({ noise: { enabled: true, intensity: v } })} fmt={pct} />
          ) : <MenuNote>Grano analógico sutil.</MenuNote>}
        </EffectRow>
        <EffectRow id="flicker" label="Flicker" tone={2} on={!!retro?.flicker?.enabled}
          onToggle={v => patchRetro({ flicker: { enabled: v, intensity: retro?.flicker?.intensity, speed: retro?.flicker?.speed } })}
          state={retro?.flicker?.enabled ? pct(retro.flicker.intensity ?? 0.5) : undefined}>
          {retro?.flicker?.enabled ? (
            <>
              <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.flicker.intensity ?? 0.5}
                onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, intensity: v } })} fmt={pct} />
              <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={retro.flicker.speed ?? 1}
                onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, speed: v } })} fmt={v => `${v.toFixed(1)}x`} />
            </>
          ) : <MenuNote>Un parpadeo de pantalla vieja.</MenuNote>}
        </EffectRow>
        <EffectRow id="chroma" label="Aberración cromática" tone={1} on={!!retro?.chromaticAberration?.enabled}
          onToggle={v => patchRetro({ chromaticAberration: { enabled: v, intensity: retro?.chromaticAberration?.intensity } })}
          state={retro?.chromaticAberration?.enabled ? pct(retro.chromaticAberration.intensity ?? 0.4) : undefined}>
          {retro?.chromaticAberration?.enabled ? (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.chromaticAberration.intensity ?? 0.4}
              onChange={v => patchRetro({ chromaticAberration: { enabled: true, intensity: v } })} fmt={pct} />
          ) : <MenuNote>Bordes rojo y cian desplazados.</MenuNote>}
        </EffectRow>
        </div>
      </EffectList>
      <MenuNote>Los efectos retro son sutiles y se combinan entre sí sin afectar la legibilidad.</MenuNote>
    </MenuSection>
  );
}
