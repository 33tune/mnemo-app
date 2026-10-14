"use client";
import React, { useId } from "react";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { setEffectEnabled } from "@/lib/effectBinding";
import type { ProfileCardData, TextShadowEffect, TextGlowEffect, TextStrokeEffect, TextEffects, TextRole, RoleTextEffect, GlowPulseAnimation } from "@/types";
import { splitCardTextEffects } from "@/lib/textEffects";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveCardColors, inheritableColorState } from "@/lib/cardColors";
import { pauseEffect, resumeEffect, mergePatch, type EffectPath } from "@/lib/effectPause";
import {
  nameFontSizeDefault, TEXT_SHADOW_DEFAULTS, textShadowOpacity, TEXT_GLOW_DEFAULT_COLOR, textGlowRadius, TEXT_STROKE_DEFAULT_COLOR,
  NAME_FONT_DEFAULT, MONO_ROLE_FONT_DEFAULT, MONO_LINE_HEIGHT_NORMAL, ROLE_TYPOGRAPHY_RANGES as R, ROLE_WEIGHT_FALLBACK,
} from "@/lib/effectEditorDefaults";
import { SliderRow, ColorRow, MenuSection, MenuRow, MenuNote, Tabs, OffsetRow, EffectList, EffectRow } from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
import RoleTypographyFields from "./RoleTypographyFields";

type TextAlign = NonNullable<ProfileCardData["textAlign"]>;
const ALIGN_TABS: { id: TextAlign; label: string; icon: "align-left" | "align-center" | "align-right" }[] = [
  { id: "left", label: "Izquierda", icon: "align-left" }, { id: "center", label: "Centro", icon: "align-center" }, { id: "right", label: "Derecha", icon: "align-right" },
];
// Role defaults (fonts, ranges, the "normal" mono line-height) live in
// effectEditorDefaults.ts — menu redesign Phase 1.

type TypographyPatch = Partial<ProfileCardData>;

interface SectionProps {
  card:      ProfileCardData;
  /** The already-resolved base color (cardBaseColor — isLight-derived
   * fallback applied), so every role's ColorRow shows the REAL color. */
  baseColor: string;
  onChange:  (patch: TypographyPatch) => void;
}

// Menu redesign Phase 2: the old TEXT tab is split by OBJECT. The handlers
// live in ONE place (useTypographyActions) and two section components render
// them: RoleTextSection (one role's color/font/size/gradient/... — mounted by
// that role's object: Nombre, @usuario, Frase, Ubicación, Bio, Visitas) and
// GlobalTextSection ("Todos los textos": the base color every role inherits,
// alignment, the shared secondary line-height and the card-wide text
// effects). Phase 3 swaps RoleTextSection for the specimen plate without
// touching the routing (ProfileConfigMenu.tsx's OBJECT_SECTIONS).

