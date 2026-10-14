"use client";
import type { TextFont, TextGradientEffect, TextShimmerEffect, TextLetterAnimationEffect } from "@/types";
import { useId } from "react";
import { T, uv, MenuSection, MenuNote, ColorRow, FontField, SliderRow, GradientStops, EffectList, EffectRow, FieldResetButton, GotoRow } from "@/ui";
import { wellHex } from "@/ui/ColorPopover";
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";
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

  /** Liquid glass: the role's own text, sampled in the font tile. */
  sample?: string;
  /** Liquid glass: "Sombra, brillo y contorno ›" jumps to Todos los textos. */
  onGoToAllText?: () => void;
}

/** Peso (DS weight row): one "Aa" sample per weight the font LOADS
 * (fontWeights.ts, CLAUDE.md), written in that weight; a radiogroup. A
 * stored weight the font does not load stays as "<n> · sintético" (dimmer)
 * and is never rewritten. System fonts keep 100–900. */
function WeightControl({ font, family, weight, onChange, modified, onReset }: {
  font: string; family: string; weight: number; onChange: (v: number) => void; modified?: boolean; onReset?: () => void;
}) {
  const options = weightOptions(font, weight);
  const loaded = options.filter(o => !o.synthetic).length;
  const synthetic = options.some(o => o.synthetic && o.value === weight);
  const labelId = useId();
  return (
    <div className="mn-field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px", minHeight: 28 }}>
        <span id={labelId} className="mn-label" style={{ color: uv("text-primary") }}>Peso</span>
        <span style={{ ...T.type.help, fontSize: 11.5, color: uv("text-tertiary") }}>{synthetic ? "sintético" : `${loaded} ${loaded === 1 ? "peso" : "pesos"}`}</span>
        <span style={{ ...T.type.value, fontSize: 12, color: uv("text-secondary"), marginLeft: "auto" }}>{weight}</span>
        {modified && onReset && <FieldResetButton label="Peso" onReset={onReset} size={28} />}
      </div>
      <div className="mn-weights" role="radiogroup" aria-labelledby={labelId}>
        {options.map(o => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === weight} className="mn-weight"
            aria-label={o.label} title={o.label}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onChange(o.value); }}
            style={{ fontFamily: family, fontWeight: o.value, opacity: o.synthetic ? 0.5 : 1 }}>Aa</button>
        ))}
      </div>
    </div>
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
  letterAnimation, onLetterAnimationChange, sample, onGoToAllText,
}: Props) {
  const gradientOn = !!gradient;
  const typeChanges = [fontModified, sizeModified, weightModified, letterSpacingModified, lineHeightModified].filter(Boolean).length;
  const fxNames = [gradientOn && "Gradiente", !!shimmer && "Shimmer", !!letterAnimation && "Por letra"].filter(Boolean) as string[];
  const mod = (m?: boolean) => (m ? "modified" as const : undefined);
  const gradientColors = gradient ? gradient.colors ?? [gradient.from, gradient.to].filter((c): c is string => !!c) : [];
  const fontEntry = CANVAS_FONTS.find(f => f.key === font);
  const family = getFontStyle(font);
  const resetType = () => { onFontReset?.(); onSizeReset?.(); onWeightReset?.(); onLetterSpacingReset?.(); onLineHeightReset?.(); };
  const px = (v: number) => `${String(Math.round(v * 10) / 10).replace(".", ",")} px`;
  // Liquid glass (design menu-schema.js role()): three cards — Tipografía,
  // Color, Efectos del texto (tiles + "Sombra, brillo y contorno ›").
  return (
    <>
      <MenuSection label="Tipografía" icon="case" changed={typeChanges} onReset={resetType}
        summary={`${fontEntry?.label ?? font} · ${Math.round(fontSize)} px · ${weight}`}>
        <FontField value={font} onChange={v => onFontChange(v as TextFont)} fonts={CANVAS_FONTS} label={`Fuente: ${label}`}
          detail={fontDetail(font, !!fontModified)} modified={fontModified} onReset={onFontReset} sample={sample} />
        <SliderRow label="Tamaño" icon="maximize" min={fontSizeMin} max={fontSizeMax} step={1} value={fontSize} unit="px" fmt={px} onChange={onFontSizeChange}
          state={mod(sizeModified)} onReset={onSizeReset} />
        <WeightControl font={font} family={family} weight={weight} onChange={onWeightChange} modified={weightModified} onReset={onWeightReset} />
        {onLetterSpacingChange && (
          <SliderRow label="Interletrado" icon="spacing" min={-1} max={4} step={0.1} value={letterSpacing ?? 0} unit="px" fmt={px} onChange={onLetterSpacingChange}
            state={mod(letterSpacingModified)} onReset={onLetterSpacingReset} />
        )}
        {onLineHeightChange && lineHeight != null && (
          <SliderRow label="Interlineado" icon="height" min={lineHeightMin ?? 0.9} max={lineHeightMax ?? 2} step={0.05} value={lineHeight} fmt={v => v.toFixed(2).replace(".", ",")} onChange={onLineHeightChange}
            state={mod(lineHeightModified)} onReset={onLineHeightReset} />
        )}
      </MenuSection>

      <MenuSection label="Color" icon="palette" changed={hasColorOverride ? 1 : 0} onReset={onColorClear}
        summary={gradientOn ? "Lo reemplaza el gradiente" : hasColorOverride ? wellHex(color) : ROLE_COLOR_INHERITED} swatch={gradientOn ? undefined : color}>
        {/* Iteration 0: truly disabled while a gradient replaces the solid
            color — `inert` removes it from Tab order and the a11y tree; a
            visible note says why. */}
        <div style={{ opacity: gradientOn ? 0.4 : 1, transition: "opacity 260ms" }} inert={gradientOn}>
          <ColorRow label="Color" value={color} onChange={onColorChange} clearable={hasColorOverride} onClear={onColorClear}
            state={hasColorOverride ? "modified" : "inherited"} inheritedLabel={ROLE_COLOR_INHERITED} onReset={onColorClear} />
        </div>
        {gradientOn && <MenuNote icon="lock">Lo reemplaza el gradiente</MenuNote>}
      </MenuSection>

      <MenuSection label="Efectos del texto" icon="sparkles" active={fxNames.length} summary={fxNames.length ? fxNames.join(", ") : "Ninguno activo"}>
        <EffectList label={`Efectos del texto: ${label}`}>
          <EffectRow id="gradient" label="Gradiente" icon="palette" preview="t-grad" on={gradientOn}
            state={gradientOn ? `${gradientColors.length} colores` : undefined}
            onToggle={v => onGradientChange(v ? newGradient() : undefined)}>
            {gradient ? (
              <>
                <GradientStops colors={gradientColors}
                  onChange={colors => onGradientChange({ ...gradient, colors })} />
                <SliderRow label="Ángulo" icon="rotate" min={0} max={360} step={5} value={gradient.angle ?? ON.textGradient.angle}
                  onChange={v => onGradientChange({ ...gradient, angle: v })} fmt={v => `${Math.round(v)}°`} />
              </>
            ) : null}
          </EffectRow>
          <EffectRow id="shimmer" label="Shimmer" icon="sparkles" preview="t-shim" on={!!shimmer}
            state={shimmer ? `${(shimmer.speed ?? ON.textShimmer.speed).toFixed(1).replace(".", ",")}x` : undefined}
            onToggle={v => onShimmerChange(v ? { ...ON.textShimmer } : undefined)}>
            {shimmer ? (
              <>
                {/* Bug fix: with a gradient active, Shimmer scrolls the
                    gradient's own colors (textEffects.ts/cardMotion.ts)
                    instead of sweeping a highlight band — "Intensidad" has
                    nothing to control there, so it only shows for the
                    flat-color sweep. */}
                {!gradientOn && (
                  <SliderRow label="Intensidad" icon="sun" min={0} max={1} step={0.01} value={shimmer.intensity ?? ON.textShimmer.intensity}
                    onChange={v => onShimmerChange({ ...shimmer, intensity: v })} fmt={v => `${Math.round(v * 100)}%`} />
                )}
                <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={shimmer.speed ?? ON.textShimmer.speed}
                  onChange={v => onShimmerChange({ ...shimmer, speed: v })} fmt={v => `${v.toFixed(1).replace(".", ",")}x`} />
              </>
            ) : null}
          </EffectRow>
          {onLetterAnimationChange && (
            <EffectRow id="letters" label="Por letra" icon="text" preview="t-let" on={!!letterAnimation}
              state={letterAnimation ? `${letterAnimation.amplitude ?? ON.letterAnimation.amplitude} px` : undefined}
              onToggle={v => onLetterAnimationChange(v ? { ...ON.letterAnimation } : undefined)}>
              {letterAnimation ? (
                <>
                  <SliderRow label="Amplitud" icon="height" min={1} max={12} step={1} value={letterAnimation.amplitude ?? ON.letterAnimation.amplitude}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, amplitude: v })} unit="px" fmt={v => `${Math.round(v)} px`} />
                  <SliderRow label="Velocidad" icon="play" min={0.3} max={3} step={0.1} value={letterAnimation.speed ?? ON.letterAnimation.speed}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, speed: v })} fmt={v => `${v.toFixed(1).replace(".", ",")}x`} />
                  <SliderRow label="Escalonado" icon="spacing" min={0} max={0.2} step={0.01} value={letterAnimation.stagger ?? ON.letterAnimation.stagger}
                    onChange={v => onLetterAnimationChange({ ...letterAnimation, stagger: v })} fmt={v => `${Math.round(v * 1000)} ms`} />
                </>
              ) : null}
            </EffectRow>
          )}
        </EffectList>
        {onGoToAllText && <GotoRow label="Sombra, brillo y contorno" hint="Todos los textos" onGo={onGoToAllText} />}
      </MenuSection>
    </>
  );
}
