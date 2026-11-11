/**
 * Collectible-card effects: Holo (a foil that moves with the light), Reflejo
 * (a glare that follows it), the card's entrance on the public profile, and
 * the data of Glitter and Strass.
 *
 * The "light" is a point on the card (0–1 on each axis) that
 * useCardInteractions moves with the cursor, the finger or the phone's
 * gyroscope. 2026-11-11 (performance): the layers here are painted once and
 * only MOVED with the light (lightLayers.ts: `data-lm` + a transform per
 * frame) — nothing repaints while the light moves. The falloff around the
 * light is a tiny picture stretched over the card and slid by the compositor.
 *
 * Every field is optional and absent = off: no existing card changes.
 */
import { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { lm } from "./lightLayers";
import { fxColors, loopColors, rgba, cleanColors } from "./fxPalette";
import { FALLOFF_DARK, FALLOFF_LIGHT } from "./foilFalloff";

export type HoloStyle = "rays" | "rainbow" | "etched" | "gold" | "cracked" | "refractor" | "mojo" | "stars" | "mosaic" | "plain";
/** Where the foil goes. "bg" = under the content (the photo, texts and
 * icons stay clean, like a "reverse holo"). */
export type HoloScope = "card" | "bg" | "photo" | "border";
export type EntranceStyle = "fade" | "rise" | "pop" | "flip" | "drop" | "spin";

/** Finishes of real collectible cards (pokemon-cards-css for the TCG ones,
 * Panini Prizm / Topps Chrome for the sports-card ones). */
export const HOLO_STYLES: { id: HoloStyle; label: string }[] = [
  { id: "rays",      label: "Rayos" },
  { id: "rainbow",   label: "Arcoíris secreto" },
  { id: "stars",     label: "Estrellitas" },
  { id: "plain",     label: "Lisa" },
  { id: "mosaic",    label: "Mosaico" },
  { id: "cracked",   label: "Hielo quebrado" },
  { id: "refractor", label: "Refractor" },
  { id: "etched",    label: "Relieve" },
  { id: "mojo",      label: "Mojo" },
  { id: "gold",      label: "Oro" },
];
export const HOLO_SCOPES: { id: HoloScope; label: string }[] = [
  { id: "card",   label: "Toda" },
  { id: "bg",     label: "Fondo" },
  { id: "photo",  label: "Foto" },
  { id: "border", label: "Borde" },
];
/** The first finishes (2026-11-04 morning) map to the closest real one. */
const LEGACY_HOLO: Record<string, HoloStyle> = { glitter: "cracked", metal: "refractor", galaxy: "mojo" };
export function holoStyleOf(fx: CardEffects | undefined): HoloStyle {
  const s = (fx?.holo?.style ?? "rainbow") as string;
  if (HOLO_STYLES.some(h => h.id === s)) return s as HoloStyle;
  return LEGACY_HOLO[s] ?? "rainbow";
}
export function holoScopeOf(fx: CardEffects | undefined): HoloScope {
  const s = fx?.holo?.scope;
  return s === "bg" || s === "photo" || s === "border" ? s : "card";
}

export const ENTRANCE_STYLES: { id: EntranceStyle; label: string }[] = [
  { id: "fade", label: "Aparecer" },
  { id: "rise", label: "Subir" },
  { id: "pop",  label: "Pop" },
  { id: "flip", label: "Voltear" },
  { id: "drop", label: "Caer" },
  { id: "spin", label: "Girar" },
];

export const HOLO_DEFAULT_INTENSITY = 0.7;
export const GLARE_DEFAULT_INTENSITY = 0.6;
export const GLARE_DEFAULT_SIZE = 0.55;
export const ENTRANCE_DEFAULT_DURATION = 0.9;
export const ENTRANCE_DEFAULT_STYLE: EntranceStyle = "rise";
/** The editor's "Ver entrada" asks the card to replay its entrance. */
export const ENTRANCE_PREVIEW_EVENT = "mnemo:entrance-preview";
/** Where the light rests when nobody moves it: up and to the left. */
export const LIGHT_REST = { x: 0.38, y: 0.28 } as const;
/** "Moverse solo": where the light drifts by itself at time `t` (s). */
export function idleLight(t: number): { x: number; y: number } {
  return { x: 0.5 + Math.sin(t * 0.55) * 0.34, y: 0.42 + Math.sin(t * 0.37 + 1.2) * 0.26 };
}

/** Each finish's own colors (what it shows with no palette chosen). */
export const HOLO_PALETTES: Record<HoloStyle, string[]> = {
  rays:      ["#ff7ab8", "#ffe27a", "#7affc1", "#7ad7ff", "#b47aff", "#ff7ab8"],
  rainbow:   ["#ff6b8b", "#ffd36b", "#9bff7a", "#6bf3ff", "#7d8bff", "#e07bff", "#ff6b8b"],
  etched:    ["#ff9ad5", "#a0f0ff", "#c8ff9a", "#ffe08a", "#ff9ad5"],
  gold:      ["#2a1a02", "#c9952c", "#fff3c4", "#e8b54a", "#4a3005", "#ffe08a", "#2a1a02"],
  cracked:   ["#9fe8ff", "#e3b8ff", "#fff6c2", "#b8ffd8", "#9fe8ff"],
  refractor: ["#ff5f6d", "#ffc371", "#fff27a", "#61ffb0", "#5fb8ff", "#b26bff", "#ff5f6d"],
  mojo:      ["#ff4fa3", "#ffb34f", "#4fffd2", "#4f8cff", "#c84fff", "#ff4fa3"],
  stars:     ["#ff8ad1", "#ffd98a", "#8affc4", "#8ad6ff", "#b99aff", "#ff8ad1"],
  mosaic:    ["#5fe1ff", "#b58cff", "#ff8ac2", "#ffe08a", "#8affb5", "#5fe1ff"],
  plain:     ["#ffb3d9", "#fff0b3", "#b3ffe0", "#b3d9ff", "#d9b3ff", "#ffb3d9"],
};
/** How each finish mixes with a dark card (a light card always tints:
 * multiply — light added to white vanishes). */
export const HOLO_BLEND: Record<HoloStyle, CSSProperties["mixBlendMode"]> = {
  rays: "color-dodge", rainbow: "color-dodge", etched: "color-dodge", gold: "screen",
  cracked: "color-dodge", refractor: "color-dodge", mojo: "color-dodge", stars: "color-dodge", mosaic: "color-dodge", plain: "color-dodge",
};
/** Opacity at intensity 1 (dark card / light card). */
export const HOLO_STRENGTH: Record<HoloStyle, number> = { rays: 0.85, rainbow: 0.8, etched: 0.9, gold: 0.75, cracked: 0.8, refractor: 0.7, mojo: 0.6, stars: 0.9, mosaic: 0.75, plain: 0.6 };
export const HOLO_STRENGTH_LIGHT: Record<HoloStyle, number> = { rays: 0.5, rainbow: 0.42, etched: 0.6, gold: 0.6, cracked: 0.5, refractor: 0.45, mojo: 0.45, stars: 0.5, mosaic: 0.5, plain: 0.4 };

const svgUri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Deterministic pseudo-random (the textures look the same on every visit). */
export function rand(seed: number) {
  // Park–Miller, with the seed spread out and a few values thrown away:
  // small seeds otherwise start with small values (sparkles bunched left).
  let s = Math.abs(Math.floor(seed * 2654435761)) % 2147483647 || 1;
  const next = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 6; i++) next();
  return next;
}