/** Every TEXT handler, shared by the section components below. */
export function useTypographyActions(card: ProfileCardData, baseColor: string, onChange: (patch: TypographyPatch) => void) {
  // Block 1: same variant-aware default ProfileCard.tsx renders with
  // (guns/poster -> 17, else 15) — the slider used to show a plain 15 for
  // every variant. Still only the stored field is ever written.
  const nameFontSize = card.nameFontSize ?? nameFontSizeDefault(card.variant);
  const typography = resolveCardTypography(card, nameFontSize);
  const colors = resolveCardColors(baseColor, {
    name: card.nameColor, handle: card.handleColor, descriptor: card.descriptorColor,
    location: card.locationColor, bio: card.bioColor, views: card.viewsColor,
  });

  // Block 1 (single owner): Location/Views text color used to have two
  // owners — the role color AND blockStyle.<block>.textColor, with the block
  // override winning at render (ProfileCard.tsx's LocationLine/ViewsLine).
  // The role color is now the only control: it SHOWS the effective color
  // (block override included, for data saved before this change) and every
  // edit/clear also drops the block override in the same patch.
  const locationBlockColor = card.blockStyle?.location?.textColor;
  const viewsBlockColor    = card.blockStyle?.views?.textColor;
  function withoutBlockTextColor(block: "location" | "views"): Pick<ProfileCardData, "blockStyle"> | undefined {
    const current = card.blockStyle?.[block];
    if (!current?.textColor) return undefined;
    // Drop the key (not textColor: undefined); an override left with no
    // defined fields is dropped too, otherwise "Personalizar este bloque"
    // would stay ON with nothing customized.
    const rest = mergePatch(current, { textColor: undefined });
    const hasAny = Object.values(rest).some(v => v !== undefined);
    return { blockStyle: mergePatch(card.blockStyle, { [block]: hasAny ? rest : undefined }) };
  }

  const effects = card.effects;
  const textFx = effects?.text;
  function patchTextFx(p: Partial<TextEffects>) {
    onChange({ effects: { ...effects, text: { ...textFx, ...p } } });
  }
  // "Apagar no borra" (Block 1): text shadow/glow/stroke switches pause the
  // config into effects.paused instead of deleting it. The rules live in
  // effectBinding.ts — menu redesign Phase 1.
  function toggleTextFx(path: "text.shadow" | "text.glow" | "text.stroke", on: boolean) {
    onChange({ effects: setEffectEnabled(effects, path, on) });
  }
  function patchShadow(p: Partial<TextShadowEffect>) {
    patchTextFx({ shadow: { ...textFx?.shadow, ...p } });
  }
  function patchGlow(p: Partial<TextGlowEffect>) {
    patchTextFx({ glow: { ...textFx?.glow, ...p } });
  }
  function patchStroke(p: Partial<TextStrokeEffect>) {
    patchTextFx({ stroke: { ...textFx?.stroke, ...p } });
  }

  // Stage FASE 3: gradient/shimmer are per-role (card.effects.textRoles).
  // One setter for every per-role effect field: `undefined` = toggled off
  // (pause), a value while the field is absent = toggled on (resume the
  // paused config, `v` being the control's default when nothing is
  // paused), a value while present = a regular edit.
  const textRoles = effects?.textRoles;
  function setRoleTextEffect<K extends keyof RoleTextEffect>(role: TextRole, key: K, v: RoleTextEffect[K] | undefined) {
    const path = `textRoles.${role}.${key}` as EffectPath;
    if (v === undefined) { onChange({ effects: pauseEffect(effects, path) }); return; }
    if (textRoles?.[role]?.[key] === undefined) { onChange({ effects: resumeEffect(effects, path, v) }); return; }
    onChange({ effects: { ...effects, textRoles: { ...textRoles, [role]: { ...textRoles?.[role], [key]: v } } } });
  }
  function makeGradientHandlers(role: TextRole) {
    const current = textRoles?.[role];
    return {
      gradient: current?.gradient,
      shimmer: current?.shimmer,
      onGradientChange: (v: RoleTextEffect["gradient"]) => setRoleTextEffect(role, "gradient", v),
      onShimmerChange: (v: RoleTextEffect["shimmer"]) => setRoleTextEffect(role, "shimmer", v),
    };
  }

  // 2026-10-14 (user decision): Sombra / Brillo (+ Pulso) / Contorno /
  // Desenfoque are per text. Every write starts from the SPLIT effects
  // (splitCardTextEffects): a legacy card-wide value is copied into the six
  // roles and dropped in that same write, so nothing changes on screen and
  // each text owns its effects from then on.
  const split = splitCardTextEffects(effects);
  function roleFx(role: TextRole) {
    const own = split?.textRoles?.[role];
    const write = (p: Partial<RoleTextEffect>) =>
      onChange({ effects: { ...split, textRoles: { ...split?.textRoles, [role]: { ...own, ...p } } } });
    return {
      shadow: own?.shadow, glow: own?.glow, stroke: own?.stroke, blur: own?.blur,
      glowPaused: split?.paused?.textRoles?.[role]?.glow !== undefined,
      toggle: (key: "shadow" | "glow" | "stroke", on: boolean) =>
        onChange({ effects: setEffectEnabled(split, `textRoles.${role}.${key}`, on) }),
      patchShadow: (p: Partial<TextShadowEffect>) => write({ shadow: { ...own?.shadow, ...p } }),
      patchGlow: (p: Partial<TextGlowEffect>) => write({ glow: { ...own?.glow, ...p } }),
      patchPulse: (p: Partial<GlowPulseAnimation>) =>
        write({ glow: { ...own?.glow, animation: { enabled: !!own?.glow?.animation?.enabled, ...own?.glow?.animation, ...p } } }),
      patchStroke: (p: Partial<TextStrokeEffect>) => write({ stroke: { ...own?.stroke, ...p } }),
      setBlur: (v: number) => write({ blur: v || undefined }),
    };
  }

  return {
    nameFontSize, typography, colors, locationBlockColor, viewsBlockColor, withoutBlockTextColor,
    textFx, patchTextFx, toggleTextFx, patchShadow, patchGlow, patchStroke,
    textRoles, setRoleTextEffect, makeGradientHandlers, roleFx,
  };
}

