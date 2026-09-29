"use client";
import type { ProfileCardData, TextFont, TextShadowEffect, TextGlowEffect, TextStrokeEffect, TextEffects, TextRole, RoleTextEffect } from "@/types";
import { CANVAS_FONTS } from "@/lib/fontList";
import { resolveCardTypography } from "@/lib/cardTypography";
import { resolveCardColors } from "@/lib/cardColors";
import { T, SliderRow, ColorSwatch, MenuSection, MenuRow, Tabs, FontSelect, Collapsible, Divider, Toggle, OffsetRow } from "@/ui";
import RoleTypographyFields from "./RoleTypographyFields";

type TextAlign = NonNullable<ProfileCardData["textAlign"]>;
const ALIGN_TABS: { id: TextAlign; label: string }[] = [
  { id: "left", label: "Izq" }, { id: "center", label: "Centro" }, { id: "right", label: "Der" },
];
const MONO_DEFAULT_FONT: TextFont = "Space Mono";

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
  // ProfileCard.tsx's render nudges nameFontSize per variant (guns/poster ->
  // 17) before resolving typography — this menu doesn't know the variant
  // nudge, so it reads the stored value with the same plain default
  // (`card.nameFontSize ?? 15`) resolveCardTypography itself would use if
  // called with no override; the slider simply won't show a nudged value
  // for those two variants until the user actually sets one explicitly, which
  // then applies everywhere identically. Not a correctness issue — the
  // stored field, not a derived one, is what this menu edits.
  const nameFontSize = card.nameFontSize ?? 15;
  const typography = resolveCardTypography(card, nameFontSize);
  const colors = resolveCardColors(baseColor, {
    name: card.nameColor, handle: card.handleColor, descriptor: card.descriptorColor,
    location: card.locationColor, bio: card.bioColor, views: card.viewsColor,
  });

  const textFx = card.effects?.text;
  function patchTextFx(p: Partial<TextEffects>) {
    onChange({ effects: { ...card.effects, text: { ...textFx, ...p } } });
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
  // card-wide `text` above. Turning gradient off also clears shimmer in
  // the SAME patch (shimmer is inert without a gradient to sweep across —
  // leaving it set would be dangling, confusing state).
  const textRoles = card.effects?.textRoles;
  function patchRoleTextEffect(role: TextRole, patch: Partial<RoleTextEffect>) {
    onChange({ effects: { ...card.effects, textRoles: { ...textRoles, [role]: { ...textRoles?.[role], ...patch } } } });
  }
  function makeGradientHandlers(role: TextRole) {
    const current = textRoles?.[role];
    return {
      gradient: current?.gradient,
      shimmer: current?.shimmer,
      onGradientChange: (v: RoleTextEffect["gradient"]) =>
        patchRoleTextEffect(role, { gradient: v, shimmer: v ? current?.shimmer : undefined }),
      onShimmerChange: (v: RoleTextEffect["shimmer"]) => patchRoleTextEffect(role, { shimmer: v }),
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
      <MenuSection label="Fuente general" first>
        <FontSelect value={card.font ?? "DM Sans"} onChange={v => onChange({ font: v as TextFont })} fonts={CANVAS_FONTS} />
      </MenuSection>

      <MenuSection label="Alineación">
        <Tabs tabs={ALIGN_TABS} active={card.textAlign ?? "left"} onChange={v => onChange({ textAlign: v as TextAlign })} />
      </MenuSection>

      <RoleTypographyFields
        label="Nombre"
        color={colors.name} hasColorOverride={!!card.nameColor}
        onColorChange={v => onChange({ nameColor: v })} onColorClear={() => onChange({ nameColor: undefined })}
        font={card.nameFont ?? card.font ?? "DM Sans"} onFontChange={v => onChange({ nameFont: v })}
        fontSize={nameFontSize} fontSizeMin={10} fontSizeMax={32} onFontSizeChange={v => onChange({ nameFontSize: v })}
        weight={typography.name.fontWeight} onWeightChange={v => onChange({ nameFontWeight: v })}
        letterSpacing={typography.name.letterSpacing} onLetterSpacingChange={v => onChange({ nameLetterSpacing: v })}
        lineHeight={typography.name.lineHeight} lineHeightMin={0.9} lineHeightMax={2} onLineHeightChange={v => onChange({ nameLineHeight: v })}
        {...makeGradientHandlers("name")}
      />

      <RoleTypographyFields
        label="Handle"
        color={colors.handle} hasColorOverride={!!card.handleColor}
        onColorChange={v => onChange({ handleColor: v })} onColorClear={() => onChange({ handleColor: undefined })}
        font={card.handleFont ?? MONO_DEFAULT_FONT} onFontChange={v => onChange({ handleFont: v })}
        fontSize={typography.handle.fontSize} fontSizeMin={7} fontSizeMax={18} onFontSizeChange={v => onChange({ handleFontSize: v })}
        weight={typography.handle.fontWeight ?? 400} onWeightChange={v => onChange({ handleFontWeight: v })}
        letterSpacing={typography.handle.letterSpacing} onLetterSpacingChange={v => onChange({ handleLetterSpacing: v })}
        lineHeight={typography.handle.lineHeight ?? 1.4} lineHeightMin={0.9} lineHeightMax={2} onLineHeightChange={v => onChange({ monoLineHeight: v })}
        {...makeGradientHandlers("handle")}
      />

      <RoleTypographyFields
        label="Descriptor"
        color={colors.descriptor} hasColorOverride={!!card.descriptorColor}
        onColorChange={v => onChange({ descriptorColor: v })} onColorClear={() => onChange({ descriptorColor: undefined })}
        font={card.statusFont ?? MONO_DEFAULT_FONT} onFontChange={v => onChange({ statusFont: v })}
        fontSize={typography.descriptor.fontSize} fontSizeMin={7} fontSizeMax={18} onFontSizeChange={v => onChange({ statusFontSize: v })}
        weight={typography.descriptor.fontWeight ?? 400} onWeightChange={v => onChange({ descriptorFontWeight: v })}
        letterSpacing={typography.descriptor.letterSpacing} onLetterSpacingChange={v => onChange({ descriptorLetterSpacing: v })}
        lineHeight={typography.descriptor.lineHeight ?? 1.4} lineHeightMin={0.9} lineHeightMax={2} onLineHeightChange={v => onChange({ monoLineHeight: v })}
        {...makeGradientHandlers("descriptor")}
      />

      <RoleTypographyFields
        label="Ubicación"
        color={colors.location} hasColorOverride={!!card.locationColor}
        onColorChange={v => onChange({ locationColor: v })} onColorClear={() => onChange({ locationColor: undefined })}
        font={card.locationFont ?? MONO_DEFAULT_FONT} onFontChange={v => onChange({ locationFont: v })}
        fontSize={typography.location.fontSize} fontSizeMin={7} fontSizeMax={18} onFontSizeChange={v => onChange({ locationFontSize: v })}
        weight={typography.location.fontWeight ?? 400} onWeightChange={v => onChange({ locationFontWeight: v })}
        letterSpacing={typography.location.letterSpacing} onLetterSpacingChange={v => onChange({ locationLetterSpacing: v })}
        lineHeight={typography.location.lineHeight ?? 1.4} lineHeightMin={0.9} lineHeightMax={2} onLineHeightChange={v => onChange({ monoLineHeight: v })}
        {...makeGradientHandlers("location")}
      />

      <RoleTypographyFields
        label="Bio"
        color={colors.bio} hasColorOverride={!!card.bioColor}
        onColorChange={v => onChange({ bioColor: v })} onColorClear={() => onChange({ bioColor: undefined })}
        font={card.bioFont ?? MONO_DEFAULT_FONT} onFontChange={v => onChange({ bioFont: v })}
        fontSize={typography.bio.fontSize} fontSizeMin={7} fontSizeMax={18} onFontSizeChange={v => onChange({ bioFontSize: v })}
        weight={typography.bio.fontWeight ?? 400} onWeightChange={v => onChange({ bioFontWeight: v })}
        lineHeight={typography.bio.lineHeight} lineHeightMin={1} lineHeightMax={2.4} onLineHeightChange={v => onChange({ bioLineHeight: v })}
        // No letterSpacing props: bio never had that concept (see
        // cardTypography.ts) — omitting them hides the row entirely.
        {...makeGradientHandlers("bio")}
      />

      <RoleTypographyFields
        label="Views"
        color={colors.views} hasColorOverride={!!card.viewsColor}
        onColorChange={v => onChange({ viewsColor: v })} onColorClear={() => onChange({ viewsColor: undefined })}
        font={card.viewsFont ?? MONO_DEFAULT_FONT} onFontChange={v => onChange({ viewsFont: v })}
        fontSize={typography.views.fontSize} fontSizeMin={7} fontSizeMax={18} onFontSizeChange={v => onChange({ viewsFontSize: v })}
        weight={typography.views.fontWeight ?? 400} onWeightChange={v => onChange({ viewsFontWeight: v })}
        letterSpacing={typography.views.letterSpacing} onLetterSpacingChange={v => onChange({ viewsLetterSpacing: v })}
        lineHeight={typography.views.lineHeight ?? 1.4} lineHeightMin={0.9} lineHeightMax={2} onLineHeightChange={v => onChange({ monoLineHeight: v })}
        {...makeGradientHandlers("views")}
      />

      {/* Contact Links' icon color lives in ProfileContactLinksMenu (next to
          its own content, via BlockStyleFields) — not duplicated here, see
          CLAUDE.md's FASE 2 checkpoint for the reasoning. */}

      <Collapsible label="Efectos de texto">
        <MenuSection label="Sombra" first>
          <MenuRow label="Activar">
            <Toggle value={!!textFx?.shadow} onChange={v => patchTextFx({ shadow: v ? {} : undefined })} />
          </MenuRow>
          {textFx?.shadow && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.shadow.color ?? "#000000"} onChange={v => patchShadow({ color: v })} />
              </MenuRow>
              <SliderRow label="Opacidad" min={0} max={1} step={0.01} value={textFx.shadow.opacity ?? 0.5}
                fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchShadow({ opacity: v })} />
              <SliderRow label="Blur" min={0} max={20} step={1} value={textFx.shadow.blur ?? 4} unit="px"
                onChange={v => patchShadow({ blur: v })} />
              <OffsetRow x={textFx.shadow.offsetX ?? 0} y={textFx.shadow.offsetY ?? 2} min={-20} max={20}
                onChange={(x, y) => patchShadow({ offsetX: x, offsetY: y })} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Glow">
          <MenuRow label="Activar">
            <Toggle value={!!textFx?.glow} onChange={v => patchTextFx({ glow: v ? { intensity: 0.5 } : undefined })} />
          </MenuRow>
          {textFx?.glow && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.glow.color ?? "#ffffff"} onChange={v => patchGlow({ color: v })} />
              </MenuRow>
              <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={textFx.glow.intensity ?? 0.5}
                fmt={v => `${Math.round(v * 100)}%`} onChange={v => patchGlow({ intensity: v })} />
              <SliderRow label="Radio" min={0} max={40} step={1} value={textFx.glow.radius ?? 16} unit="px"
                onChange={v => patchGlow({ radius: v })} />
            </>
          )}
        </MenuSection>

        <Divider />

        <MenuSection label="Stroke / contorno">
          <MenuRow label="Activar">
            <Toggle value={!!textFx?.stroke} onChange={v => patchTextFx({ stroke: v ? { width: 1 } : undefined })} />
          </MenuRow>
          {textFx?.stroke && (
            <>
              <MenuRow label="Color">
                <ColorSwatch value={textFx.stroke.color ?? "#000000"} onChange={v => patchStroke({ color: v })} />
              </MenuRow>
              <SliderRow label="Grosor" min={0.5} max={4} step={0.5} value={textFx.stroke.width ?? 1} unit="px"
                onChange={v => patchStroke({ width: v })} />
            </>
          )}
        </MenuSection>

        <Divider />

        {/* Stage FASE 3: filter: blur() on the glyphs themselves — distinct
            from Sombra's own blur above (that only blurs the shadow layer).
            Card-wide like Sombra/Glow/Stroke above, not per-role (see
            types/index.ts's TextEffects/RoleTextEffect split). */}
        <MenuSection label="Blur">
          <SliderRow label="Intensidad" min={0} max={8} step={0.5} value={textFx?.blur ?? 0} unit="px"
            onChange={v => patchTextFx({ blur: v || undefined })} />
        </MenuSection>
      </Collapsible>
    </div>
  );
}