/** Cracked ice: irregular shards, each a different grey — over a moving
 * rainbow, every shard catches its own color (Panini "Cracked Ice"). */
const CRACKED_TILE = 520;
const CRACKED_SVG = (() => {
  const r = rand(4242);
  // A jittered grid of points; each cell is split in two triangles.
  const n = 11, step = CRACKED_TILE / n;
  const pt: [number, number][][] = [];
  for (let i = 0; i <= n; i++) {
    pt.push([]);
    for (let j = 0; j <= n; j++) {
      const edge = i === 0 || j === 0 || i === n || j === n;
      // Edges stay on the grid so the tile repeats without seams.
      const jx = edge && (j === 0 || j === n) ? 0 : (r() - 0.5) * step * 0.8;
      const jy = edge && (i === 0 || i === n) ? 0 : (r() - 0.5) * step * 0.8;
      pt[i].push([j * step + jx, i * step + jy]);
    }
  }
  const polys: string[] = [];
  const g = () => { const v = Math.round(40 + r() * 190); return `rgb(${v},${v},${v})`; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = pt[i][j], b = pt[i][j + 1], c = pt[i + 1][j + 1], d = pt[i + 1][j];
    const flip = r() > 0.5;
    const t1 = flip ? [a, b, c] : [a, b, d], t2 = flip ? [a, c, d] : [b, c, d];
    for (const t of [t1, t2]) polys.push(`<polygon points='${t.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ")}' fill='${g()}' stroke='rgba(255,255,255,0.5)' stroke-width='0.7'/>`);
  }
  return svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${CRACKED_TILE}' height='${CRACKED_TILE}'>${polys.join("")}</svg>`);
})();

/** Etched: a fine engraved lattice, white lines on black (multiplied with
 * the rainbow, only the lines light up — Ultimate-Rare-like texture). */
const ETCHED_SVG = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='rgb(25,25,25)'/><path d='M0 8 L8 0 L16 8 L8 16 Z' fill='none' stroke='white' stroke-width='1.1'/><circle cx='8' cy='8' r='1.3' fill='white'/></svg>`);

/** Fine glitter noise (gold, secret rare), static on the card. */
const SPARK_SVG = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' seed='9'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 10 -7.5'/></filter><rect width='140' height='140' filter='url(%23s)'/></svg>`);