const px = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} px`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const times = (v: number) => `${v.toFixed(1).replace(".", ",")}x`;

/** One text's own Sombra, Brillo, Pulso, Contorno and Desenfoque tiles
 * (2026-10-14) — appended to that text's "Efectos del texto" tiles. An
 * array, not a component: EffectList lays out its direct children. */
function roleFxTiles(fx: ReturnType<ReturnType<typeof useTypographyActions>["roleFx"]>): { tiles: React.ReactElement[]; active: string[] } {
  const glowOn = isIntensityEffectVisible(fx.glow);
  const pulseOn = !!fx.glow?.animation?.enabled;
  const tiles = [
    <EffectRow key="shadow" id="shadow" label="Sombra" icon="moon" preview="t-shadow" on={!!fx.shadow} onToggle={v => fx.toggle("shadow", v)}
      state={fx.shadow ? px(fx.shadow.blur ?? TEXT_SHADOW_DEFAULTS.blur) : undefined}>
      {fx.shadow ? (
        <>
          <ColorRow label="Color" value={fx.shadow.color ?? TEXT_SHADOW_DEFAULTS.color} onChange={v => fx.patchShadow({ color: v })} />
          {/* Block 1: renderer default is 1 with an explicit color, 0.5
              without (textEffects.ts). */}
          <SliderRow label="Opacidad" icon="eye" min={0} max={1} step={0.01} value={textShadowOpacity(fx.shadow.color, fx.shadow.opacity)}
            fmt={pct} onChange={v => fx.patchShadow({ opacity: v })} />
          <SliderRow label="Blur" icon="blend" min={0} max={20} step={1} value={fx.shadow.blur ?? TEXT_SHADOW_DEFAULTS.blur} unit="px" fmt={px}
            onChange={v => fx.patchShadow({ blur: v })} />
          <OffsetRow x={fx.shadow.offsetX ?? TEXT_SHADOW_DEFAULTS.offsetX} y={fx.shadow.offsetY ?? TEXT_SHADOW_DEFAULTS.offsetY} min={-20} max={20}
            defaultX={TEXT_SHADOW_DEFAULTS.offsetX} defaultY={TEXT_SHADOW_DEFAULTS.offsetY}
            onChange={(nx, ny) => fx.patchShadow({ offsetX: nx, offsetY: ny })} />
        </>
      ) : null}
    </EffectRow>,
    // Iteration 0: "on" = visible (intensity > 0).
    <EffectRow key="glow" id="glow" label="Brillo" icon="sun" preview="t-glow" on={glowOn} onToggle={v => fx.toggle("glow", v)}
      paused={!glowOn && (fx.glowPaused || !!fx.glow)} state={glowOn ? pct(fx.glow?.intensity ?? 0) : undefined}>
      {fx.glow && glowOn ? (
        <>
          <ColorRow label="Color" value={fx.glow.color ?? TEXT_GLOW_DEFAULT_COLOR} onChange={v => fx.patchGlow({ color: v })} />
          <SliderRow label="Intensidad" icon="sun" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={fx.glow.intensity ?? 0}
            fmt={pct} onChange={v => fx.patchGlow({ intensity: v })} />
          <SliderRow label="Radio" icon="maximize" min={0} max={40} step={1} value={textGlowRadius(fx.glow.radius, fx.glow.intensity)} unit="px" fmt={px}
            onChange={v => fx.patchGlow({ radius: v })} />
        </>
      ) : null}
    </EffectRow>,
    // The glow breathes (glow.animation, like the card's and the photo's Pulso).
    <EffectRow key="pulse" id="pulse" label="Pulso" icon="sparkles" preview="c-pulse" on={pulseOn} onToggle={v => fx.patchPulse({ enabled: v })}
      state={pulseOn ? times(fx.glow?.animation?.speed ?? 1) : undefined}>
      {pulseOn && (
        <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={fx.glow?.animation?.speed ?? 1}
          onChange={v => fx.patchPulse({ speed: v })} fmt={times} />
      )}
      {pulseOn && !glowOn && <MenuNote tone="warn">Prendé Brillo para ver el pulso</MenuNote>}
    </EffectRow>,
    <EffectRow key="stroke" id="stroke" label="Contorno" icon="frame" preview="t-stroke" on={!!fx.stroke} onToggle={v => fx.toggle("stroke", v)}
      state={fx.stroke ? px(fx.stroke.width ?? 1) : undefined}>
      {fx.stroke ? (
        <>
          <ColorRow label="Color" value={fx.stroke.color ?? TEXT_STROKE_DEFAULT_COLOR} onChange={v => fx.patchStroke({ color: v })} />
          <SliderRow label="Grosor" icon="frame" min={0.5} max={4} step={0.5} value={fx.stroke.width ?? 1} unit="px" fmt={px}
            onChange={v => fx.patchStroke({ width: v })} />
        </>
      ) : null}
    </EffectRow>,
    // filter: blur() on the glyphs — 0 deletes the key (the slider is the
    // whole control, no switch).
    <EffectRow key="blur" id="blur" label="Desenfoque" icon="blend" preview="t-blur" active={!!fx.blur}
      state={fx.blur ? px(fx.blur) : "Sin desenfoque"}>
      <SliderRow label="Intensidad" icon="blend" min={0} max={8} step={0.5} value={fx.blur ?? 0} unit="px" fmt={px}
        onChange={v => fx.setBlur(v)} />
    </EffectRow>,
  ];
  const active = [!!fx.shadow && "Sombra", glowOn && "Brillo", pulseOn && glowOn && "Pulso", !!fx.stroke && "Contorno", !!fx.blur && "Desenfoque"]
    .filter((n): n is string => !!n);
  return { tiles, active };
}

/** One role's text style — mounted by that role's object. */
export function RoleTextSection({ card, baseColor, onChange, role }: SectionProps & { role: TextRole }) {
  const { nameFontSize, typography, colors, locationBlockColor, viewsBlockColor, withoutBlockTextColor, textRoles, setRoleTextEffect, makeGradientHandlers, roleFx } =
    useTypographyActions(card, baseColor, onChange);
  const { tiles: fxTiles, active: fxActive } = roleFxTiles(roleFx(role));
  // Liquid glass: the font tile samples the role's own text; the role's own
  // Sombra / Brillo / Pulso / Contorno / Desenfoque follow its fill effects.
  const SAMPLE: Record<TextRole, string | undefined> = {
    name: card.name, handle: card.handle ? `@${card.handle}` : undefined, descriptor: card.status,
    location: card.location, bio: card.bio, views: "1.284",
  };
  const extra = { sample: (SAMPLE[role] ?? "").trim().slice(0, 2) || "Aa", fxTiles, fxActive };
  switch (role) {
    case "name": {
      // Product closeout: letter-by-letter bounce — Name only.
      const nameRole = textRoles?.name;
      // Block 1 (truthful labels): "Fuente general" was removed — card.font
      // only ever reached the Name. This control shows `nameFont ?? font`
      // (so a legacy card.font still displays) and writes nameFont.
      return (
        <RoleTypographyFields
          label="Nombre"
          fontModified={card.nameFont !== undefined} onFontReset={() => onChange({ nameFont: undefined })}
          sizeModified={card.nameFontSize !== undefined} onSizeReset={() => onChange({ nameFontSize: undefined })}
          weightModified={card.nameFontWeight !== undefined} onWeightReset={() => onChange({ nameFontWeight: undefined })}
          letterSpacingModified={card.nameLetterSpacing !== undefined} onLetterSpacingReset={() => onChange({ nameLetterSpacing: undefined })}
          lineHeightModified={card.nameLineHeight !== undefined} onLineHeightReset={() => onChange({ nameLineHeight: undefined })}
          color={colors.name} hasColorOverride={!!card.nameColor}
          onColorChange={v => onChange({ nameColor: v })} onColorClear={() => onChange({ nameColor: undefined })}
          font={card.nameFont ?? card.font ?? NAME_FONT_DEFAULT} onFontChange={v => onChange({ nameFont: v })}
          fontSize={nameFontSize} fontSizeMin={R.name.fontSize[0]} fontSizeMax={R.name.fontSize[1]} onFontSizeChange={v => onChange({ nameFontSize: v })}
          weight={typography.name.fontWeight} onWeightChange={v => onChange({ nameFontWeight: v })}
          letterSpacing={typography.name.letterSpacing} onLetterSpacingChange={v => onChange({ nameLetterSpacing: v })}
          lineHeight={typography.name.lineHeight} lineHeightMin={R.name.lineHeight![0]} lineHeightMax={R.name.lineHeight![1]} onLineHeightChange={v => onChange({ nameLineHeight: v })}
          {...makeGradientHandlers("name")} {...extra}
          letterAnimation={nameRole?.letterAnimation}
          onLetterAnimationChange={v => setRoleTextEffect("name", "letterAnimation", v)}
        />
      );
    }
    case "handle":
      return (
        <RoleTypographyFields
          label="@usuario"
          fontModified={card.handleFont !== undefined} onFontReset={() => onChange({ handleFont: undefined })}
          sizeModified={card.handleFontSize !== undefined} onSizeReset={() => onChange({ handleFontSize: undefined })}
          weightModified={card.handleFontWeight !== undefined} onWeightReset={() => onChange({ handleFontWeight: undefined })}
          letterSpacingModified={card.handleLetterSpacing !== undefined} onLetterSpacingReset={() => onChange({ handleLetterSpacing: undefined })}
          color={colors.handle} hasColorOverride={!!card.handleColor}
          onColorChange={v => onChange({ handleColor: v })} onColorClear={() => onChange({ handleColor: undefined })}
          font={card.handleFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ handleFont: v })}
          fontSize={typography.handle.fontSize} fontSizeMin={R.handle.fontSize[0]} fontSizeMax={R.handle.fontSize[1]} onFontSizeChange={v => onChange({ handleFontSize: v })}
          weight={typography.handle.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ handleFontWeight: v })}
          letterSpacing={typography.handle.letterSpacing} onLetterSpacingChange={v => onChange({ handleLetterSpacing: v })}
          {...makeGradientHandlers("handle")} {...extra}
        />
      );
    case "descriptor":
      return (
        <RoleTypographyFields
          label="Frase"
          fontModified={card.statusFont !== undefined} onFontReset={() => onChange({ statusFont: undefined })}
          sizeModified={card.statusFontSize !== undefined} onSizeReset={() => onChange({ statusFontSize: undefined })}
          weightModified={card.descriptorFontWeight !== undefined} onWeightReset={() => onChange({ descriptorFontWeight: undefined })}
          letterSpacingModified={card.descriptorLetterSpacing !== undefined} onLetterSpacingReset={() => onChange({ descriptorLetterSpacing: undefined })}
          color={colors.descriptor} hasColorOverride={!!card.descriptorColor}
          onColorChange={v => onChange({ descriptorColor: v })} onColorClear={() => onChange({ descriptorColor: undefined })}
          font={card.statusFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ statusFont: v })}
          fontSize={typography.descriptor.fontSize} fontSizeMin={R.descriptor.fontSize[0]} fontSizeMax={R.descriptor.fontSize[1]} onFontSizeChange={v => onChange({ statusFontSize: v })}
          weight={typography.descriptor.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ descriptorFontWeight: v })}
          letterSpacing={typography.descriptor.letterSpacing} onLetterSpacingChange={v => onChange({ descriptorLetterSpacing: v })}
          {...makeGradientHandlers("descriptor")} {...extra}
        />
      );
    case "location":
      return (
        <RoleTypographyFields
          label="Ubicación"
          fontModified={card.locationFont !== undefined} onFontReset={() => onChange({ locationFont: undefined })}
          sizeModified={card.locationFontSize !== undefined} onSizeReset={() => onChange({ locationFontSize: undefined })}
          weightModified={card.locationFontWeight !== undefined} onWeightReset={() => onChange({ locationFontWeight: undefined })}
          letterSpacingModified={card.locationLetterSpacing !== undefined} onLetterSpacingReset={() => onChange({ locationLetterSpacing: undefined })}
          color={locationBlockColor ?? colors.location} hasColorOverride={!!card.locationColor || !!locationBlockColor}
          onColorChange={v => onChange({ locationColor: v, ...withoutBlockTextColor("location") })}
          onColorClear={() => onChange({ locationColor: undefined, ...withoutBlockTextColor("location") })}
          font={card.locationFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ locationFont: v })}
          fontSize={typography.location.fontSize} fontSizeMin={R.location.fontSize[0]} fontSizeMax={R.location.fontSize[1]} onFontSizeChange={v => onChange({ locationFontSize: v })}
          weight={typography.location.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ locationFontWeight: v })}
          letterSpacing={typography.location.letterSpacing} onLetterSpacingChange={v => onChange({ locationLetterSpacing: v })}
          {...makeGradientHandlers("location")} {...extra}
        />
      );
    case "bio":
      return (
        <RoleTypographyFields
          label="Bio"
          fontModified={card.bioFont !== undefined} onFontReset={() => onChange({ bioFont: undefined })}
          sizeModified={card.bioFontSize !== undefined} onSizeReset={() => onChange({ bioFontSize: undefined })}
          weightModified={card.bioFontWeight !== undefined} onWeightReset={() => onChange({ bioFontWeight: undefined })}
          lineHeightModified={card.bioLineHeight !== undefined} onLineHeightReset={() => onChange({ bioLineHeight: undefined })}
          color={colors.bio} hasColorOverride={!!card.bioColor}
          onColorChange={v => onChange({ bioColor: v })} onColorClear={() => onChange({ bioColor: undefined })}
          font={card.bioFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ bioFont: v })}
          fontSize={typography.bio.fontSize} fontSizeMin={R.bio.fontSize[0]} fontSizeMax={R.bio.fontSize[1]} onFontSizeChange={v => onChange({ bioFontSize: v })}
          weight={typography.bio.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ bioFontWeight: v })}
          lineHeight={typography.bio.lineHeight} lineHeightMin={R.bio.lineHeight![0]} lineHeightMax={R.bio.lineHeight![1]} onLineHeightChange={v => onChange({ bioLineHeight: v })}
          // No letterSpacing props: bio never had that concept (see
          // cardTypography.ts) — omitting them hides the row entirely.
          {...makeGradientHandlers("bio")} {...extra}
        />
      );
    case "views":
      return (
        <RoleTypographyFields
          label="Visitas"
          fontModified={card.viewsFont !== undefined} onFontReset={() => onChange({ viewsFont: undefined })}
          sizeModified={card.viewsFontSize !== undefined} onSizeReset={() => onChange({ viewsFontSize: undefined })}
          weightModified={card.viewsFontWeight !== undefined} onWeightReset={() => onChange({ viewsFontWeight: undefined })}
          letterSpacingModified={card.viewsLetterSpacing !== undefined} onLetterSpacingReset={() => onChange({ viewsLetterSpacing: undefined })}
          color={viewsBlockColor ?? colors.views} hasColorOverride={!!card.viewsColor || !!viewsBlockColor}
          onColorChange={v => onChange({ viewsColor: v, ...withoutBlockTextColor("views") })}
          onColorClear={() => onChange({ viewsColor: undefined, ...withoutBlockTextColor("views") })}
          font={card.viewsFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ viewsFont: v })}
          fontSize={typography.views.fontSize} fontSizeMin={R.views.fontSize[0]} fontSizeMax={R.views.fontSize[1]} onFontSizeChange={v => onChange({ viewsFontSize: v })}
          weight={typography.views.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ viewsFontWeight: v })}
          letterSpacing={typography.views.letterSpacing} onLetterSpacingChange={v => onChange({ viewsLetterSpacing: v })}
          {...makeGradientHandlers("views")} {...extra}
        />
      );
  }
}

/** "Todos los textos": what applies to every text role at once — the base
 * color, alignment and the shared secondary line-height. Effects are each
 * text's own (2026-10-14, user decision): no effects here. */
export function GlobalTextSection({ card, baseColor, onChange }: SectionProps) {
  const hintId = useId();
  const align = card.textAlign ?? "left";
  // Liquid glass (design menu-schema.js "allText"): Color de todos los
  // textos · Alineación y espaciado.
  return (
    <>
      {/* Phase 2: the base color every role color derives from (card.textColor).
          Shows the EFFECTIVE value (cardBaseColor: the background-derived
          default when unset); reset deletes the key. */}
      <MenuSection label="Color de todos los textos" icon="palette" changed={card.textColor ? 1 : 0} onReset={() => onChange({ textColor: undefined })}
        summary={card.textColor ? wellHex(baseColor) : "Automático"} swatch={baseColor}>
        <ColorRow
          label="Color" value={baseColor}
          onChange={v => onChange({ textColor: v })}
          state={inheritableColorState(card.textColor)} inheritedLabel="Automático"
          onReset={() => onChange({ textColor: undefined })} hintId={hintId}
        />
        <MenuNote id={hintId} icon="link">También tiñe íconos de Links y el borde de la foto</MenuNote>
      </MenuSection>

      <MenuSection label="Alineación y espaciado" icon="align-center" changed={[card.textAlign, card.monoLineHeight].filter(v => v != null).length}
        onReset={() => onChange({ textAlign: undefined, monoLineHeight: undefined })}
        summary={`${ALIGN_TABS.find(t => t.id === align)?.label ?? ""} · ${card.monoLineHeight == null ? "normal" : card.monoLineHeight.toFixed(2).replace(".", ",")}`}>
        <MenuRow label="Alineación" state={card.textAlign ? "modified" : undefined} onReset={() => onChange({ textAlign: undefined })}>
          <div style={{ width: 196 }}>
            <Tabs tabs={ALIGN_TABS} active={align} onChange={v => onChange({ textAlign: v as TextAlign })} />
          </div>
        </MenuRow>
        {/* Block 1 (truthful labels): monoLineHeight is ONE field shared by
            @usuario/Frase/Ubicación/Visitas. Absent = no CSS line-height at
            all (browser "normal"), which the value says instead of a
            made-up number; reset goes back to "normal". */}
        <SliderRow label="Interlineado secundario" icon="height" min={R.monoLineHeight[0]} max={R.monoLineHeight[1]} step={0.05}
          value={card.monoLineHeight ?? MONO_LINE_HEIGHT_NORMAL}
          fmt={v => card.monoLineHeight == null ? "normal" : v.toFixed(2).replace(".", ",")}
          onChange={v => onChange({ monoLineHeight: v })}
          state={card.monoLineHeight != null ? "modified" : undefined} onReset={() => onChange({ monoLineHeight: undefined })} />
        <MenuNote>@usuario, Frase, Ubicación y Visitas</MenuNote>
      </MenuSection>

    </>
  );
}
