"use client";
import type { TextFont, TextGradientEffect, TextShimmerEffect } from "@/types";
import { MenuSection, MenuRow, ColorRow, FontSelect, SliderRow, Collapsible, Toggle, Divider } from "@/ui";
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

  /** Stage FASE 3: gradient replaces solid `color` when set (mutually
   * exclusive — see textEffects.ts's resolveTextEffectStyle). Shimmer
   * requires gradient to also be set; turning gradient off clears shimmer
   * too (handled by the caller, ProfileTypographyMenu.tsx, in one patch —
   * this component stays presentational). */
  gradient?: TextGradientEffect;
  onGradientChange: (v: TextGradientEffect | undefined) => void;
  shimmer?: TextShimmerEffect;
  onShimmerChange: (v: TextShimmerEffect | undefined) => void;
}

// Stage FASE 2 (Personalization UI/UX): one reusable "role card" for the
// TEXT tab — Color/Font/Size always visible (the 3 controls someone reaches
// for first), Weight/Letter-spacing/Line-height behind "Advanced" (Stage
// FASE 1's resolvers already support all of this per role — this is purely
// the UI layer on top, see cardColors.ts/cardTypography.ts). Used once per
// role (Name/Handle/Descriptor/Location/Bio/Views) by ProfileTypographyMenu.
// Stage FASE 3: adds the per-role Gradient/Shimmer section — the solid
// Color row above visually disables itself while gradient is active (see
// gradient's header for why this is the one real exclusion in this stage).
export default function RoleTypographyFields({
  label, first,
  color, hasColorOverride, onColorChange, onColorClear,
  font, onFontChange,
  fontSize, fontSizeMin, fontSizeMax, onFontSizeChange,
  weight, onWeightChange,
  letterSpacing, onLetterSpacingChange,
  lineHeight, lineHeightMin, lineHeightMax, onLineHeightChange,
  gradient, onGradientChange, shimmer, onShimmerChange,
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

      <Collapsible label="Gradient">
        <MenuRow label="Activar">
          <Toggle
            value={gradientOn}
            onChange={v => onGradientChange(v ? { from: "#ffffff", to: "#8a8a96", angle: 90 } : undefined)}
          />
        </MenuRow>
        {gradient && (
          <>
            <ColorRow label="Color A" value={gradient.from} onChange={v => onGradientChange({ ...gradient, from: v })} />
            <ColorRow label="Color B" value={gradient.to} onChange={v => onGradientChange({ ...gradient, to: v })} />
            <SliderRow label="Ángulo" min={0} max={360} step={5} value={gradient.angle}
              onChange={v => onGradientChange({ ...gradient, angle: v })} fmt={v => `${v}°`} />

            <Divider />

            <MenuRow label="Shimmer">
              <Toggle
                value={!!shimmer}
                onChange={v => onShimmerChange(v ? { intensity: 0.6, speed: 1 } : undefined)}
              />
            </MenuRow>
            {shimmer && (
              <>
                <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={shimmer.intensity ?? 0.6}
                  onChange={v => onShimmerChange({ ...shimmer, intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={shimmer.speed ?? 1}
                  onChange={v => onShimmerChange({ ...shimmer, speed: v })} fmt={v => `${v.toFixed(1)}x`} />
              </>
            )}
          </>
        )}
      </Collapsible>
    </MenuSection>
  );
}