/** Estrellitas: the classic "cosmos" foil — stars, dots and rings of
 * different sizes, bright on a dim sheet (only they catch the full color). */
const STARS_TILE = 260;
const STARS_SVG = (() => {
  const r = rand(77);
  const out: string[] = [`<rect width='${STARS_TILE}' height='${STARS_TILE}' fill='rgb(62,62,62)'/>`];
  const T = STARS_TILE;
  for (let i = 0; i < 46; i++) {
    const x = r() * T, y = r() * T, kind = r(), v = Math.round(170 + r() * 85), c = `rgb(${v},${v},${v})`;
    // Shapes near an edge are drawn again on the other side: no seams.
    const copies = [[0, 0], [x < 20 ? T : x > T - 20 ? -T : 0, 0], [0, y < 20 ? T : y > T - 20 ? -T : 0]].filter((o, k) => k === 0 || o[0] !== 0 || o[1] !== 0);
    for (const [ox, oy] of copies) {
      const cx = (x + ox).toFixed(1), cy = (y + oy).toFixed(1);
      if (kind < 0.34) {
        const R = 4 + r() * 9, q = R * 0.2;
        out.push(`<path transform='translate(${cx} ${cy})' d='M0 ${-R} Q${q} ${-q} ${R} 0 Q${q} ${q} 0 ${R} Q${-q} ${q} ${-R} 0 Q${-q} ${-q} 0 ${-R} Z' fill='${c}'/>`);
      } else if (kind < 0.5) {
        const R = 5 + r() * 8;
        out.push(`<circle cx='${cx}' cy='${cy}' r='${R.toFixed(1)}' fill='none' stroke='${c}' stroke-width='1.6'/>`);
      } else {
        out.push(`<circle cx='${cx}' cy='${cy}' r='${(0.9 + r() * 2.6).toFixed(1)}' fill='${c}'/>`);
      }
    }
  }
  return svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${T}' height='${T}'>${out.join("")}</svg>`);
})();

/** Mosaico: a grid of squares, each a different grey with a bevel (Panini
 * "Mosaic"): every tile catches the color a little differently. */
const MOSAIC_TILE = 240;
const MOSAIC_SVG = (() => {
  const r = rand(1313), n = 10, c = MOSAIC_TILE / n;
  const out: string[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = Math.round(50 + r() * 170), x = j * c, y = i * c;
    out.push(`<rect x='${x}' y='${y}' width='${c}' height='${c}' fill='rgb(${v},${v},${v})'/>`);
    out.push(`<path d='M${x} ${y + c} L${x} ${y} L${x + c} ${y}' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='1'/>`);
    out.push(`<path d='M${x + c} ${y} L${x + c} ${y + c} L${x} ${y + c}' fill='none' stroke='rgba(0,0,0,0.45)' stroke-width='1'/>`);
  }
  return svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${MOSAIC_TILE}' height='${MOSAIC_TILE}'>${out.join("")}</svg>`);
})();

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function holoOn(fx: CardEffects | undefined): boolean {
  return !!fx?.holo?.enabled && (fx.holo.intensity ?? HOLO_DEFAULT_INTENSITY) > 0;
}
export function glareOn(fx: CardEffects | undefined): boolean {
  return !!fx?.glare?.enabled && (fx.glare.intensity ?? GLARE_DEFAULT_INTENSITY) > 0;
}
/** The card has something that follows the light (or the pointer). */
export function lightEffectsOn(fx: CardEffects | undefined): boolean {
  return holoOn(fx) || glareOn(fx) || !!fx?.strass?.enabled || !!fx?.edge?.enabled || !!fx?.seal?.enabled
    || !!fx?.depth?.enabled || !!fx?.glitter?.enabled;
}
/** Worth asking an iPhone for its motion sensor (glitter alone is not: it
 * only sparkles a bit more near the cursor). */
export function lightGyroOn(fx: CardEffects | undefined): boolean {
  return holoOn(fx) || glareOn(fx) || !!fx?.strass?.enabled || !!fx?.edge?.enabled || !!fx?.seal?.enabled || !!fx?.depth?.enabled;
}
/** The light drifts by itself (holo "Moverse solo"; the stones, the rim and
 * the seal need a moving light to sparkle). */
export function lightIdleOn(fx: CardEffects | undefined): boolean {
  return (holoOn(fx) && fx?.holo?.idle !== false) || !!fx?.strass?.enabled || !!fx?.edge?.enabled || !!fx?.seal?.enabled;
}

/** One painted-once layer of a light effect. `lm` = how it moves
 * (lightLayers.ts); `img` = a picture instead of a CSS background; `heavy`
 * = dropped first when the device can't keep up (data-fx-heavy). */
