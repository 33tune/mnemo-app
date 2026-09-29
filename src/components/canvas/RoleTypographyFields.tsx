"use client";
import type { TextFont, TextGradientEffect, TextShimmerEffect, TextLetterAnimationEffect } from "@/types";
import { MenuSection, MenuRow, ColorRow, FontSelect, SliderRow, Collapsible, Toggle, Divider, GradientStops } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";

interface Props {
  label:  string;
  first?: boolean;

  color: string;
  hasColorOverride: boolean;
  onColorChange: (v: string) => void;
  onColorClear: () => void;

  font: TextFont;
  onFontChange: (v: TextFont) => void;

  fontSize: number;
  fontSizeMin: number;
  fontSizeMax: number;
  onFontSizeChange: (v: number) => void;

  weight: number;
  onWeightChange: (v: number) => void;

  /** Absent (bio) -> the letter-spacing row is skipped entirely — bio never
   * had that concept (see cardTypography.ts's ResolvedCardTypography.bio). */
  letterSpacing?: number;
  onLetterSpacingChange?: (v: number) => void;

  lineHeight: number;
  lineHeightMin: number;
  lineHeightMax: number;
  onLineHeightChange: (v: number) => void;

  /** Gradient replaces solid `color` when set (mutually exclusive — see
   * textEffects.ts's resolveTextEffectStyle). Shimmer works standalone too
   * now (see that file's header for the fix) — it no longer requires
   * gradient to be set first, so its Toggle is always available. */
  gradient?: TextGradientEffect;
  onGradientChange: (v: TextGradientEffect | undefined) => void;
  shimmer?: TextShimmerEffect;
  onShimmerChange: (v: TextShimmerEffect | undefined) => void;

  /** Product closeout: per-character bounce — Name only (absent for every
   * other role, hides the "Animación" section entirely, same conditional
   * pattern letterSpacing already uses for Bio). */
  letterAnimation?: TextLetterAnimationEffect;
  onLetterAnimationChange?: (v: TextLetterAnimationEffect | undefined) => void;
}

// Stage FASE 2 (Personalization UI/UX): one reusable "role card" for the
// TEXT tab — Color/Font/Size always visible (the 3 controls someone reaches
// for first), Weight/Letter-spacing/Line-height behind "Avanzado" (Stage
// FASE 1's resolvers already support all of this per role — this is purely
// the UI layer on top, see cardColors.ts/cardTypography.ts). Used once per
// role (Name/Handle/Descriptor/Location/Bio/Views) by ProfileTypographyMenu.
// "Gradiente" (Product closeout: renamed from "Gradient" — the UX audit
// found "Gradient"/"Gradiente" naming the same concept in two languages
// across TEXT vs. BACKGROUND) now edits N colors via GradientStops instead
// of a hardcoded 2-swatch pair. Shimmer's Toggle is always available (no
// longer gated behind Gradient being on — see textEffects.ts's shimmer
// fix). "Animación" (letter bounce) only renders when the caller passes
// letterAnimation handlers — i.e. only for Name.
export default function RoleTypographyFields({
  label, first,
  color, hasColorOverride, onColorChange, onColorClear,
  font, onFontChange,
  fontSize, fontSizeMin, fontSizeMax, onFontSizeChange,
  weight, onWeightChange,
  letterSpacing, onLetterSpacingChange,
  lineHeight, lineHeightMin, lineHeightMax, onLineHeightChange,
  gradient, onGradientChange, shimmer, onShimmerChange,
  letterAnimation, onLetterAnimationChange,
}: Props) {
  const gradientOn = !!gradient;
  return (
    <MenuSection label={label} first={first}>
      <div style={{ opacity: gradientOn ? 0.4 : 1, pointerEvents: gradientOn ? "none" : undefined }}>
        <ColorRow label="Color" value={color} onChange={onColorChange} clearable={hasColorOverride} onClear={onColorClear} />
      </div>
      <FontSelect value={font} onChange={v => onFontChange(v as TextFont)} fonts={CANVAS_FONTS} />
      <SliderRow label="Tamaño" min={fontSizeMin} max={fontSizeMax} step={1} value={fontSize} unit="px" onChange={onFontSizeChange} />

      <Collapsible label="Avanzado">
        <SliderRow label="Peso" min={100} max={900} step={100} value={weight} onChange={onWeightChange} />
        {onLetterSpacingChange && (
          <SliderRow label="Espaciado" min={-1} max={4} step={0.1} value={letterSpacing ?? 0} unit="px" onChange={onLetterSpacingChange} />
        )}
        <SliderRow label="Interlineado" min={lineHeightMin} max={lineHeightMax} step={0.05} value={lineHeight} fmt={v => v.toFixed(2)} onChange={onLineHeightChange} />
      </Collapsible>

      <Collapsible label="Gradiente">
        <MenuRow label="Activar">
          <Toggle
            value={gradientOn}
            onChange={v => onGradientChange(v ? { colors: ["#ffffff", "#8a8a96"], angle: 90 } : undefined)}
          />
        </MenuRow>
        {gradient && (
          <>
            <GradientStops colors={gradient.colors ?? [gradient.from, gradient.to].filter((c): c is string => !!c)}
              onChange={colors => onGradientChange({ ...gradient, colors })} />
            <SliderRow label="Ángulo" min={0} max={360} step={5} value={gradient.angle ?? 90}
              onChange={v => onGradientChange({ ...gradient, angle: v })} fmt={v => `${v}°`} />
          </>
        )}

        <Divider />

        <MenuRow label="Shimmer">
          <Toggle
            value={!!shimmer}
            onChange={v => onShimmerChange(v ? { intensity: 0.45, speed: 1 } : undefined)}
          />
        </MenuRow>
        {shimmer && (
          <>
            <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={shimmer.intensity ?? 0.45}
              onChange={v => onShimmerChange({ ...shimmer, intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
            <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={shimmer.speed ?? 1}
              onChange={v => onShimmerChange({ ...shimmer, speed: v })} fmt={v => `${v.toFixed(1)}x`} />
          </>
        )}
      </Collapsible>

      {onLetterAnimationChange && (
        <Collapsible label="Animación">
          <MenuRow label="Animar por letra">
            <Toggle
              value={!!letterAnimation}
              onChange={v => onLetterAnimationChange(v ? { amplitude: 4, speed: 1, stagger: 0.05 } : undefined)}
            />
          </MenuRow>
          {letterAnimation && (
            <>
              <SliderRow label="Amplitud" min={1} max={12} step={1} value={letterAnimation.amplitude ?? 4}
                onChange={v => onLetterAnimationChange({ ...letterAnimation, amplitude: v })} unit="px" />
              <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={letterAnimation.speed ?? 1}
                onChange={v => onLetterAnimationChange({ ...letterAnimation, speed: v })} fmt={v => `${v.toFixed(1)}x`} />
              <SliderRow label="Stagger" min={0} max={0.2} step={0.01} value={letterAnimation.stagger ?? 0.05}
                onChange={v => onLetterAnimationChange({ ...letterAnimation, stagger: v })} fmt={v => `${Math.round(v * 1000)}ms`} />
            </>
          )}
        </Collapsible>
      )}
    </MenuSection>
  );
}
