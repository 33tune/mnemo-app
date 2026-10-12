"use client";
import type { TextFont, TextGradientEffect, TextShimmerEffect, TextLetterAnimationEffect } from "@/types";
import { T, MenuSection, MenuRow, MenuNote, ColorRow, FontField, SliderRow, Collapsible, GradientStops, Tabs, EffectList, EffectRow, useFieldLabelId } from "@/ui";
import { CANVAS_FONTS } from "@/lib/fontList";
import { EFFECT_ON_DEFAULTS } from "@/lib/effectEditorDefaults";
import { weightOptions, isLoadedFont, LOADED_FONT_WEIGHTS } from "@/lib/fontWeights";

// Menu redesign Phase 1: the values a switch writes when turned on live in
// effectEditorDefaults.ts (EFFECT_ON_DEFAULTS) — fresh copies, never shared.
const ON = EFFECT_ON_DEFAULTS;
/** Phase 2: a role color without its own override derives from "Color de
 * todos los textos" (card.textColor / cardBaseColor) — the inherited chip
 * says where it comes from. */
export const ROLE_COLOR_INHERITED = "Todos los textos";
const newGradient = (): TextGradientEffect => ({ colors: [...ON.textGradient.colors], angle: ON.textGradient.angle });
const pad2 = (n: number) => String(n).padStart(2, "0");

interface Props {
  /** The role's name ("Nombre", "@usuario"…) — names the font field. */
  label:  string;
  /** Number of the first section here (01 is the object's content). */
  numStart?: number;

  color: string;
  hasColorOverride: boolean;
  onColorChange: (v: string) => void;
  onColorClear: () => void;

  font: TextFont;
  onFontChange: (v: TextFont) => void;
  /** Phase F: the font is the user's own choice (dot + reset). */
  fontModified?: boolean;
  onFontReset?: () => void;

  fontSize: number;
  fontSizeMin: number;
  fontSizeMax: number;
  onFontSizeChange: (v: number) => void;
  sizeModified?: boolean;
  onSizeReset?: () => void;

  weight: number;
  onWeightChange: (v: number) => void;
  weightModified?: boolean;
  onWeightReset?: () => void;

  /** Absent (bio) -> the letter-spacing row is skipped entirely — bio never
   * had that concept (see cardTypography.ts's ResolvedCardTypography.bio). */
  letterSpacing?: number;
  onLetterSpacingChange?: (v: number) => void;
  letterSpacingModified?: boolean;
  onLetterSpacingReset?: () => void;

  /** Absent (Handle/Descriptor/Ubicación/Views) -> the line-height row is
   * skipped. Block 1: those four share ONE field (card.monoLineHeight),
   * edited once, card-wide, in "Todos los textos". */
  lineHeight?: number;
  lineHeightMin?: number;
  lineHeightMax?: number;
  onLineHeightChange?: (v: number) => void;
  lineHeightModified?: boolean;
  onLineHeightReset?: () => void;

  /** Gradient replaces solid `color` when set (mutually exclusive — see
   * textEffects.ts's resolveTextEffectStyle). Shimmer works standalone. */
  gradient?: TextGradientEffect;
  onGradientChange: (v: TextGradientEffect | undefined) => void;
  shimmer?: TextShimmerEffect;
  onShimmerChange: (v: TextShimmerEffect | undefined) => void;

  /** Product closeout: per-character bounce — Name only. */
  letterAnimation?: TextLetterAnimationEffect;
  onLetterAnimationChange?: (v: TextLetterAnimationEffect | undefined) => void;
}

/** Peso: only the weights the font LOADS (fontWeights.ts, CLAUDE.md) — a
 * segmented control when they fit, a select otherwise (system fonts keep
 * 100–900). A stored weight the font does not load stays selectable as
 * "<n> · sintético" and is never rewritten. */