export type FoilLayer = { key: string; style: CSSProperties; lm?: string; img?: string; heavy?: boolean };
export type FoilBox = { w: number; h: number };

function pxStops(colors: string[], period: number): string {
  return colors.map((c, i) => `${c} ${((i / (colors.length - 1)) * period).toFixed(1)}px`).join(", ");
}

/** A band of colors that slides along its own direction with the light. */
function band(key: string, colors: string[], angle: number, period: number, cx: number, cy: number, box: FoilBox, blend?: string, opacity?: number): FoilLayer {
  const m = Math.ceil(period / 2) + 2;
  return {
    key, lm: lm.shift(angle, cx, cy, period),
    style: {
      position: "absolute", left: -m, top: -m, width: box.w + 2 * m, height: box.h + 2 * m, willChange: "transform",
      backgroundImage: `repeating-linear-gradient(${angle}deg, ${pxStops(colors, period)})`,
      ...(blend ? { mixBlendMode: blend as CSSProperties["mixBlendMode"] } : {}),
      ...(opacity != null ? { opacity } : {}),
    },
  };
}
/** A texture that stays on the card (or slides a little against the light). */
function tex(key: string, image: string, tile: number | null, blend: string, opts: { slide?: number; opacity?: number; heavy?: boolean; box?: FoilBox } = {}): FoilLayer {
  const slide = opts.slide && tile && opts.box ? opts.slide : 0;
  const m = slide ? Math.ceil(tile! / 2) + 2 : 0;
  return {
    key, heavy: opts.heavy, lm: slide ? lm.tile(slide, slide, tile!, tile!) : undefined,
    style: {
      position: "absolute", ...(slide ? { left: -m, top: -m, width: opts.box!.w + 2 * m, height: opts.box!.h + 2 * m, willChange: "transform" } : { inset: 0 }),
      backgroundImage: image, ...(tile ? { backgroundSize: `${tile.toFixed(1)}px ${tile.toFixed(1)}px` } : {}),
      mixBlendMode: blend as CSSProperties["mixBlendMode"],
      ...(opts.opacity != null ? { opacity: opts.opacity } : {}),
    },
  };
}
/** The sheen bars of a real foil: a light / dark diagonal that crosses the
 * colors the other way (pokemon-cards-css) — the color shows inside them. */
function bars(period: number, cx: number, cy: number, box: FoilBox, soft = false): FoilLayer {
  const hi = soft ? "rgb(255,255,255)" : "rgb(255,255,255)", lo = soft ? "rgb(120,124,136)" : "rgb(46,50,66)";
  return band("bars", [lo, hi, lo], 133, period, cx, cy, box, "multiply");
}
/** Something centered on the card that turns with the light. */
function spinner(key: string, image: string, box: FoilBox, kx: number, ky: number, blend: string, opacity?: number): FoilLayer {
  const d = Math.ceil(Math.hypot(box.w, box.h)) + 4;
  return {
    key, lm: lm.rot(0, kx, ky),
    style: {
      position: "absolute", left: (box.w - d) / 2, top: (box.h - d) / 2, width: d, height: d, willChange: "transform",
      backgroundImage: image, mixBlendMode: blend as CSSProperties["mixBlendMode"],
      ...(opacity != null ? { opacity } : {}),
    },
  };
}

/** Pattern unit: the finishes are drawn for a ~320 px card and scale with
 * the box (a photo gets a finer pattern) and with the user's "Tamaño". */
function unitOf(fx: CardEffects, box: FoilBox): number {
  const user = Math.max(0.5, Math.min(2, fx.holo?.scale ?? 1));
  return Math.max(0.4, Math.min(1.6, Math.min(box.w, box.h) / 320)) * user;
}

/** The finish's colors: its own, or the chosen palette. */
export function holoColors(fx: CardEffects | undefined, cardColors?: readonly string[]): string[] {
  return loopColors(fxColors(fx?.holo, HOLO_PALETTES[holoStyleOf(fx)], cardColors));
}

/**
 * The layers of the foil for a box of `w`×`h` px, bottom layer first.
 * Colors slide with the light, textures stay (the crossing of the two is
 * what reads as foil), and the last layer dims everything away from the light.
 */
