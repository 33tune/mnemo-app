"use client";
import { EFFECT_INTENSITY_MIN } from "@/lib/uiNumeric";
import { isIntensityEffectVisible } from "@/lib/effectEditorDefaults";
import { setEffectEnabled } from "@/lib/effectBinding";
import type { ProfileCardData, TextShadowEffect, TextGlowEffect, TextStrokeEffect, TextEffects, TextRole, RoleTextEffect } from "@/types";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveCardColors } from "@/lib/cardColors";
import { pauseEffect, resumeEffect, mergePatch, type EffectPath } from "@/lib/effectPause";
import {
  nameFontSizeDefault, TEXT_SHADOW_DEFAULTS, textShadowOpacity, TEXT_GLOW_DEFAULT_COLOR, textGlowRadius, TEXT_STROKE_DEFAULT_COLOR,
  NAME_FONT_DEFAULT, MONO_ROLE_FONT_DEFAULT, MONO_LINE_HEIGHT_NORMAL, ROLE_TYPOGRAPHY_RANGES as R, ROLE_WEIGHT_FALLBACK,
} from "@/lib/effectEditorDefaults";
import { T, SliderRow, ColorSwatch, MenuSection, MenuRow, Tabs, Collapsible, Divider, Toggle, OffsetRow, ActionButton } from "@/ui";
import RoleTypographyFields from "./RoleTypographyFields";

type TextAlign = NonNullable<ProfileCardData["textAlign"]>;
const ALIGN_TABS: { id: TextAlign; label: string }[] = [
  { id: "left", label: "Izq" }, { id: "center", label: "Centro" }, { id: "right", label: "Der" },
];
// Role defaults (fonts, ranges, the "normal" mono line-height) live in
// effectEditorDefaults.ts — menu redesign Phase 1.

type TypographyPatch = Partial<ProfileCardData>;

interface Props {
  card:      ProfileCardData;
  /** The already-resolved base color (isLight-derived fallback applied) —
   * ProfileCard.tsx computes this once for render; passed in so every role's
   * ColorRow shows the REAL current color, not a placeholder. */
  baseColor: string;
  onChange:  (patch: TypographyPatch) => void;
}