function WeightControl({ font, weight, onChange }: { font: string; weight: number; onChange: (v: number) => void }) {
  const labelledBy = useFieldLabelId();
  const options = weightOptions(font, weight);
  if (options.length <= 4 && !options.some(o => o.synthetic)) {
    return <Tabs tabs={options.map(o => ({ id: String(o.value), label: o.label }))} active={String(weight)} onChange={v => onChange(Number(v))} />;
  }
  return (
    <select className="mn-input mn-select mn-select--compact" value={weight} aria-labelledby={labelledBy}
      onChange={e => onChange(Number(e.target.value))} onMouseDown={e => e.stopPropagation()}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function fontDetail(font: string, modified: boolean): string {
  const loaded = LOADED_FONT_WEIGHTS[font];
  const weights = isLoadedFont(font) ? `${loaded.length} ${loaded.length === 1 ? "peso" : "pesos"}` : "del sistema";
  return modified ? weights : `Predeterminada · ${weights}`;
}

// Editor v3 Phase F (design screen 02): one role's text style, in numbered
// sections — 02 Tipografía (the font written in itself, Tamaño, Peso with
// the loaded weights, "Espaciado ›"), 03 Color, 04 Efectos del texto (rows
// with a switch, one unfolds at a time: Gradiente, Shimmer, Animación por
// letra for the Name). Every value the user set shows the orange dot and
// its reset deletes the stored key. Same capabilities, values and ranges
// as before (the capability matrix proves the writes).
export default function RoleTypographyFields({
  label, numStart = 2,
  color, hasColorOverride, onColorChange, onColorClear,
  font, onFontChange, fontModified, onFontReset,
  fontSize, fontSizeMin, fontSizeMax, onFontSizeChange, sizeModified, onSizeReset,
  weight, onWeightChange, weightModified, onWeightReset,
  letterSpacing, onLetterSpacingChange, letterSpacingModified, onLetterSpacingReset,
  lineHeight, lineHeightMin, lineHeightMax, onLineHeightChange, lineHeightModified, onLineHeightReset,
  gradient, onGradientChange, shimmer, onShimmerChange,
  letterAnimation, onLetterAnimationChange,
}: Props) {
  const gradientOn = !!gradient;
  const hasSpacing = !!onLetterSpacingChange || (!!onLineHeightChange && lineHeight != null);
  const spacingModified = !!letterSpacingModified || !!lineHeightModified;
  const typeChanges = [fontModified, sizeModified, weightModified, letterSpacingModified, lineHeightModified].filter(Boolean).length;
  const fxOn = [gradientOn, !!shimmer, !!letterAnimation].filter(Boolean).length;
  const mod = (m?: boolean) => (m ? "modified" as const : undefined);
  const gradientColors = gradient ? gradient.colors ?? [gradient.from, gradient.to].filter((c): c is string => !!c) : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5] }}>
      <MenuSection label="Tipografía" num={pad2(numStart)} tone={2} changed={typeChanges} first>
        <FontField value={font} onChange={v => onFontChange(v as TextFont)} fonts={CANVAS_FONTS} label={`Fuente: ${label}`}
          detail={fontDetail(font, !!fontModified)} modified={fontModified} onReset={onFontReset} />
        <SliderRow label="Tamaño" min={fontSizeMin} max={fontSizeMax} step={1} value={fontSize} unit="px" onChange={onFontSizeChange}
          state={mod(sizeModified)} onReset={onSizeReset} />
        <MenuRow label="Peso" state={mod(weightModified)} onReset={onWeightReset}>
          <WeightControl font={font} weight={weight} onChange={onWeightChange} />
        </MenuRow>
        {hasSpacing && (
          <Collapsible label="Espaciado" modified={spacingModified} defaultOpen={spacingModified}>
            {onLetterSpacingChange && (
              <SliderRow label="Interletrado" min={-1} max={4} step={0.1} value={letterSpacing ?? 0} unit="px" onChange={onLetterSpacingChange}
                state={mod(letterSpacingModified)} onReset={onLetterSpacingReset} />
            )}
            {onLineHeightChange && lineHeight != null && (
              <SliderRow label="Interlineado" min={lineHeightMin ?? 0.9} max={lineHeightMax ?? 2} step={0.05} value={lineHeight} fmt={v => v.toFixed(2)} onChange={onLineHeightChange}
                state={mod(lineHeightModified)} onReset={onLineHeightReset} />
            )}
          </Collapsible>
        )}
      </MenuSection>

      <MenuSection label="Color" num={pad2(numStart + 1)} tone={1} changed={hasColorOverride ? 1 : 0} first>
        {/* Iteration 0: truly disabled while a gradient replaces the solid
            color — `inert` removes it from Tab order and the a11y tree; a
            visible note says why. */}
        <div style={{ opacity: gradientOn ? 0.4 : 1 }} inert={gradientOn}>
          <ColorRow label="Color" value={color} onChange={onColorChange} clearable={hasColorOverride} onClear={onColorClear}
            state={hasColorOverride ? "modified" : "inherited"} inheritedLabel={ROLE_COLOR_INHERITED} onReset={onColorClear} />
        </div>
        {gradientOn && <MenuNote>Color: lo reemplaza el gradiente.</MenuNote>}
      </MenuSection>

      <MenuSection label="Efectos del texto" num={pad2(numStart + 2)} tone={4} active={fxOn} first>
        <EffectList label={`Efectos del texto: ${label}`}>
          <EffectRow id="gradient" label="Gradiente" tone={1} on={gradientOn}
            state={gradientOn ? `${gradientColors.length} colores` : undefined}
            onToggle={v => onGradientChange(v ? newGradient() : undefined)}>
            {gradient ? (
              <>
                <GradientStops colors={gradientColors}
                  onChange={colors => onGradientChange({ ...gradient, colors })} />
                <SliderRow label="Ángulo" min={0} max={360} step={5} value={gradient.angle ?? ON.textGradient.angle}
                  onChange={v => onGradientChange({ ...gradient, angle: v })} fmt={v => `${v}°`} />
              </>
            ) : <MenuNote>Activalo para pintar el texto con dos o más colores.</MenuNote>}
          </EffectRow>
          <EffectRow id="shimmer" label="Shimmer" tone={2} on={!!shimmer}
            state={shimmer ? `${(shimmer.speed ?? ON.textShimmer.speed).toFixed(1)}x` : undefined}
            onToggle={v => onShimmerChange(v ? { ...ON.textShimmer } : undefined)}>
            {shimmer ? (
              <>
                {/* Bug fix: with a gradient active, Shimmer scrolls the
                    gradient's own colors (textEffects.ts/cardMotion.ts)
                    instead of sweeping a highlight band — "Intensidad" has
                    nothing to control there, so it only shows for the
                    flat-color sweep. */}
                {!gradientOn && (
                  <SliderRow label="Intensidad" min={0} max={1} step={0.01} value={shimmer.intensity ?? ON.textShimmer.intensity}
                    onChange={v => onShimmerChange({ ...shimmer, intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                )}
                <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={shimmer.speed ?? ON.textShimmer.speed}
                  onChange={v => onShimmerChange({ ...shimmer, speed: v })} fmt={v => `${v.toFixed(1)}x`} />
              </>
            ) : <MenuNote>Un brillo que recorre el texto.</MenuNote>}
          </EffectRow>
          {onLetterAnimationChange && (
            <EffectRow id="letters" label="Animación por letra" tone={3} on={!!letterAnimation}
              state={letterAnimation ? `${letterAnimation.amplitude ?? ON.letterAnimation.amplitude} px` : undefined}
              onToggle={v => onLetterAnimationChange(v ? { ...ON.letterAnimation } : undefined)}>
              {letterAnimation ? (
                <>
                  <SliderRow label="Amplitud" min={1} max={12} step={1} value={letterAnimation.amplitude ?? ON.letterAnimation.amplitude}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, amplitude: v })} unit="px" />
                  <SliderRow label="Velocidad" min={0.3} max={3} step={0.1} value={letterAnimation.speed ?? ON.letterAnimation.speed}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, speed: v })} fmt={v => `${v.toFixed(1)}x`} />
                  <SliderRow label="Escalonado" min={0} max={0.2} step={0.01} value={letterAnimation.stagger ?? ON.letterAnimation.stagger}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, stagger: v })} fmt={v => `${Math.round(v * 1000)}ms`} />
                </>
              ) : <MenuNote>Cada letra rebota por separado.</MenuNote>}
            </EffectRow>
          )}
        </EffectList>
      </MenuSection>
    </div>
  );
}