export function holoLayers(fx: CardEffects, box: FoilBox, lightCard = false, cardColors?: readonly string[]): FoilLayer[] {
  const style = holoStyleOf(fx);
  const pal = holoColors(fx, cardColors);
  const u = unitOf(fx, box);
  const A = fx.holo?.angle ?? 0;
  const L: FoilLayer[] = [];
  switch (style) {
    case "rays":
      // Regular holo: vertical bands of color, narrow beams over them.
      L.push(band("color", pal, 90 + A, 150 * u, 1.6, 0.35, box));
      L.push(bars(120 * u, -0.9, -1.3, box, true));
      L.push(tex("beams", `repeating-linear-gradient(${90 + A}deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${(14 * u).toFixed(1)}px, rgba(255,255,255,0.9) ${(18 * u).toFixed(1)}px, rgba(0,0,0,0) ${(22 * u).toFixed(1)}px, rgba(0,0,0,0) ${(34 * u).toFixed(1)}px)`, null, "overlay"));
      break;
    case "rainbow":
      // Secret Rare: a wide rainbow, fine diagonal lines and a glitter grain.
      L.push(band("color", pal, 115 + A, 260 * u, 1.3, 1.0, box));
      L.push(bars(170 * u, -1.0, -1.0, box, true));
      L.push(tex("lines", `repeating-linear-gradient(-45deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 1px, rgba(0,0,0,0.35) 1px, rgba(0,0,0,0.35) 3px)`, null, "overlay"));
      L.push(tex("grain", SPARK_SVG, 140 * u, "screen", { opacity: 0.5, heavy: true }));
      break;
    case "stars":
      L.push(band("color", pal, 100 + A, 230 * u, 1.5, 0.8, box));
      L.push(band("color2", pal, 20 + A, 310 * u, -0.7, 1.1, box, "overlay", 0.7));
      L.push(tex("stars", STARS_SVG, STARS_TILE * u, "multiply", { slide: -26, box }));
      break;
    case "plain":
      // No texture: two soft sheets of color crossing each other.
      L.push(band("color", pal, 120 + A, 340 * u, 1.0, 1.0, box));
      L.push(band("color2", pal, 30 + A, 270 * u, -1.2, 0.7, box, "overlay"));
      break;
    case "mosaic":
      L.push(band("color", pal, 135 + A, 210 * u, 1.3, 1.1, box));
      L.push(band("color2", pal, 45 + A, 280 * u, -1.0, 0.8, box, "overlay", 0.6));
      L.push(tex("tiles", MOSAIC_SVG, MOSAIC_TILE * u, "overlay"));
      break;
    case "cracked":
      L.push(band("color", pal, 140 + A, 170 * u, 1.4, 1.1, box));
      L.push(band("color2", pal, 50 + A, 250 * u, -0.9, 1.2, box, "overlay", 0.55));
      L.push(tex("shards", CRACKED_SVG, CRACKED_TILE * u, "overlay"));
      break;
    case "refractor":
      // Chrome refractor: a rainbow sheen and rays of light that pivot.
      L.push(band("color", pal, 100 + A, 300 * u, 1.4, 0.6, box));
      L.push(spinner("rays", "repeating-conic-gradient(from 0deg, rgb(40,42,52) 0deg, rgb(255,255,255) 5deg, rgb(40,42,52) 10deg, rgb(40,42,52) 14deg, rgb(200,204,214) 17deg, rgb(40,42,52) 20deg)", box, 70, 46, "multiply"));
      break;
    case "etched":
      L.push(band("color", pal, 125 + A, 220 * u, 1.3, 1.0, box));
      L.push(bars(150 * u, -1.0, -1.2, box, true));
      L.push(tex("lattice", ETCHED_SVG, 16 * u, "multiply"));
      break;
    case "mojo":
      // Rings of color with a sheen turning over them.
      L.push(band("color", pal, 60 + A, 200 * u, 1.2, 1.2, box));
      L.push(tex("rings", `repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0px, rgba(0,0,0,0.5) ${(7 * u).toFixed(1)}px, rgba(255,255,255,0.55) ${(14 * u).toFixed(1)}px)`, null, "overlay"));
      L.push(spinner("sheen", "repeating-conic-gradient(from 45deg, rgb(255,255,255) 0deg, rgb(70,72,84) 12deg, rgb(255,255,255) 24deg)", box, 60, 40, "multiply"));
      break;
    case "gold":
      L.push(band("color", pal, 110 + A, 240 * u, 1.2, 0.9, box));
      L.push(bars(160 * u, -0.8, -1.1, box, true));
      L.push(tex("grain", SPARK_SVG, 140 * u, "screen", { heavy: true }));
      break;
  }
  // Strongest around the light — the sheen of a real foil, not a print.
  const d = Math.ceil(Math.hypot(box.w, box.h) * 2) + 8;
  L.push({
    key: "falloff", img: lightCard ? FALLOFF_LIGHT : FALLOFF_DARK, lm: lm.follow(box.w, box.h),
    style: { position: "absolute", left: -d / 2, top: -d / 2, width: d, height: d, maxWidth: "none", display: "block", willChange: "transform", pointerEvents: "none" },
  });
  return L;
}

