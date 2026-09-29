"use client";
import type { CardEffects } from "@/types";
import { T, SliderRow, Toggle, ColorRow, MenuSection, MenuRow, MenuNote, Collapsible, Divider, OffsetRow } from "@/ui";

interface Props {
  effects?: CardEffects;
  onChange: (patch: CardEffects) => void;
}

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
export default function ProfileEffectsMenu({ effects, onChange }: Props) {
  const bord  = effects?.border;
  const glow  = effects?.glow;
  const inter = effects?.interactions;
  const anim  = effects?.animations;
  const sh    = effects?.shadow;

  function patchBorder(patch: Partial<NonNullable<CardEffects["border"]>>) {
    onChange({ ...effects, border: { ...effects?.border, ...patch } });
  }
  function patchGlow(patch: Partial<NonNullable<CardEffects["glow"]>>) {
    onChange({ ...effects, glow: { ...effects?.glow, ...patch } });
  }
  function patchGlowAnimation(patch: Partial<NonNullable<NonNullable<CardEffects["glow"]>["animation"]>>) {
    patchGlow({ animation: { enabled: false, ...effects?.glow?.animation, ...patch } });
  }
  function patchShadow(patch: Partial<NonNullable<CardEffects["shadow"]>>) {
    onChange({ ...effects, shadow: { ...effects?.shadow, ...patch } });
  }
  function patchInteractions(patch: Partial<NonNullable<CardEffects["interactions"]>>) {
    onChange({ ...effects, interactions: { ...effects?.interactions, ...patch } });
  }
  function patchAnimations(patch: Partial<NonNullable<CardEffects["animations"]>>) {
    onChange({ ...effects, animations: { ...effects?.animations, ...patch } });
  }
  function patchRetro(patch: Partial<NonNullable<CardEffects["retro"]>>) {
    onChange({ ...effects, retro: { ...effects?.retro, ...patch } });
  }

  const anyGlow    = !!(glow?.outer || glow?.inner);
  const shadowOn   = !!sh?.intensity && sh.intensity > 0;
  const shadowInt  = sh?.intensity ?? 0.5;
  const glowInt    = glow?.intensity ?? 0;
  // Same "presence = on, 1 = no-op too" contract as useCardInteractions.ts.
  const hoverScaleOn = inter?.hoverScale != null && inter.hoverScale !== 1;
  const retro = effects?.retro;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
      <MenuSection label="Borde" first>
        <ColorRow
          label="Color" value={bord?.color ?? "#ffffff"} onChange={v => patchBorder({ color: v })}
          clearable={!!bord?.color} onClear={() => patchBorder({ color: undefined })}
        />
        <SliderRow label="Grosor" min={0} max={6} step={0.5} value={bord?.width ?? 1}
          onChange={v => patchBorder({ width: v })} fmt={v => `${v}px`} />
        <SliderRow label="Radio" min={0} max={60} step={1} value={bord?.radius ?? 14}
          onChange={v => patchBorder({ radius: v })} unit="px" />
        {/* FASE 1: this no longer also fades shadow/glow — see CardLayers.tsx's
            Layer 0c split. */}
        <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={bord?.opacity ?? 1}
          onChange={v => patchBorder({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />

        {/* Stage FASE 3: "border animation" pulses the card's own Glow
            (reuses that system rather than inventing a second one — see
            CardEffects.glow.animation's header) — a border with no glow
            configured just won't show much, which is expected, not a bug. */}
        <MenuRow label="Animación (glow pulsante)">
          <Toggle value={!!glow?.animation?.enabled} onChange={v => patchGlowAnimation({ enabled: v })} />
        </MenuRow>
        {glow?.animation?.enabled && (
          <>
            {!anyGlow && (
              <MenuNote>Activá Glow más abajo para ver el pulso — por ahora no hay glow visible que animar.</MenuNote>
            )}
            <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={glow?.animation?.speed ?? 1}
              onChange={v => patchGlowAnimation({ speed: v })} fmt={v => `${v.toFixed(1)}x`} />
          </>
        )}
      </MenuSection>

      <Collapsible label="Sombra">
        <MenuRow label="Activar">
          <Toggle value={shadowOn} onChange={v => patchShadow({ intensity: v ? shadowInt : 0 })} />
        </MenuRow>
        {shadowOn && (
          <>
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={sh!.intensity ?? 0}
              onChange={v => patchShadow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            <ColorRow label="Color" value={sh?.color ?? "#000000"} onChange={v => patchShadow({ color: v })} />
            <Collapsible label="Avanzado">
              <SliderRow label="Blur" min={0} max={80} step={1} value={sh?.blur ?? Math.round((sh!.intensity ?? 0) * 40)}
                unit="px" onChange={v => patchShadow({ blur: v })} />
              <OffsetRow
                x={sh?.offsetX ?? 0} y={sh?.offsetY ?? Math.round((sh!.intensity ?? 0) * 8)}
                min={-40} max={40} onChange={(x, y) => patchShadow({ offsetX: x, offsetY: y })}
              />
              <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={sh?.opacity ?? (sh?.color ? 1 : 0.5)}
                onChange={v => patchShadow({ opacity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            </Collapsible>
          </>
        )}
      </Collapsible>

      <Collapsible label="Glow">
        <MenuRow label="Exterior">
          <Toggle value={!!glow?.outer} onChange={v => patchGlow({ outer: v })} />
        </MenuRow>
        <MenuRow label="Interior">
          <Toggle value={!!glow?.inner} onChange={v => patchGlow({ inner: v })} />
        </MenuRow>
        {anyGlow && (
          <>
            <ColorRow label="Color" value={glow?.color ?? "#a855f7"} onChange={v => patchGlow({ color: v })} />
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={glowInt}
              onChange={v => patchGlow({ intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            <Collapsible label="Avanzado">
              <SliderRow label="Radio" min={0} max={60} step={1} value={glow?.radius ?? Math.round(glowInt * 30)}
                unit="px" onChange={v => patchGlow({ radius: v })} />
            </Collapsible>
          </>
        )}
      </Collapsible>

      <Collapsible label="Movimiento">
        <MenuSection label="Flotación" first>
          <MenuRow label="Activar">
            <Toggle value={!!anim?.floating} onChange={v => patchAnimations({ floating: v })} />
          </MenuRow>
          {anim?.floating && (
            <>
              <SliderRow label="Amplitud" min={2} max={24} step={1} value={anim?.floatHeight ?? 8}
                onChange={v => patchAnimations({ floatHeight: v })} unit="px" />
              <SliderRow label="Velocidad" min={1} max={8} step={0.5} value={anim?.floatSpeed ?? 3}
                onChange={v => patchAnimations({ floatSpeed: v })} fmt={v => `${v}s`} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Inclinación 3D">
          <MenuRow label="Activar">
            <Toggle value={!!inter?.tilt3d} onChange={v => patchInteractions({ tilt3d: v })} />
          </MenuRow>
          {inter?.tilt3d && (
            <SliderRow label="Intensidad" min={1} max={20} step={0.5} value={inter?.tiltIntensity ?? 10}
              onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${v}°`} />
          )}
        </MenuSection>

        {(!!anim?.floating || !!inter?.tilt3d) && (
          <MenuNote>Flotación e inclinación pueden estar activas al mismo tiempo.</MenuNote>
        )}

        <Divider />

        {/* Stage FASE 3: previously dead controls (Toggle existed since
            FASE 2, nothing ever read them) — now implemented via
            useCardInteractions.ts's onMouseEnter + CardLayers.tsx's
            `--hover-glow`/`--hover-scale`, each on its own nested layer so
            neither fights Tilt/Floating/Spotlight — all four can be active
            simultaneously. See useCardInteractions.ts's header. */}
        <MenuSection label="Hover">
          <MenuRow label="Glow al pasar">
            <Toggle value={!!inter?.hoverGlow} onChange={v => patchInteractions({ hoverGlow: v })} />
          </MenuRow>
          <MenuRow label="Escala al pasar">
            <Toggle
              value={hoverScaleOn}
              onChange={v => patchInteractions({ hoverScale: v ? 1.05 : undefined })}
            />
          </MenuRow>
          {hoverScaleOn && (
            <SliderRow label="Intensidad" min={1.01} max={1.15} step={0.01} value={inter?.hoverScale ?? 1.05}
              onChange={v => patchInteractions({ hoverScale: v })} fmt={v => `${Math.round((v - 1) * 100)}%`} />
          )}
        </MenuSection>
      </Collapsible>

      <Collapsible label="Spotlight">
        <MenuRow label="Activar">
          <Toggle value={!!inter?.spotlight} onChange={v => patchInteractions({ spotlight: v })} />
        </MenuRow>
        {inter?.spotlight && (
          <>
            <ColorRow
              label="Color"
              value={inter?.spotlightColor?.startsWith("#") ? inter.spotlightColor : "#ffffff"}
              onChange={v => patchInteractions({ spotlightColor: v })}
            />
            <SliderRow label="Radio" min={20} max={100} step={1} value={inter?.spotlightSize ?? 65}
              onChange={v => patchInteractions({ spotlightSize: v })} unit="%" />
            {/* Posición manual/estática: no implementada — el spotlight hoy
                sigue al cursor vía CSS vars (useCardInteractions.ts) y no
                existe infraestructura de posición fija. Agregarla sería
                lógica de interacción nueva, fuera del alcance de esta fase
                (solo UI sobre resolvers ya existentes). */}
          </>
        )}
      </Collapsible>

      {/* "Product closeout" (Parte 8): composable analog/retro screen
          effects — each independent, own toggle/intensity, grouped under
          one Collapsible (same pattern "Movimiento" already uses for
          Flotación/Inclinación/Hover) instead of 4 separate top-level
          sections. CSS/SVG-data-URI only, see CardLayers.tsx's rendering. */}
      <Collapsible label="Retro">
        <MenuSection label="Scanlines" first>
          <MenuRow label="Activar">
            <Toggle value={!!retro?.scanlines?.enabled} onChange={v => patchRetro({ scanlines: { enabled: v, intensity: retro?.scanlines?.intensity } })} />
          </MenuRow>
          {retro?.scanlines?.enabled && (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.scanlines.intensity ?? 0.5}
              onChange={v => patchRetro({ scanlines: { enabled: true, intensity: v } })} fmt={v => `${Math.round(v * 100)}%`} />
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Ruido VHS">
          <MenuRow label="Activar">
            <Toggle value={!!retro?.noise?.enabled} onChange={v => patchRetro({ noise: { enabled: v, intensity: retro?.noise?.intensity } })} />
          </MenuRow>
          {retro?.noise?.enabled && (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.noise.intensity ?? 0.5}
              onChange={v => patchRetro({ noise: { enabled: true, intensity: v } })} fmt={v => `${Math.round(v * 100)}%`} />
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Flicker">
          <MenuRow label="Activar">
            <Toggle value={!!retro?.flicker?.enabled} onChange={v => patchRetro({ flicker: { enabled: v, intensity: retro?.flicker?.intensity, speed: retro?.flicker?.speed } })} />
          </MenuRow>
          {retro?.flicker?.enabled && (
            <>
              <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.flicker.intensity ?? 0.5}
                onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, intensity: v } })} fmt={v => `${Math.round(v * 100)}%`} />
              <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={retro.flicker.speed ?? 1}
                onChange={v => patchRetro({ flicker: { ...retro.flicker!, enabled: true, speed: v } })} fmt={v => `${v.toFixed(1)}x`} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Aberración cromática">
          <MenuRow label="Activar">
            <Toggle value={!!retro?.chromaticAberration?.enabled} onChange={v => patchRetro({ chromaticAberration: { enabled: v, intensity: retro?.chromaticAberration?.intensity } })} />
          </MenuRow>
          {retro?.chromaticAberration?.enabled && (
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={retro.chromaticAberration.intensity ?? 0.4}
              onChange={v => patchRetro({ chromaticAberration: { enabled: true, intensity: v } })} fmt={v => `${Math.round(v * 100)}%`} />
          )}
        </MenuSection>

        <MenuNote>Efectos analógicos sutiles — pensados para combinarse entre sí sin afectar la legibilidad.</MenuNote>
      </Collapsible>
    </div>
  );
}
