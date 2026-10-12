"use client";
import { useId } from "react";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { setEffectEnabled } from "@/lib/effectBinding";
import type { ProfileCardData, TextShadowEffect, TextGlowEffect, TextStrokeEffect, TextEffects, TextRole, RoleTextEffect } from "@/types";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveCardColors, inheritableColorState } from "@/lib/cardColors";
import { pauseEffect, resumeEffect, mergePatch, type EffectPath } from "@/lib/effectPause";
import {
  nameFontSizeDefault, TEXT_SHADOW_DEFAULTS, textShadowOpacity, TEXT_GLOW_DEFAULT_COLOR, textGlowRadius, TEXT_STROKE_DEFAULT_COLOR,
  NAME_FONT_DEFAULT, MONO_ROLE_FONT_DEFAULT, MONO_LINE_HEIGHT_NORMAL, ROLE_TYPOGRAPHY_RANGES as R, ROLE_WEIGHT_FALLBACK,
} from "@/lib/effectEditorDefaults";
import { T, SliderRow, ColorRow, MenuSection, MenuRow, MenuNote, Tabs, OffsetRow, EffectList, EffectRow } from "@/ui";
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

  return {
    nameFontSize, typography, colors, locationBlockColor, viewsBlockColor, withoutBlockTextColor,
    textFx, patchTextFx, toggleTextFx, patchShadow, patchGlow, patchStroke,
    textRoles, setRoleTextEffect, makeGradientHandlers,
  };
}

/** One role's text style — mounted by that role's object. */
export function RoleTextSection({ card, baseColor, onChange, role }: SectionProps & { role: TextRole }) {
  const { nameFontSize, typography, colors, locationBlockColor, viewsBlockColor, withoutBlockTextColor, textRoles, setRoleTextEffect, makeGradientHandlers } =
    useTypographyActions(card, baseColor, onChange);
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
          {...makeGradientHandlers("name")}
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
          {...makeGradientHandlers("handle")}
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
          {...makeGradientHandlers("descriptor")}
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
          {...makeGradientHandlers("location")}
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
          {...makeGradientHandlers("bio")}
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
          {...makeGradientHandlers("views")}
        />
      );
  }
}

/** "Todos los textos": what applies to every text role at once.
 * Editor v3 Phase F: numbered sections — 01 Color, 02 Alineación (icons,
 * design screen 02) and the shared secondary line-height, 03 Efectos del
 * texto as effect rows (Sombra, Brillo, Contorno, Desenfoque). */
