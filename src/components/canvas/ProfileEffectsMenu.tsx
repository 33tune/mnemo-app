"use client";
import React from "react";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import type { CardEffects } from "@/types";
import { SliderRow, ColorRow, MenuSection, MenuRow, MenuNote, Collapsible, OffsetRow, EffectList, EffectRow, Tabs, FontSelect, SwitchRow, ActionButton, GroupLabel, TextInput } from "@/ui";
import {
  HOLO_STYLES, HOLO_SCOPES, HOLO_PALETTES, ENTRANCE_STYLES, HOLO_DEFAULT_INTENSITY, GLARE_DEFAULT_INTENSITY, GLARE_DEFAULT_SIZE,
  ENTRANCE_DEFAULT_DURATION, ENTRANCE_DEFAULT_STYLE, ENTRANCE_PREVIEW_EVENT, holoOn, glareOn, holoStyleOf, holoScopeOf,
  GLITTER_DEFAULT_AMOUNT, GLITTER_DEFAULT_SIZE, STRASS_DEFAULT_SIZE, STRASS_DEFAULT_GAP,
  GLITTER_COLOR_LABEL, STRASS_COLOR_LABEL, GLITTER_COLORS, strassColors,
} from "@/lib/cardFoil";
import {
  EDGE_METALS, EDGE_DEFAULT_WIDTH, SEAL_DEFAULTS, SEAL_CORNERS, sealText, AURA_DEFAULTS, DUST_DEFAULTS, DEPTH_DEFAULT, MOTION_DEFAULTS,
  FX_PRESS_EVENT, FX_WHITE, EDGE_CUSTOM_DEFAULT, DUST_AUTO, BORDER_RUN_AUTO,
} from "@/lib/cardFx";
import { FX_PALETTES, FX_PALETTE_OPTIONS } from "@/lib/fxPalette";
import { FinishGrid, PaletteField } from "./FxMenuParts";
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
  // Colección (2026-11-04, cardFoil.ts): turning one off keeps its settings.
  function patchHolo(patch: Partial<NonNullable<CardEffects["holo"]>>) {
    onChange({ ...raw, holo: { enabled: false, ...raw?.holo, ...patch } });
  }
  function patchGlare(patch: Partial<NonNullable<CardEffects["glare"]>>) {
    onChange({ ...raw, glare: { enabled: false, ...raw?.glare, ...patch } });
  }
  function patchEntrance(patch: Partial<NonNullable<CardEffects["entrance"]>>) {
    onChange({ ...raw, entrance: { ...raw?.entrance, ...patch } });
  }
  /** One writer for the effects that are a single group with a switch
   * (turning one off keeps its settings). */
  function patchFx<K extends "glitter" | "strass" | "edge" | "aura" | "dust" | "depth" | "seal">(key: K, patch: Partial<NonNullable<CardEffects[K]>>) {
    onChange({ ...raw, [key]: { enabled: false, ...(raw?.[key] as object | undefined), ...patch } });
  }
  /** The card animations (effects.motion.*), same contract. */
  type Motion = NonNullable<CardEffects["motion"]>;
  function patchMotion<K extends keyof Motion>(key: K, patch: Partial<NonNullable<Motion[K]>>) {
    onChange({ ...raw, motion: { ...raw?.motion, [key]: { enabled: false, ...(raw?.motion?.[key] as object | undefined), ...patch } } });
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
    patchAnimations, patchRetro, patchHolo, patchGlare, patchEntrance, patchFx, patchMotion, setShadowOn, setGlowFlag, setHoverGlow, outerOn, innerOn, anyGlow, shadowOn,
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

const GLARE_SHAPES = [
  { id: "both", label: "Punto y franja", withText: true }, { id: "spot", label: "Punto", withText: true }, { id: "streak", label: "Franja", withText: true },
];
const GLITTER_SCOPES = [
  { id: "text", label: "Textos", withText: true }, { id: "card", label: "Toda", withText: true }, { id: "border", label: "Borde", withText: true },
];
const STRASS_SHAPES = [
  { id: "round", label: "Redonda", withText: true }, { id: "heart", label: "Corazón", withText: true }, { id: "star", label: "Estrella", withText: true },
];
const DUST_LAYERS = [{ id: "front", label: "Delante", withText: true }, { id: "back", label: "Detrás", withText: true }];

const GLOW_WHERE = [
  { id: "outer", label: "Exterior", withText: true }, { id: "inner", label: "Interior", withText: true }, { id: "both", label: "Ambos", withText: true },
];

/** Every card-level effect — mounted by "Efectos de la card".
 * 2026-11-11 (user request: "Colección no se entiende"): grouped by what
 * each effect DOES — Holo y reflejo · Partículas · Borde, sombra y brillo ·
 * Animaciones · Al tocar o pasar el cursor · Entrada · Retro. Tiles with a
 * preview, a few controls each and the rest under "Más ajustes"; the colored
 * effects share one palette picker (FxMenuParts › PaletteField).
 * `borderFooter`: the "Esquinas · Fondo" jump inside Borde. */
export function CardEffectsSection({ borderFooter, ...props }: Props & { borderFooter?: React.ReactNode }) {
  const { raw } = props;
  const {
    bord, glow, inter, anim, sh, fx, patchBorder, patchGlow, patchGlowAnimation, patchShadow, patchInteractions,
    patchAnimations, patchRetro, patchHolo, patchGlare, patchEntrance, patchFx, patchMotion, setShadowOn, setGlowFlag, setHoverGlow, outerOn, innerOn, anyGlow, shadowOn,
    shadowFx, glowInt, hoverScaleOn, retro,
  } = useCardEffectActions(props);
  const { effective } = props;
  const holo = effective.holo, glare = effective.glare, entrance = effective.entrance;
  const holoIsOn = holoOn(effective), glareIsOn = glareOn(effective), entranceOn = !!entrance?.enabled;
  const holoStyle = holoStyleOf(effective);
  const holoName = HOLO_STYLES.find(s => s.id === holoStyle)?.label;
  const glitter = effective.glitter, strass = effective.strass;
  const edge = effective.edge, aura = effective.aura, dust = effective.dust, depth = effective.depth, seal = effective.seal;
  const mo = effective.motion;
  const entranceName = ENTRANCE_STYLES.find(s => s.id === (entrance?.style ?? ENTRANCE_DEFAULT_STYLE))?.label;
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
  const secs = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} s`;
  const pulseOn = !!glow?.animation?.enabled;
  const names = (l: Array<string | false | undefined>) => { const n = l.filter(Boolean) as string[]; return n.length ? n.join(", ") : "Ninguno activo"; };
  const count = (l: unknown[]) => l.filter(Boolean).length;
  const paletteName = (v: { palette?: string } | undefined, auto: string) => FX_PALETTE_OPTIONS.find(o => o.id === v?.palette)?.label ?? auto;
  const tryPress = (kind: string) => (e: React.MouseEvent) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent(FX_PRESS_EVENT, { detail: kind })); };

  const foil = [holoIsOn && "Holo", glareIsOn && "Reflejo", !!edge?.enabled && "Canto metálico", !!seal?.enabled && "Sello"];
  const particles = [!!glitter?.enabled && "Glitter", !!strass?.enabled && "Strass", !!dust?.enabled && "Polvo"];
  const light = [borderW > 0 && "Borde", shadowOn && "Sombra", anyGlow && "Brillo", pulseOn && anyGlow && "Pulso", !!aura?.enabled && "Aura"];
  const motion = [!!anim?.floating && "Flotar", !!mo?.breathe?.enabled && "Respirar", !!mo?.sway?.enabled && "Balanceo", !!mo?.heartbeat?.enabled && "Latido",
    !!mo?.sweep?.enabled && "Destello", !!mo?.borderRun?.enabled && "Luz en el borde"];
  const cursor = [!!inter?.tilt3d && "Inclinar 3D", !!depth?.enabled && "Foto con profundidad", !!inter?.hoverGlow && "Brillo", hoverScaleOn && "Escala", !!inter?.spotlight && "Spotlight",
    !!mo?.ripple?.enabled && "Onda", !!mo?.jelly?.enabled && "Rebote", !!mo?.spin?.enabled && "Giro"];
  const retroOn = [!!retro?.scanlines?.enabled && "Scanlines", !!retro?.noise?.enabled && "Ruido VHS", !!retro?.flicker?.enabled && "Flicker", !!retro?.chromaticAberration?.enabled && "Aberración"];
  return (
    <>
      {/* What makes the card feel like a collectible: a foil that moves
          with the light, the glare over it, a metal rim, a seal. */}
      <MenuSection label="Holo y reflejo" icon="sparkles" active={count(foil)} summary={names(foil)}>
        <EffectList label="Holo y reflejo">
          <EffectRow id="holo" label="Holo" icon="sparkles" preview="c-holo" on={holoIsOn}
            onToggle={v => patchHolo({ enabled: v, intensity: v && !(holo?.intensity) ? HOLO_DEFAULT_INTENSITY : holo?.intensity })}
            state={holoIsOn ? holoName : undefined}>
            {holoIsOn ? (
              <>
                <FinishGrid value={holoStyle} fx={effective} onChange={v => patchHolo({ enabled: true, style: v })} />
                <PaletteField value={holo} auto={HOLO_PALETTES[holoStyle]} autoLabel="Original"
                  onChange={v => patchHolo({ enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Intensidad" icon="sparkles" min={0.05} max={1} step={0.01} value={holo?.intensity ?? HOLO_DEFAULT_INTENSITY}
                  onChange={v => patchHolo({ enabled: true, intensity: v })} fmt={pct} />
                {/* Four options: a row of their own (beside a label they were cramped). */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <GroupLabel>Dónde</GroupLabel>
                  <Tabs tabs={HOLO_SCOPES} active={holoScopeOf(effective)}
                    onChange={id => patchHolo({ enabled: true, scope: id === "card" ? undefined : id as NonNullable<CardEffects["holo"]>["scope"] })} label="Dónde" />
                </div>
                <Collapsible label="Más ajustes">
                  <SliderRow label="Tamaño del dibujo" icon="maximize" min={0.5} max={2} step={0.05} value={holo?.scale ?? 1}
                    onChange={v => patchHolo({ enabled: true, scale: v === 1 ? undefined : v })} fmt={pct} />
                  <SliderRow label="Ángulo" icon="rotate" min={-90} max={90} step={5} value={holo?.angle ?? 0}
                    onChange={v => patchHolo({ enabled: true, angle: v === 0 ? undefined : v })} fmt={v => `${Math.round(v)}°`} />
                  <SwitchRow label="Moverse solo" icon="play" value={holo?.idle !== false}
                    onChange={v => patchHolo({ enabled: true, idle: v ? undefined : false })} />
                </Collapsible>
                <MenuNote>Se mueve con el mouse, el dedo o el giroscopio del celular.</MenuNote>
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="glare" label="Reflejo" icon="sun" preview="c-glare" on={glareIsOn}
            onToggle={v => patchGlare({ enabled: v, intensity: v && !(glare?.intensity) ? GLARE_DEFAULT_INTENSITY : glare?.intensity })}
            state={glareIsOn ? pct(glare?.intensity ?? GLARE_DEFAULT_INTENSITY) : undefined}>
            {glareIsOn ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <GroupLabel>Forma</GroupLabel>
                  <Tabs tabs={GLARE_SHAPES} active={glare?.shape ?? "both"}
                    onChange={id => patchGlare({ enabled: true, shape: id === "both" ? undefined : id as NonNullable<CardEffects["glare"]>["shape"] })} label="Forma" />
                </div>
                <SliderRow label="Intensidad" icon="sun" min={0.05} max={1} step={0.01} value={glare?.intensity ?? GLARE_DEFAULT_INTENSITY}
                  onChange={v => patchGlare({ enabled: true, intensity: v })} fmt={pct} />
                <SliderRow label="Tamaño" icon="maximize" min={0} max={1} step={0.01} value={glare?.size ?? GLARE_DEFAULT_SIZE}
                  onChange={v => patchGlare({ enabled: true, size: v })} fmt={pct} />
                <ColorRow label="Color" value={glare?.color ?? FX_WHITE} onChange={v => patchGlare({ enabled: true, color: v })}
                  state={raw?.glare?.color ? "modified" : undefined} onReset={() => patchGlare({ enabled: true, color: undefined })} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="edge" label="Canto metálico" icon="frame" preview="c-edge" on={!!edge?.enabled}
            onToggle={v => patchFx("edge", { enabled: v })} state={edge?.enabled ? EDGE_METALS.find(m => m.id === (edge.metal ?? "gold"))?.label : undefined}>
            {edge?.enabled ? (
              <>
                <MenuRow label="Metal">
                  <FontSelect value={edge.metal ?? "gold"} onChange={v => patchFx("edge", { enabled: true, metal: v as NonNullable<CardEffects["edge"]>["metal"] })}
                    fonts={EDGE_METALS.map(m => ({ key: m.id, label: m.label }))} />
                </MenuRow>
                {edge.metal === "custom" ? (
                  <ColorRow label="Color" value={edge.color ?? EDGE_CUSTOM_DEFAULT} onChange={v => patchFx("edge", { enabled: true, color: v })} />
                ) : null}
                <SliderRow label="Grosor" icon="frame" min={2} max={14} step={1} value={edge.width ?? EDGE_DEFAULT_WIDTH}
                  onChange={v => patchFx("edge", { enabled: true, width: v })} fmt={px} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="seal" label="Sello" icon="disc" preview="c-seal" on={!!seal?.enabled}
            onToggle={v => patchFx("seal", { enabled: v })} state={seal?.enabled ? sealText(effective) : undefined}>
            {seal?.enabled ? (
              <>
                <TextInput label="Texto (hasta 3 letras)" value={seal.text ?? ""} placeholder={SEAL_DEFAULTS.text} maxLength={3}
                  onChange={v => patchFx("seal", { enabled: true, text: v || undefined })} />
                <MenuRow label="Esquina">
                  <FontSelect value={seal.corner ?? SEAL_DEFAULTS.corner} onChange={v => patchFx("seal", { enabled: true, corner: v as NonNullable<CardEffects["seal"]>["corner"] })}
                    fonts={SEAL_CORNERS.map(c => ({ key: c.id, label: c.label }))} />
                </MenuRow>
                <SliderRow label="Tamaño" icon="maximize" min={30} max={84} step={1} value={seal.size ?? SEAL_DEFAULTS.size}
                  onChange={v => patchFx("seal", { enabled: true, size: v })} fmt={px} />
                <PaletteField value={seal} auto={FX_PALETTES.rainbow} autoLabel="Arcoíris"
                  onChange={v => patchFx("seal", { enabled: true, palette: v.palette, colors: v.colors })} />
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      <MenuSection label="Partículas" icon="sparkles" active={count(particles)} summary={names(particles)}>
        <EffectList label="Partículas">
          <EffectRow id="glitter" label="Glitter" icon="sparkles" preview="c-glitter" on={!!glitter?.enabled}
            onToggle={v => patchFx("glitter", { enabled: v })}
            state={glitter?.enabled ? GLITTER_SCOPES.find(s => s.id === (glitter.scope ?? "text"))?.label : undefined}>
            {glitter?.enabled ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <GroupLabel>Dónde</GroupLabel>
                  <Tabs tabs={GLITTER_SCOPES} active={glitter.scope ?? "text"}
                    onChange={id => patchFx("glitter", { enabled: true, scope: id === "text" ? undefined : id as NonNullable<CardEffects["glitter"]>["scope"] })} label="Dónde" />
                </div>
                <PaletteField value={glitter} auto={GLITTER_COLORS[glitter.color ?? "white"]} autoLabel={GLITTER_COLOR_LABEL[glitter.color ?? "white"]}
                  onChange={v => patchFx("glitter", { enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Cantidad" icon="sparkles" min={0} max={1} step={0.01} value={glitter.amount ?? GLITTER_DEFAULT_AMOUNT}
                  onChange={v => patchFx("glitter", { enabled: true, amount: v })} fmt={pct} />
                <SliderRow label="Tamaño" icon="maximize" min={0} max={1} step={0.01} value={glitter.size ?? GLITTER_DEFAULT_SIZE}
                  onChange={v => patchFx("glitter", { enabled: true, size: v })} fmt={pct} />
                {!glitter.palette ? (
                  <Collapsible label="Más ajustes">
                    <MenuRow label="Tono base">
                      <FontSelect value={glitter.color ?? "white"} onChange={v => patchFx("glitter", { enabled: true, color: v as NonNullable<CardEffects["glitter"]>["color"] })}
                        fonts={Object.entries(GLITTER_COLOR_LABEL).map(([key, label]) => ({ key, label }))} />
                    </MenuRow>
                  </Collapsible>
                ) : null}
                <MenuNote>Destella más donde pasa la luz.</MenuNote>
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="strass" label="Strass" icon="frame" preview="c-strass" on={!!strass?.enabled}
            onToggle={v => patchFx("strass", { enabled: v })} state={strass?.enabled ? STRASS_SHAPES.find(s => s.id === (strass.shape ?? "round"))?.label : undefined}>
            {strass?.enabled ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <GroupLabel>Forma</GroupLabel>
                  <Tabs tabs={STRASS_SHAPES} active={strass.shape ?? "round"}
                    onChange={id => patchFx("strass", { enabled: true, shape: id === "round" ? undefined : id as NonNullable<CardEffects["strass"]>["shape"] })} label="Forma" />
                </div>
                <PaletteField value={strass} auto={strassColors({ strass: { enabled: true, color: strass.color } })} autoLabel={STRASS_COLOR_LABEL[strass.color ?? "crystal"]}
                  onChange={v => patchFx("strass", { enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Tamaño" icon="maximize" min={5} max={16} step={1} value={strass.size ?? STRASS_DEFAULT_SIZE}
                  onChange={v => patchFx("strass", { enabled: true, size: v })} fmt={px} />
                <SliderRow label="Separación" icon="spacing" min={0} max={1} step={0.01} value={strass.gap ?? STRASS_DEFAULT_GAP}
                  onChange={v => patchFx("strass", { enabled: true, gap: v })} fmt={pct} />
                {!strass.palette ? (
                  <Collapsible label="Más ajustes">
                    <MenuRow label="Piedras">
                      <FontSelect value={strass.color ?? "crystal"} onChange={v => patchFx("strass", { enabled: true, color: v as NonNullable<CardEffects["strass"]>["color"] })}
                        fonts={Object.entries(STRASS_COLOR_LABEL).map(([key, label]) => ({ key, label }))} />
                    </MenuRow>
                  </Collapsible>
                ) : null}
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="dust" label="Polvo de estrellas" icon="sparkles" preview="c-dust" on={!!dust?.enabled}
            onToggle={v => patchFx("dust", { enabled: v })} state={dust?.enabled ? (dust.layer === "back" ? "Detrás" : "Delante") : undefined}>
            {dust?.enabled ? (
              <>
                <MenuRow label="Dónde">
                  <div style={{ width: 228 }}>
                    <Tabs tabs={DUST_LAYERS} active={dust.layer ?? "front"}
                      onChange={id => patchFx("dust", { enabled: true, layer: id === "front" ? undefined : "back" })} label="Dónde" />
                  </div>
                </MenuRow>
                <PaletteField value={dust} auto={DUST_AUTO} autoLabel="Blanco"
                  onChange={v => patchFx("dust", { enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Cantidad" icon="sparkles" min={0} max={1} step={0.01} value={dust.amount ?? DUST_DEFAULTS.amount}
                  onChange={v => patchFx("dust", { enabled: true, amount: v })} fmt={pct} />
                <SliderRow label="Tamaño" icon="maximize" min={0} max={1} step={0.01} value={dust.size ?? DUST_DEFAULTS.size}
                  onChange={v => patchFx("dust", { enabled: true, size: v })} fmt={pct} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={dust.speed ?? DUST_DEFAULTS.speed}
                  onChange={v => patchFx("dust", { enabled: true, speed: v })} fmt={x} />
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      <MenuSection label="Borde, sombra y brillo" icon="sun" active={count(light)} summary={names(light)}>
        <EffectList label="Borde, sombra y brillo">
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

          <EffectRow id="aura" label="Aura" icon="sun" preview="c-aura" on={!!aura?.enabled}
            onToggle={v => patchFx("aura", { enabled: v })} state={aura?.enabled ? paletteName(aura, "Neón") : undefined}>
            {aura?.enabled ? (
              <>
                <PaletteField value={aura} auto={FX_PALETTES.neon} autoLabel="Neón"
                  onChange={v => patchFx("aura", { enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Intensidad" icon="sun" min={0} max={1} step={0.01} value={aura.intensity ?? AURA_DEFAULTS.intensity}
                  onChange={v => patchFx("aura", { enabled: true, intensity: v })} fmt={pct} />
                <SliderRow label="Tamaño" icon="maximize" min={0} max={1} step={0.01} value={aura.size ?? AURA_DEFAULTS.size}
                  onChange={v => patchFx("aura", { enabled: true, size: v })} fmt={pct} />
                <SwitchRow label="Que lata" icon="sparkles" value={!!aura.pulse}
                  onChange={v => patchFx("aura", { enabled: true, pulse: v || undefined })} />
                <SwitchRow label="Que gire" icon="rotate" value={!!aura.spin}
                  onChange={v => patchFx("aura", { enabled: true, spin: v || undefined })} />
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      {/* What the card does by itself while it is on screen (cardFx.ts). */}
      <MenuSection label="Animaciones" icon="move" active={count(motion)} summary={names(motion)}>
        <EffectList label="Animaciones">
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
          <EffectRow id="breathe" label="Respirar" icon="maximize" preview="c-breathe" on={!!mo?.breathe?.enabled}
            onToggle={v => patchMotion("breathe", { enabled: v })} state={mo?.breathe?.enabled ? pct(mo.breathe.amount ?? MOTION_DEFAULTS.breathe.amount) : undefined}>
            {mo?.breathe?.enabled ? (
              <>
                <SliderRow label="Cuánto" icon="maximize" min={0} max={1} step={0.01} value={mo.breathe.amount ?? MOTION_DEFAULTS.breathe.amount}
                  onChange={v => patchMotion("breathe", { enabled: true, amount: v })} fmt={pct} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={mo.breathe.speed ?? MOTION_DEFAULTS.breathe.speed}
                  onChange={v => patchMotion("breathe", { enabled: true, speed: v })} fmt={x} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="sway" label="Balanceo" icon="rotate" preview="c-sway" on={!!mo?.sway?.enabled}
            onToggle={v => patchMotion("sway", { enabled: v })} state={mo?.sway?.enabled ? pct(mo.sway.amount ?? MOTION_DEFAULTS.sway.amount) : undefined}>
            {mo?.sway?.enabled ? (
              <>
                <SliderRow label="Cuánto" icon="rotate" min={0} max={1} step={0.01} value={mo.sway.amount ?? MOTION_DEFAULTS.sway.amount}
                  onChange={v => patchMotion("sway", { enabled: true, amount: v })} fmt={pct} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={mo.sway.speed ?? MOTION_DEFAULTS.sway.speed}
                  onChange={v => patchMotion("sway", { enabled: true, speed: v })} fmt={x} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="heartbeat" label="Latido" icon="sparkles" preview="c-beat" on={!!mo?.heartbeat?.enabled}
            onToggle={v => patchMotion("heartbeat", { enabled: v })} state={mo?.heartbeat?.enabled ? pct(mo.heartbeat.amount ?? MOTION_DEFAULTS.heartbeat.amount) : undefined}>
            {mo?.heartbeat?.enabled ? (
              <>
                <SliderRow label="Cuánto" icon="maximize" min={0} max={1} step={0.01} value={mo.heartbeat.amount ?? MOTION_DEFAULTS.heartbeat.amount}
                  onChange={v => patchMotion("heartbeat", { enabled: true, amount: v })} fmt={pct} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={mo.heartbeat.speed ?? MOTION_DEFAULTS.heartbeat.speed}
                  onChange={v => patchMotion("heartbeat", { enabled: true, speed: v })} fmt={x} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="sweep" label="Destello" icon="sun" preview="c-sweep" on={!!mo?.sweep?.enabled}
            onToggle={v => patchMotion("sweep", { enabled: v })} state={mo?.sweep?.enabled ? `cada ${secs(mo.sweep.interval ?? MOTION_DEFAULTS.sweep.interval)}` : undefined}>
            {mo?.sweep?.enabled ? (
              <>
                <SliderRow label="Cada cuánto" icon="rotate" min={2} max={20} step={0.5} value={mo.sweep.interval ?? MOTION_DEFAULTS.sweep.interval}
                  onChange={v => patchMotion("sweep", { enabled: true, interval: v })} fmt={secs} />
                <ColorRow label="Color" value={mo.sweep.color ?? FX_WHITE} onChange={v => patchMotion("sweep", { enabled: true, color: v })}
                  state={raw?.motion?.sweep?.color ? "modified" : undefined} onReset={() => patchMotion("sweep", { enabled: true, color: undefined })} />
                <MenuNote>Una franja de luz cruza la tarjeta cada tanto.</MenuNote>
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="borderRun" label="Luz en el borde" icon="frame" preview="c-run" on={!!mo?.borderRun?.enabled}
            onToggle={v => patchMotion("borderRun", { enabled: v })} state={mo?.borderRun?.enabled ? x(mo.borderRun.speed ?? MOTION_DEFAULTS.borderRun.speed) : undefined}>
            {mo?.borderRun?.enabled ? (
              <>
                <PaletteField value={mo.borderRun} auto={BORDER_RUN_AUTO} autoLabel="Blanco"
                  onChange={v => patchMotion("borderRun", { enabled: true, palette: v.palette, colors: v.colors })} />
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={mo.borderRun.speed ?? MOTION_DEFAULTS.borderRun.speed}
                  onChange={v => patchMotion("borderRun", { enabled: true, speed: v })} fmt={x} />
                <SliderRow label="Grosor" icon="frame" min={1} max={8} step={0.5} value={mo.borderRun.width ?? MOTION_DEFAULTS.borderRun.width}
                  onChange={v => patchMotion("borderRun", { enabled: true, width: v })} fmt={px} />
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      {/* What answers to the visitor: the cursor, the finger, the phone's tilt. */}
      <MenuSection label="Al tocar o pasar el cursor" icon="pointer" active={count(cursor)} summary={names(cursor)}>
        <EffectList label="Al tocar o pasar el cursor">
          <EffectRow id="tilt" label="Inclinar 3D" icon="move" preview="c-tilt" on={!!inter?.tilt3d} onToggle={v => patchInteractions({ tilt3d: v })}
            state={inter?.tilt3d ? `${inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}°` : undefined}>
            {inter?.tilt3d ? (
              <SliderRow label="Intensidad" icon="move" min={1} max={20} step={0.5} value={inter?.tiltIntensity ?? PROFILE_TILT_DEFAULT}
                onChange={v => patchInteractions({ tiltIntensity: v })} fmt={v => `${String(v).replace(".", ",")}°`} />
            ) : null}
          </EffectRow>
          <EffectRow id="depth" label="Foto con profundidad" icon="image" preview="c-depth" on={!!depth?.enabled}
            onToggle={v => patchFx("depth", { enabled: v })} state={depth?.enabled ? pct(depth.amount ?? DEPTH_DEFAULT) : undefined}>
            {depth?.enabled ? (
              <>
                <SliderRow label="Cuánto" icon="move" min={0} max={1} step={0.01} value={depth.amount ?? DEPTH_DEFAULT}
                  onChange={v => patchFx("depth", { enabled: true, amount: v })} fmt={pct} />
                <MenuNote>La foto se corre apenas contra la tarjeta al mover el mouse o el celular.</MenuNote>
              </>
            ) : null}
          </EffectRow>
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
          <EffectRow id="ripple" label="Onda" icon="disc" preview="c-ripple" on={!!mo?.ripple?.enabled}
            onToggle={v => patchMotion("ripple", { enabled: v })} state={mo?.ripple?.enabled ? "Al tocar" : undefined}>
            {mo?.ripple?.enabled ? (
              <>
                <ColorRow label="Color" value={mo.ripple.color ?? FX_WHITE} onChange={v => patchMotion("ripple", { enabled: true, color: v })}
                  state={raw?.motion?.ripple?.color ? "modified" : undefined} onReset={() => patchMotion("ripple", { enabled: true, color: undefined })} />
                <ActionButton fullWidth onClick={tryPress("ripple")}>Probar</ActionButton>
                <MenuNote>Sale de donde tocan la tarjeta en tu perfil.</MenuNote>
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="jelly" label="Rebote" icon="maximize" preview="c-jelly" on={!!mo?.jelly?.enabled}
            onToggle={v => patchMotion("jelly", { enabled: v })} state={mo?.jelly?.enabled ? pct(mo.jelly.amount ?? MOTION_DEFAULTS.jelly.amount) : undefined}>
            {mo?.jelly?.enabled ? (
              <>
                <SliderRow label="Cuánto" icon="maximize" min={0} max={1} step={0.01} value={mo.jelly.amount ?? MOTION_DEFAULTS.jelly.amount}
                  onChange={v => patchMotion("jelly", { enabled: true, amount: v })} fmt={pct} />
                <ActionButton fullWidth onClick={tryPress("jelly")}>Probar</ActionButton>
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="spin" label="Giro" icon="rotate" preview="c-spin" on={!!mo?.spin?.enabled}
            onToggle={v => patchMotion("spin", { enabled: v })} state={mo?.spin?.enabled ? "Al tocar" : undefined}>
            {mo?.spin?.enabled ? (
              <>
                <ActionButton fullWidth onClick={tryPress("spin")}>Probar</ActionButton>
                <MenuNote>La tarjeta da una vuelta entera cuando la tocan.</MenuNote>
              </>
            ) : null}
          </EffectRow>
        </EffectList>
      </MenuSection>

      {/* How the card comes in on the public profile. */}
      <MenuSection label="Entrada" icon="play" active={entranceOn ? 1 : 0} summary={entranceOn ? entranceName ?? "Activa" : "La de siempre"}>
        <EffectList label="Entrada">
          <EffectRow id="entrance" label="Entrada" icon="play" preview="c-enter" on={entranceOn}
            onToggle={v => patchEntrance({ enabled: v, style: entrance?.style ?? ENTRANCE_DEFAULT_STYLE })}
            state={entranceOn ? entranceName : undefined}>
            {entranceOn ? (
              <>
                <MenuRow label="Animación">
                  <FontSelect value={entrance?.style ?? ENTRANCE_DEFAULT_STYLE} onChange={v => patchEntrance({ enabled: true, style: v as NonNullable<CardEffects["entrance"]>["style"] })}
                    fonts={ENTRANCE_STYLES.map(s => ({ key: s.id, label: s.label }))} />
                </MenuRow>
                <SliderRow label="Duración" icon="rotate" min={0.3} max={3} step={0.1} value={entrance?.duration ?? ENTRANCE_DEFAULT_DURATION}
                  onChange={v => patchEntrance({ enabled: true, duration: v })} fmt={v => `${v.toFixed(1).replace(".", ",")} s`} />
                <SwitchRow label="Destello al entrar" icon="sparkles" value={!!entrance?.shine}
                  onChange={v => patchEntrance({ enabled: true, shine: v || undefined })} />
                <ActionButton fullWidth onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent(ENTRANCE_PREVIEW_EVENT)); }}>
                  Ver entrada
                </ActionButton>
                <MenuNote>Se ve cada vez que alguien abre tu perfil.</MenuNote>
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