/** The foil's group: how the finished sheet mixes with the card. */
export function holoGroupStyle(fx: CardEffects, lightCard = false): CSSProperties {
  const style = holoStyleOf(fx);
  const k = clamp01(fx.holo?.intensity ?? HOLO_DEFAULT_INTENSITY) * (lightCard ? HOLO_STRENGTH_LIGHT : HOLO_STRENGTH)[style];
  return {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", isolation: "isolate",
    mixBlendMode: lightCard ? "multiply" : HOLO_BLEND[style],
    // Stronger while the light is held (--la), never gone at rest.
    opacity: `calc(${k.toFixed(3)} * (0.75 + 0.25 * var(--la, 0)))` as unknown as number,
    transition: "opacity 0.3s ease",
  };
}

/** A ring `width` px wide along the element's own (rounded) edge: the mask
 * of everything that lives on the border. Static — never repainted. */
export function ringMask(width: number): CSSProperties {
  const m = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";
  return {
    padding: width, boxSizing: "border-box",
    WebkitMask: m, WebkitMaskComposite: "xor",
    mask: m, maskComposite: "exclude",
  } as CSSProperties;
}
export const holoRingWidth = (w: number, h: number) => Math.round(Math.max(10, Math.min(26, Math.min(w, h) * 0.07)));

/** For the menu's thumbnails: the finish as one still gradient. */
export function holoSwatch(style: HoloStyle, colors?: string[]): string {
  const pal = loopColors(colors && colors.length ? colors : HOLO_PALETTES[style]);
  return `linear-gradient(115deg, ${pal.map((c, i) => `${c} ${((i / (pal.length - 1)) * 100).toFixed(0)}%`).join(", ")})`;
}

/** The glare: a bright spot at the light and a streak through it. */
export function glareLayers(fx: CardEffects, box: FoilBox): FoilLayer[] {
  const g = fx.glare ?? { enabled: true };
  const c = cleanColors(g.color ? [g.color] : [])[0] ?? "#ffffff";
  const size = 0.2 + clamp01(g.size ?? GLARE_DEFAULT_SIZE) * 0.6;
  const L: FoilLayer[] = [];
  if (g.shape !== "streak") {
    const r = Math.round(size * Math.hypot(box.w, box.h) * 0.9);
    L.push({
      key: "spot", lm: lm.follow(box.w, box.h),
      style: {
        position: "absolute", left: -r, top: -r, width: 2 * r, height: 2 * r, willChange: "transform",
        backgroundImage: `radial-gradient(circle closest-side, ${rgba(c, 0.62)} 0%, ${rgba(c, 0.3)} 22%, ${rgba(c, 0.12)} 55%, ${rgba(c, 0)} 100%)`,
      },
    });
  }
  if (g.shape !== "spot") {
    // A band of light with a thin bright core, leaning like a real reflection.
    const bw = Math.round(box.w * (g.shape === "streak" ? 0.2 + size * 0.5 : 0.36)), bh = Math.ceil(Math.hypot(box.w, box.h) * 1.5);
    const a = g.shape === "streak" ? 0.34 : 0.16;
    L.push({
      key: "streak", lm: lm.band(box.w, 25),
      style: {
        position: "absolute", left: -bw / 2, top: (box.h - bh) / 2, width: bw, height: bh, willChange: "transform",
        backgroundImage: `linear-gradient(90deg, ${rgba(c, 0)} 0%, ${rgba(c, a)} 46%, ${rgba(c, a * 1.7)} 50%, ${rgba(c, a)} 54%, ${rgba(c, 0)} 100%)`,
      },
    });
  }
  return L;
}
export function glareGroupStyle(fx: CardEffects): CSSProperties {
  const k = clamp01(fx.glare?.intensity ?? GLARE_DEFAULT_INTENSITY);
  return {
    position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", mixBlendMode: "screen",
    opacity: `calc(${k.toFixed(3)} * (0.45 + 0.55 * var(--la, 0)))` as unknown as number,
    transition: "opacity 0.3s ease",
  };
}

// ── Entrance (public profile) ──────────────────────────────────────────────

export const HOLO_IDLE_ANIMATION = "mnemo-holo-idle";
export const ENTRANCE_SHINE_ANIMATION = "mnemo-entrance-shine";
const entranceName = (s: EntranceStyle) => `mnemo-enter-${s}`;

/** Uses the individual transform properties (translate / scale / rotate) so
 * it never fights the card's own `transform` (parallax + rotation).
 * The shine ends fully past the card and faded out: it used to stop at 130 %
 * of its own width, still inside the card's right edge, and its fill kept a
 * bright strip there forever (2026-11-06, `nico`). */
