/**
 * Editor v3 Phase F — which weights of each canvas font are actually LOADED.
 *
 * The Peso control offers only these (CLAUDE.md "Peso solo con los pesos
 * cargados"): any other value renders as the nearest loaded face or as a
 * synthetic bold, so offering it would be a control that lies. A stored
 * weight that is not loaded is shown as "<n> · sintético" and is never
 * rewritten (the card keeps rendering exactly as before).
 *
 * Google fonts: parity with the @import URLs of src/app/globals.css is
 * tested (fontWeights.test.ts) — a family loaded without a `wght` axis
 * loads 400 only. System fonts (Arial, Georgia…) are not loaded by the app:
 * the machine may have any weight, so they keep the full 100–900 range.
 */
import { CANVAS_FONTS } from "./fontList";

export const LOADED_FONT_WEIGHTS: Readonly<Record<string, readonly number[]>> = {
  "Anton": [400],
  "Bebas Neue": [400],
  "Cabin": [400, 600, 700],
  "Comfortaa": [400, 600, 700],
  "Dancing Script": [400, 700],
  "DM Sans": [300, 400, 500],
  "Fira Code": [400, 500, 700],
  "Great Vibes": [400],
  "Inter": [400, 500, 700],
  "JetBrains Mono": [400, 700],
  "Josefin Sans": [400, 600, 700],
  "Lato": [400, 700],
  "Montserrat": [400, 600, 700],
  "Mulish": [400, 700],
  "Nunito": [400, 600, 700],
  "Open Sans": [400, 600, 700],
  "Oswald": [400, 500, 600],
  "Pacifico": [400],
  "Playfair Display": [400, 700],
  "Poppins": [400, 500, 700],
  "Quicksand": [400, 500, 700],
  "Raleway": [400, 600, 700],
  "Roboto": [400, 500, 700],
  "Space Mono": [400, 700],
  "Syne": [400, 700, 800],
  "Ubuntu": [400, 500, 700],
};

const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export interface WeightOption {
  value: number;
  label: string;
  /** Not a loaded face: shown only because it is the stored value. */
  synthetic?: boolean;
}

const WEIGHT_NAME: Record<number, string> = {
  100: "Fina", 200: "Extrafina", 300: "Liviana", 400: "Regular", 500: "Media",
  600: "Semibold", 700: "Bold", 800: "Extrabold", 900: "Black",
};

/** Is this font loaded by the app (a Google font in globals.css)? */
export function isLoadedFont(font: string): boolean {
  return font in LOADED_FONT_WEIGHTS;
}

/** The Peso options for `font`, with `current` (the effective weight)
 * always present — marked synthetic when the font does not load it. */
export function weightOptions(font: string, current: number): WeightOption[] {
  const loaded = LOADED_FONT_WEIGHTS[font];
  const base: WeightOption[] = (loaded ?? ALL_WEIGHTS).map(w => ({ value: w, label: String(w) }));
  if (!base.some(o => o.value === current)) {
    base.push({ value: current, label: `${current} · sintético`, synthetic: true });
    base.sort((a, b) => a.value - b.value);
  }
  return base;
}

/** "Bold" / "Regular"… (tooltips, the font field's subtitle). */
export function weightName(w: number): string {
  return WEIGHT_NAME[w] ?? String(w);
}

/** Every CANVAS_FONTS key that is a Google font has an entry (test helper). */
export function googleFontKeys(): string[] {
  return CANVAS_FONTS.map(f => f.key).filter(isLoadedFont);
}
