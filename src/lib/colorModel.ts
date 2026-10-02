/**
 * Block 2 (editor UI): pure color math for the custom ColorWell popover
 * (src/ui/ColorPopover.tsx) — parse any color string the editor/renderer
 * produces, convert RGB <-> HSV for the SV area + hue bar, and format the
 * result back into the two shapes the rest of the app already stores:
 * `#rrggbb` when opaque, `rgba(r,g,b,a)` (alpha rounded to 3 decimals —
 * same shape withOpacity/keepAlphaOf in cardColors.ts write) when not.
 *
 * Nothing here touches rendering; it only decides which string a picker
 * hands to a menu's onChange.
 */

export interface RGBA { r: number; g: number; b: number; a: number; }
export interface HSVA { h: number; s: number; v: number; a: number; }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`.
 * Returns null for anything else (named colors, gradients, garbage). */
export function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null;
  const c = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map(ch => ch + ch).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? +(n(6) / 255).toFixed(3) : 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c);
  if (rgb) {
    return {
      r: clamp(Math.round(Number(rgb[1])), 0, 255),
      g: clamp(Math.round(Number(rgb[2])), 0, 255),
      b: clamp(Math.round(Number(rgb[3])), 0, 255),
      a: rgb[4] === undefined ? 1 : clamp(Number(rgb[4]), 0, 1),
    };
  }
  return null;
}

/** Parses what a person types in the hex field: with or without `#`,
 * 3/6 digits (alpha untouched -> `a` is undefined) or 4/8 digits (alpha
 * explicit). Null when not a valid hex. */
export function parseHexInput(input: string): { r: number; g: number; b: number; a?: number } | null {
  const raw = input.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(raw) || ![3, 4, 6, 8].includes(raw.length)) return null;
  const parsed = parseColor(`#${raw}`);
  if (!parsed) return null;
  const hasAlpha = raw.length === 4 || raw.length === 8;
  return hasAlpha ? parsed : { r: parsed.r, g: parsed.g, b: parsed.b };
}

/** h in [0, 360), s/v in [0, 1]. */
export function rgbToHsv({ r, g, b, a }: RGBA): HSVA {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn)      h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else                 h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a };
}

export function hsvToRgb({ h, s, v, a }: HSVA): RGBA {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (hh < 60)       { rp = c; gp = x; }
  else if (hh < 120) { rp = x; gp = c; }
  else if (hh < 180) { gp = c; bp = x; }
  else if (hh < 240) { gp = x; bp = c; }
  else if (hh < 300) { rp = x; bp = c; }
  else               { rp = c; bp = x; }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
    a,
  };
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

/** Opaque `#rrggbb` (alpha ignored). */
export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** The string a picker hands to onChange: `#rrggbb` when alpha is 1 (or
 * alpha editing is off), `rgba(r,g,b,a)` otherwise. */
export function formatColor(c: RGBA, allowAlpha = true): string {
  const a = +clamp(c.a, 0, 1).toFixed(3);
  if (!allowAlpha || a >= 1) return rgbToHex(c);
  return `rgba(${clamp(Math.round(c.r), 0, 255)},${clamp(Math.round(c.g), 0, 255)},${clamp(Math.round(c.b), 0, 255)},${a})`;
}

/** Fallback-safe HSVA for any value (unparseable -> opaque white, the
 * same fallback ColorRow already used for an absent value). */
export function toHsva(value: string | undefined | null): HSVA {
  return rgbToHsv(parseColor(value) ?? { r: 255, g: 255, b: 255, a: 1 });
}