const FOIL_KEYFRAMES_CSS = `
@keyframes ${HOLO_IDLE_ANIMATION} { from { translate: -6% -4%; } to { translate: 6% 4%; } }
@keyframes ${entranceName("fade")} { from { opacity: 0; } to { opacity: 1; } }
@keyframes ${entranceName("rise")} { from { opacity: 0; translate: 0 70px; } 60% { opacity: 1; } to { opacity: 1; translate: 0 0; } }
@keyframes ${entranceName("pop")} { 0% { opacity: 0; scale: 0.6; } 55% { opacity: 1; scale: 1.06; } 78% { scale: 0.98; } 100% { opacity: 1; scale: 1; } }
@keyframes ${entranceName("flip")} { 0% { opacity: 0; scale: 0 1; } 30% { opacity: 1; } 55% { scale: 1.04 1; } 100% { opacity: 1; scale: 1 1; } }
@keyframes ${entranceName("drop")} { 0% { opacity: 0; translate: 0 -120px; } 45% { opacity: 1; translate: 0 0; } 62% { translate: 0 -18px; } 80% { translate: 0 0; } 90% { translate: 0 -5px; } 100% { opacity: 1; translate: 0 0; } }
@keyframes ${entranceName("spin")} { 0% { opacity: 0; scale: 0.4; rotate: -200deg; } 70% { opacity: 1; scale: 1.04; rotate: 8deg; } 100% { opacity: 1; scale: 1; rotate: 0deg; } }
@keyframes ${ENTRANCE_SHINE_ANIMATION} { from { translate: -130% 0; opacity: 1; } 85% { opacity: 1; } to { translate: 230% 0; opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  @keyframes ${HOLO_IDLE_ANIMATION} { from { translate: 0 0; } to { translate: 0 0; } }
  ${(["rise", "pop", "flip", "drop", "spin"] as EntranceStyle[]).map(s => `@keyframes ${entranceName(s)} { from { opacity: 0; } to { opacity: 1; } }`).join("\n  ")}
  @keyframes ${ENTRANCE_SHINE_ANIMATION} { from { opacity: 0; } to { opacity: 0; } }
}
`;
const FOIL_STYLE_ID = "mnemo-foil-keyframes";

/** Injects the keyframes once (same pattern as cardMotion.ts). */
export function useFoilKeyframes(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined" || document.getElementById(FOIL_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = FOIL_STYLE_ID;
    el.textContent = FOIL_KEYFRAMES_CSS;
    document.head.appendChild(el);
  }, [enabled]);
}

export function entranceDuration(fx: CardEffects | undefined): number {
  const d = fx?.entrance?.duration ?? ENTRANCE_DEFAULT_DURATION;
  return Math.max(0.3, Math.min(3, d));
}

/** The card's own entrance, or undefined = keep the profile's default reveal. */
export function entranceAnimation(fx: CardEffects | undefined, delayMs = 0): string | undefined {
  const s = fx?.entrance?.enabled ? fx.entrance.style ?? ENTRANCE_DEFAULT_STYLE : undefined;
  if (!s) return undefined;
  const easing = s === "fade" ? "ease" : s === "drop" ? "cubic-bezier(0.33,0,0.25,1)" : "cubic-bezier(0.16,1,0.3,1)";
  return `${entranceName(s)} ${entranceDuration(fx)}s ${easing} ${delayMs}ms backwards`;
}

/** The one-time light sweep after the entrance ("Destello"). */
export function entranceShineAnimation(fx: CardEffects | undefined, delayMs = 0): string | undefined {
  if (!fx?.entrance?.enabled || !fx.entrance.shine) return undefined;
  const after = delayMs + Math.round(entranceDuration(fx) * 1000 * 0.7);
  return `${ENTRANCE_SHINE_ANIMATION} 1.1s cubic-bezier(0.4,0,0.2,1) ${after}ms both`;
}

// ── Glitter / Strass ──────

export const GLITTER_COLORS: Record<NonNullable<NonNullable<CardEffects["glitter"]>["color"]>, string[]> = {
  white:   ["#ffffff", "#f1f4ff"],
  gold:    ["#fff4c2", "#ffd76a", "#ffffff"],
  pink:    ["#ffd1ec", "#ff7ac6", "#ffffff"],
  rainbow: ["#ff8ad8", "#ffe27a", "#8affd0", "#8ad1ff", "#c79aff"],
};
export const GLITTER_DEFAULT_AMOUNT = 0.5;
export const GLITTER_DEFAULT_SIZE = 0.4;
export type GlitterSpark = { x: number; y: number; size: number; delay: number; dur: number; color: string; star: boolean };
/**
 * Glitter v3 (2026-11-04: the v1 sparkles, refined — the user liked them
 * but not their big size; the "glitter inside the letters" v2 was dropped):
 * small four-point stars and fine glints over the text, twinkling at their
 * own pace. Deterministic per seed, so they don't jump between renders.
 */