export function GlobalTextSection({ card, baseColor, onChange }: SectionProps) {
  const hintId = useId();
  const { textFx, patchTextFx, toggleTextFx, patchShadow, patchGlow, patchStroke } = useTypographyActions(card, baseColor, onChange);
  const glowOn = isIntensityEffectVisible(textFx?.glow);
  const fxOn = [!!textFx?.shadow, glowOn, !!textFx?.stroke, !!textFx?.blur].filter(Boolean).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[6] }}>
      {/* Phase 2: the base color every role color derives from (card.textColor
          — its control was lost in FASE 2, 41f7ea3). Shows the EFFECTIVE value
          (cardBaseColor: the background-derived default when unset); reset
          deletes the key. Role color rows without an override show they
          inherit from here (RoleTypographyFields). */}
      <MenuSection label="Color" num="01" tone={1} changed={card.textColor ? 1 : 0} first>
        <ColorRow
          label="Color de todos los textos" value={baseColor}
          onChange={v => onChange({ textColor: v })}
          state={inheritableColorState(card.textColor)} inheritedLabel="Automático"
          onReset={() => onChange({ textColor: undefined })} hintId={hintId}
        />
        <MenuNote id={hintId}>También tiñe los íconos de Links y el borde de la foto cuando no tienen color propio.</MenuNote>
      </MenuSection>

      <MenuSection label="Alineación y espaciado" num="02" tone={2} changed={[card.textAlign, card.monoLineHeight].filter(v => v != null).length} first>
        <MenuRow label="Alineación" state={card.textAlign ? "modified" : undefined} onReset={() => onChange({ textAlign: undefined })}>
          <div style={{ width: 128 }}>
            <Tabs tabs={ALIGN_TABS} active={card.textAlign ?? "left"} onChange={v => onChange({ textAlign: v as TextAlign })} />
          </div>
        </MenuRow>
        {/* Block 1 (truthful labels): monoLineHeight is ONE field shared by
            @usuario/Frase/Ubicación/Visitas. Absent = no CSS line-height at
            all (browser "normal"), which the value says instead of a
            made-up number; reset goes back to "normal". */}
        <SliderRow label="Interlineado de @usuario, Frase, Ubicación y Visitas" min={R.monoLineHeight[0]} max={R.monoLineHeight[1]} step={0.05}
          value={card.monoLineHeight ?? MONO_LINE_HEIGHT_NORMAL}
          fmt={v => card.monoLineHeight == null ? "normal" : v.toFixed(2)}
          onChange={v => onChange({ monoLineHeight: v })}
          state={card.monoLineHeight != null ? "modified" : undefined} onReset={() => onChange({ monoLineHeight: undefined })} />
      </MenuSection>

      {/* Card-wide (card.effects.text — shadow/glow/stroke/blur), unlike each
          role's own Gradiente/Shimmer/Animación. */}
      <MenuSection label="Efectos del texto" num="03" tone={4} active={fxOn} first>
        <EffectList label="Efectos de todos los textos">
          <EffectRow id="shadow" label="Sombra" tone={1} on={!!textFx?.shadow} onToggle={v => toggleTextFx("text.shadow", v)}>
            {textFx?.shadow ? (
              <>
                <ColorRow label="Color" value={textFx.shadow.color ?? TEXT_SHADOW_DEFAULTS.color} onChange={v => patchShadow({ color: v })} />
                {/* Block 1: renderer default is 1 with an explicit color, 0.5
                    without (textEffects.ts). */}
                <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={textShadowOpacity(textFx.shadow.color, textFx.shadow.opacity)}
                  fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchShadow({ opacity: v })} />
                <SliderRow label="Blur" min={0} max={20} step={1} value={textFx.shadow.blur ?? TEXT_SHADOW_DEFAULTS.blur} unit="px"
                  onChange={v => patchShadow({ blur: v })} />
                <OffsetRow x={textFx.shadow.offsetX ?? TEXT_SHADOW_DEFAULTS.offsetX} y={textFx.shadow.offsetY ?? TEXT_SHADOW_DEFAULTS.offsetY} min={-20} max={20}
                  onChange={(x, y) => patchShadow({ offsetX: x, offsetY: y })} />
              </>
            ) : <MenuNote>Una sombra detrás de cada texto de la tarjeta.</MenuNote>}
          </EffectRow>
          {/* Iteration 0: "on" = visible (intensity > 0). */}
          <EffectRow id="glow" label="Brillo" tone={2} on={glowOn} onToggle={v => toggleTextFx("text.glow", v)}
            state={glowOn ? `${Math.round((textFx?.glow?.intensity ?? 0) * 100)}%` : undefined}>
            {textFx?.glow && glowOn ? (
              <>
                <ColorRow label="Color" value={textFx.glow.color ?? TEXT_GLOW_DEFAULT_COLOR} onChange={v => patchGlow({ color: v })} />
                <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={textFx.glow.intensity ?? 0}
                  fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchGlow({ intensity: v })} />
                <SliderRow label="Radio" min={0} max={40} step={1} value={textGlowRadius(textFx.glow.radius, textFx.glow.intensity)} unit="px"
                  onChange={v => patchGlow({ radius: v })} />
              </>
            ) : <MenuNote>Un halo de luz alrededor de los textos.</MenuNote>}
          </EffectRow>
          <EffectRow id="stroke" label="Contorno" tone={3} on={!!textFx?.stroke} onToggle={v => toggleTextFx("text.stroke", v)}
            state={textFx?.stroke ? `${textFx.stroke.width ?? 1} px` : undefined}>
            {textFx?.stroke ? (
              <>
                <ColorRow label="Color" value={textFx.stroke.color ?? TEXT_STROKE_DEFAULT_COLOR} onChange={v => patchStroke({ color: v })} />
                <SliderRow label="Grosor" min={0.5} max={4} step={0.5} value={textFx.stroke.width ?? 1} unit="px"
                  onChange={v => patchStroke({ width: v })} />
              </>
            ) : <MenuNote>Un trazo alrededor de cada letra.</MenuNote>}
          </EffectRow>
          {/* filter: blur() on the glyphs themselves — distinct from Sombra's
              own blur. Card-wide; 0 deletes the key (no switch: the slider
              is the whole control). */}
          <EffectRow id="blur" label="Desenfoque" tone={4} active={!!textFx?.blur}
            state={textFx?.blur ? `${textFx.blur} px` : undefined}>
            <SliderRow label="Intensidad" min={0} max={8} step={0.5} value={textFx?.blur ?? 0} unit="px"
              onChange={v => patchTextFx({ blur: v || undefined })} />
          </EffectRow>
        </EffectList>
      </MenuSection>
    </div>
  );
}