// Stage FASE 2 (Personalization UI/UX): the TEXT tab. Six RoleTypographyFields
// (one per role) expose every FASE 1 resolver field with progressive
// disclosure (Color/Font/Size visible, Weight/Letter-spacing/Line-height
// behind "Avanzado") — see that component's header. Text effects
// (shadow/glow/stroke, FASE 1's textEffects.ts) live in their own
// Collapsible at the bottom — infrastructure that had zero UI before this.
// Cómo se ve el contenido de la Card (DATOS controla qué dice, no cómo se ve).
export default function ProfileTypographyMenu({ card, baseColor, onChange }: Props) {
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
  // owners — this tab's role color AND blockStyle.<block>.textColor (the
  // block "Estilo" in CONTENIDO), with the block override winning at render
  // (ProfileCard.tsx's LocationLine/ViewsLine). The role color here is now
  // the only control: it SHOWS the effective color (block override included,
  // for data saved before this change) and every edit/clear also drops the
  // block override in the same patch, so the edit is what actually renders.
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
  // config into effects.paused instead of deleting it. The rules (glow
  // revives an intensity of 0 and gets the O3 neutral color when new) live
  // in effectBinding.ts — menu redesign Phase 1.
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

  // Stage FASE 3: gradient/shimmer are per-role (card.effects.textRoles) —
  // see RoleTextEffect's header for why these two are split from the
  // card-wide `text` above. Block 1: gradient and shimmer are independent
  // (shimmer works on a flat color too since "Product closeout" — see
  // textEffects.ts), so turning gradient off no longer clears shimmer.
  const textRoles = effects?.textRoles;
  // One setter for every per-role effect field: `undefined` = toggled off
  // (pause), a value while the field is absent = toggled on (resume the
  // paused config, `v` being the control's default when nothing is
  // paused), a value while present = a regular edit.
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
  // Product closeout: letter-by-letter bounce — Name only (see
  // RoleTypographyFields.tsx, rendered only when these handlers are passed).
  const nameRole = textRoles?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
      {/* Block 1 (truthful labels): "Fuente general" was removed — despite
          its name, card.font only ever reached the Name (ProfileCard.tsx:
          `nameFont ?? font`; every other role has its own font field). The
          Name role's own font control below is now the single owner: it
          shows `nameFont ?? font` (so a legacy card.font still displays
          correctly) and writes nameFont. */}
      <MenuSection label="Alineación" first>
        <Tabs tabs={ALIGN_TABS} active={card.textAlign ?? "left"} onChange={v => onChange({ textAlign: v as TextAlign })} label="Alineación" />
      </MenuSection>

      {/* Block 1 (truthful labels): monoLineHeight is ONE field shared by
          Handle/Descriptor/Ubicación/Views — it used to appear as four
          per-role sliders that silently moved each other. Shown once here,
          card-wide. Absent = no CSS line-height at all (browser "normal"),
          which the label says instead of a made-up number. */}
      <MenuSection label="Interlineado de textos secundarios">
        <SliderRow label="Handle, Descriptor, Ubicación, Views" min={R.monoLineHeight[0]} max={R.monoLineHeight[1]} step={0.05}
          value={card.monoLineHeight ?? MONO_LINE_HEIGHT_NORMAL}
          fmt={v => card.monoLineHeight == null ? "normal" : v.toFixed(2)}
          onChange={v => onChange({ monoLineHeight: v })} />
        {card.monoLineHeight != null && (
          <ActionButton variant="ghost" onClick={() => onChange({ monoLineHeight: undefined })}>volver a normal</ActionButton>
        )}
      </MenuSection>

      {/* UX audit finding: this Collapsible operates on ALL text roles at
          once (card.effects.text — shadow/glow/stroke/blur), unlike every
          "Gradiente"/"Animación" section below it, which are per-role. It's
          moved here (next to the other two card-wide controls) and renamed
          to make that scope explicit, instead of sitting last after 6
          same-looking per-role Collapsibles where nothing signals the
          difference. */}
      <Collapsible label="Efectos globales de texto">
        <MenuSection label="Sombra" first>
          <MenuRow label="Activar">
            <Toggle value={!!textFx?.shadow} onChange={v => toggleTextFx("text.shadow", v)} />
          </MenuRow>
          {textFx?.shadow && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.shadow.color ?? TEXT_SHADOW_DEFAULTS.color} onChange={v => patchShadow({ color: v })} />
              </MenuRow>
              {/* Block 1: renderer default is 1 with an explicit color, 0.5
                  without (textEffects.ts) — the slider used to say 0.5 always. */}
              <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={textShadowOpacity(textFx.shadow.color, textFx.shadow.opacity)}
                fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchShadow({ opacity: v })} />
              <SliderRow label="Blur" min={0} max={20} step={1} value={textFx.shadow.blur ?? TEXT_SHADOW_DEFAULTS.blur} unit="px"
                onChange={v => patchShadow({ blur: v })} />
              <OffsetRow x={textFx.shadow.offsetX ?? TEXT_SHADOW_DEFAULTS.offsetX} y={textFx.shadow.offsetY ?? TEXT_SHADOW_DEFAULTS.offsetY} min={-20} max={20}
                onChange={(x, y) => patchShadow({ offsetX: x, offsetY: y })} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Glow">
          <MenuRow label="Activar">
            {/* Iteration 0: "on" = visible (intensity > 0, what textEffects
                renders), not mere presence. */}
            <Toggle value={isIntensityEffectVisible(textFx?.glow)} onChange={v => toggleTextFx("text.glow", v)} />
          </MenuRow>
          {textFx?.glow && isIntensityEffectVisible(textFx.glow) && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.glow.color ?? TEXT_GLOW_DEFAULT_COLOR} onChange={v => patchGlow({ color: v })} />
              </MenuRow>
              {/* Block 1: absent intensity renders as 0 (no glow) — shown as 0,
                  not the old 0.5 placeholder. Radius default is
                  round(intensity * 16) at render, not a fixed 16. */}
              <SliderRow label="Intensidad" min={EFFECT_INTENSITY_MIN} max={1} step={0.01} value={textFx.glow.intensity ?? 0}
                fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchGlow({ intensity: v })} />
              <SliderRow label="Radio" min={0} max={40} step={1} value={textGlowRadius(textFx.glow.radius, textFx.glow.intensity)} unit="px"
                onChange={v => patchGlow({ radius: v })} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Stroke / contorno">
          <MenuRow label="Activar">
            <Toggle value={!!textFx?.stroke} onChange={v => toggleTextFx("text.stroke", v)} />
          </MenuRow>
          {textFx?.stroke && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.stroke.color ?? TEXT_STROKE_DEFAULT_COLOR} onChange={v => patchStroke({ color: v })} />
              </MenuRow>
              <SliderRow label="Grosor" min={0.5} max={4} step={0.5} value={textFx.stroke.width ?? 1} unit="px"
                onChange={v => patchStroke({ width: v })} />
            </>
          )}
        </MenuSection>

        <Divider />

        {/* filter: blur() on the glyphs themselves — distinct from Sombra's
            own blur above (that only blurs the shadow layer). Card-wide
            like Sombra/Glow/Stroke above, not per-role. */}
        <MenuSection label="Blur">
          <SliderRow label="Intensidad" min={0} max={8} step={0.5} value={textFx?.blur ?? 0} unit="px"
            onChange={v => patchTextFx({ blur: v || undefined })} />
        </MenuSection>
      </Collapsible>

      <RoleTypographyFields
        label="Nombre"
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

      <RoleTypographyFields
        label="Handle"
        color={colors.handle} hasColorOverride={!!card.handleColor}
        onColorChange={v => onChange({ handleColor: v })} onColorClear={() => onChange({ handleColor: undefined })}
        font={card.handleFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ handleFont: v })}
        fontSize={typography.handle.fontSize} fontSizeMin={R.handle.fontSize[0]} fontSizeMax={R.handle.fontSize[1]} onFontSizeChange={v => onChange({ handleFontSize: v })}
        weight={typography.handle.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ handleFontWeight: v })}
        letterSpacing={typography.handle.letterSpacing} onLetterSpacingChange={v => onChange({ handleLetterSpacing: v })}
        {...makeGradientHandlers("handle")}
      />

      <RoleTypographyFields
        label="Descriptor"
        color={colors.descriptor} hasColorOverride={!!card.descriptorColor}
        onColorChange={v => onChange({ descriptorColor: v })} onColorClear={() => onChange({ descriptorColor: undefined })}
        font={card.statusFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ statusFont: v })}
        fontSize={typography.descriptor.fontSize} fontSizeMin={R.descriptor.fontSize[0]} fontSizeMax={R.descriptor.fontSize[1]} onFontSizeChange={v => onChange({ statusFontSize: v })}
        weight={typography.descriptor.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ descriptorFontWeight: v })}
        letterSpacing={typography.descriptor.letterSpacing} onLetterSpacingChange={v => onChange({ descriptorLetterSpacing: v })}
        {...makeGradientHandlers("descriptor")}
      />

      <RoleTypographyFields
        label="Ubicación"
        color={locationBlockColor ?? colors.location} hasColorOverride={!!card.locationColor || !!locationBlockColor}
        onColorChange={v => onChange({ locationColor: v, ...withoutBlockTextColor("location") })}
        onColorClear={() => onChange({ locationColor: undefined, ...withoutBlockTextColor("location") })}
        font={card.locationFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ locationFont: v })}
        fontSize={typography.location.fontSize} fontSizeMin={R.location.fontSize[0]} fontSizeMax={R.location.fontSize[1]} onFontSizeChange={v => onChange({ locationFontSize: v })}
        weight={typography.location.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ locationFontWeight: v })}
        letterSpacing={typography.location.letterSpacing} onLetterSpacingChange={v => onChange({ locationLetterSpacing: v })}
        {...makeGradientHandlers("location")}
      />

      <RoleTypographyFields
        label="Bio"
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

      <RoleTypographyFields
        label="Views"
        color={viewsBlockColor ?? colors.views} hasColorOverride={!!card.viewsColor || !!viewsBlockColor}
        onColorChange={v => onChange({ viewsColor: v, ...withoutBlockTextColor("views") })}
        onColorClear={() => onChange({ viewsColor: undefined, ...withoutBlockTextColor("views") })}
        font={card.viewsFont ?? MONO_ROLE_FONT_DEFAULT} onFontChange={v => onChange({ viewsFont: v })}
        fontSize={typography.views.fontSize} fontSizeMin={R.views.fontSize[0]} fontSizeMax={R.views.fontSize[1]} onFontSizeChange={v => onChange({ viewsFontSize: v })}
        weight={typography.views.fontWeight ?? ROLE_WEIGHT_FALLBACK} onWeightChange={v => onChange({ viewsFontWeight: v })}
        letterSpacing={typography.views.letterSpacing} onLetterSpacingChange={v => onChange({ viewsLetterSpacing: v })}
        {...makeGradientHandlers("views")}
      />

      {/* Contact Links' icon color lives in ProfileContactLinksMenu (next to
          its own content, via BlockStyleFields) — not duplicated here, see
          CLAUDE.md's FASE 2 checkpoint for the reasoning. */}
    </div>
  );
}