/** The sparkles' colors: the chosen palette, or the old "Color" setting. */
export function glitterColors(fx: CardEffects | undefined, cardColors?: readonly string[]): string[] {
  const g = fx?.glitter;
  const own = GLITTER_COLORS[g?.color ?? "white"] ?? GLITTER_COLORS.white;
  const c = fxColors(g, own, cardColors);
  // A palette alone reads flat: a white glint among the colors keeps the sparkle.
  return g?.palette ? [...c, "#ffffff"] : c;
}
export function glitterSparkles(w: number, h: number, fx: CardEffects, seed: number, cardColors?: readonly string[]): GlitterSpark[] {
  const g = fx.glitter!;
  const amount = clamp01(g.amount ?? GLITTER_DEFAULT_AMOUNT);
  const n = Math.max(4, Math.round((w * h) / 70 * (0.15 + amount * 0.85)));
  const colors = glitterColors(fx, cardColors);
  const base = 3 + clamp01(g.size ?? GLITTER_DEFAULT_SIZE) * 6;   // 3–9 px
  const r = rand(seed * 7919 + 13);
  return Array.from({ length: Math.min(n, 30) }, () => {
    const star = r() < 0.45;
    return {
      x: r(), y: r(), size: (star ? base : base * 0.45) * (0.6 + r() * 0.6),
      delay: r() * 3, dur: 1.3 + r() * 1.8, color: colors[Math.floor(r() * colors.length)], star,
    };
  });
}

export const STRASS_COLORS: Record<NonNullable<NonNullable<CardEffects["strass"]>["color"]>, [string, string, string]> = {
  // highlight, body, deep
  crystal: ["#ffffff", "#dfe8ff", "#8b97b8"],
  pink:    ["#fff0f8", "#ff8cc9", "#a3245f"],
  gold:    ["#fff6d1", "#f2c14e", "#8a5a10"],
  rainbow: ["#ffffff", "#c9b8ff", "#5f6bd8"],
};
export const STRASS_DEFAULT_SIZE = 9;   // px
export const STRASS_DEFAULT_GAP = 0.5;  // 0-1
/** Rhinestone centers along the card's rounded border (inset `m` px). */
export function strassPoints(w: number, h: number, radius: number, size: number, gap: number): { x: number; y: number }[] {
  const m = size * 0.5 + 5;
  const r = Math.max(0, Math.min(radius - m * 0.6, (w - 2 * m) / 2, (h - 2 * m) / 2));
  const iw = w - 2 * m, ih = h - 2 * m;
  const straightW = iw - 2 * r, straightH = ih - 2 * r;
  const per = 2 * (straightW + straightH) + 2 * Math.PI * r;
  const step = size * (1.15 + clamp01(gap) * 1.6);
  const n = Math.max(8, Math.floor(per / step));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * per;
    const seg = (len: number) => { const inSeg = d <= len; if (!inSeg) d -= len; return inSeg; };
    // top, top-right arc, right, bottom-right arc, bottom, bottom-left arc, left, top-left arc
    if (seg(straightW)) { pts.push({ x: m + r + d, y: m }); continue; }
    const q = (Math.PI / 2) * r;
    if (seg(q)) { const a = -Math.PI / 2 + d / r; pts.push({ x: w - m - r + Math.cos(a) * r, y: m + r + Math.sin(a) * r }); continue; }
    if (seg(straightH)) { pts.push({ x: w - m, y: m + r + d }); continue; }
    if (seg(q)) { const a = d / r; pts.push({ x: w - m - r + Math.cos(a) * r, y: h - m - r + Math.sin(a) * r }); continue; }
    if (seg(straightW)) { pts.push({ x: w - m - r - d, y: h - m }); continue; }
    if (seg(q)) { const a = Math.PI / 2 + d / r; pts.push({ x: m + r + Math.cos(a) * r, y: h - m - r + Math.sin(a) * r }); continue; }
    if (seg(straightH)) { pts.push({ x: m, y: h - m - r - d }); continue; }
    const a = Math.PI + d / Math.max(r, 0.001);
    pts.push({ x: m + r + Math.cos(a) * r, y: m + r + Math.sin(a) * r });
  }
  return pts;
}
/** The stones' body colors: the chosen palette, or the old "Piedras" setting. */
export function strassColors(fx: CardEffects | undefined, cardColors?: readonly string[]): string[] {
  const st = fx?.strass;
  const id = st?.color ?? "crystal";
  const own = id === "rainbow" ? ["#ff9ad5", "#ffe08a", "#9affd0", "#9ad7ff", "#c8a6ff"] : [STRASS_COLORS[id]?.[1] ?? STRASS_COLORS.crystal[1]];
  return fxColors(st, own, cardColors);
}

/** Menu names of the glitter and stone colors. */
export const GLITTER_COLOR_LABEL: Record<string, string> = { white: "Blanco", gold: "Dorado", pink: "Rosa", rainbow: "Arcoíris" };
export const STRASS_COLOR_LABEL: Record<string, string> = { crystal: "Cristal", pink: "Rosa", gold: "Dorado", rainbow: "Arcoíris" };
