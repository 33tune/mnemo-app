"use client";
import type { TextFont } from "@/types";
import { MenuSection, ColorRow, FontSelect, SliderRow, Collapsible } from "@/ui";
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
}

// Stage FASE 2 (Personalization UI/UX): one reusable "role card" for the
// TEXT tab — Color/Font/Size always visible (the 3 controls someone reaches
// for first), Weight/Letter-spacing/Line-height behind "Advanced" (Stage
// FASE 1's resolvers already support all of this per role — this is purely
// the UI layer on top, see cardColors.ts/cardTypography.ts). Used once per
// role (Name/Handle/Descriptor/Location/Bio/Views) by ProfileTypographyMenu.
export default function RoleTypographyFields({
  label, first,
  color, hasColorOverride, onColorChange, onColorClear,
  font, onFontChange,
  fontSize, fontSizeMin, fontSizeMax, onFontSizeChange,
  weight, onWeightChange,
  letterSpacing, onLetterSpacingChange,
  lineHeight, lineHeightMin, lineHeightMax, onLineHeightChange,
}: Props) {
  return (
    <MenuSection label={label} first={first}>
      <ColorRow label="Color" value={color} onChange={onColorChange} clearable={hasColorOverride} onClear={onColorClear} />
      <FontSelect value={font} onChange={v => onFontChange(v as TextFont)} fonts={CANVAS_FONTS} />
      <SliderRow label="Tamaño" min={fontSizeMin} max={fontSizeMax} step={1} value={fontSize} unit="px" onChange={onFontSizeChange} />
      <Collapsible label="Avanzado">
        <SliderRow label="Peso" min={100} max={900} step={100} value={weight} onChange={onWeightChange} />
        {onLetterSpacingChange && (
          <SliderRow label="Espaciado" min={-1} max={4} step={0.1} value={letterSpacing ?? 0} unit="px" onChange={onLetterSpacingChange} />
        )}
        <SliderRow label="Interlineado" min={lineHeightMin} max={lineHeightMax} step={0.05} value={lineHeight} fmt={v => v.toFixed(2)} onChange={onLineHeightChange} />
      </Collapsible>
    </MenuSection>
  );
}
