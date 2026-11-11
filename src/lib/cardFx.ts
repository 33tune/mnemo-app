/**
 * Card effects added on 2026-11-11 (user-approved set), next to cardFoil.ts:
 * Canto metálico, Aura, Polvo de estrellas, Sello holográfico, the glitter
 * over the whole card / its border, and the card ANIMATIONS (what the card
 * does while it is on screen or when it is tapped — not its entrance).
 *
 * Same rules as the foil: every layer is painted once; what moves, moves
 * with `transform` / `opacity` only (CSS animations the compositor runs, or
 * a light layer — lightLayers.ts). Absent = off.
 *
 * Pure builders of styles and pictures (plus the hook that injects the
 * shared keyframes).
 */
import { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { lm } from "./lightLayers";
import { fxColors, loopColors, rgba, mixHex, cleanColors, FX_PALETTES } from "./fxPalette";
import { clamp01, rand, glitterColors, GLITTER_DEFAULT_AMOUNT, GLITTER_DEFAULT_SIZE, type FoilLayer, type FoilBox } from "./cardFoil";

const svgUri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const f1 = (v: number) => v.toFixed(1);

/** Named defaults the menu shows (no color literals in the menus). */
export const FX_WHITE = "#ffffff";
export const EDGE_CUSTOM_DEFAULT = "#d9a936";
export const DUST_AUTO = ["#ffffff", "#fff3c4", "#cfe6ff"] as const;
export const BORDER_RUN_AUTO = ["#ffffff", "#9ad7ff"] as const;

// ── Keyframes (injected once with the foil's, cardFoil › useFoilKeyframes) ──
export const FX_KEYFRAMES_CSS = `
@keyframes mnemo-breathe { 0%, 100% { scale: 1; } 50% { scale: var(--mo-breathe, 1.02); } }
@keyframes mnemo-sway { 0%, 100% { rotate: calc(var(--mo-sway, 1.5deg) * -1); } 50% { rotate: var(--mo-sway, 1.5deg); } }
@keyframes mnemo-heartbeat { 0%, 30%, 60%, 100% { scale: 1; } 15% { scale: var(--mo-beat, 1.04); } 45% { scale: var(--mo-beat2, 1.024); } }
@keyframes mnemo-border-run { to { rotate: 360deg; } }
@keyframes mnemo-twinkle { 0%, 100% { opacity: 0; } 40% { opacity: 1; } 60% { opacity: 0.85; } }
@keyframes mnemo-dust { to { translate: 0 var(--dust-h, -100px); } }
@keyframes mnemo-aura-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes mnemo-aura-spin { to { rotate: 360deg; } }
@media (prefers-reduced-motion: reduce) {
  @keyframes mnemo-breathe { from { scale: 1; } to { scale: 1; } }
  @keyframes mnemo-sway { from { rotate: 0deg; } to { rotate: 0deg; } }
  @keyframes mnemo-heartbeat { from { scale: 1; } to { scale: 1; } }
  @keyframes mnemo-border-run { from { rotate: 40deg; } to { rotate: 40deg; } }
  @keyframes mnemo-twinkle { from { opacity: 0.75; } to { opacity: 0.75; } }
  @keyframes mnemo-dust { from { translate: 0 0; } to { translate: 0 0; } }
  @keyframes mnemo-aura-pulse { from { opacity: 0.85; } to { opacity: 0.85; } }
  @keyframes mnemo-aura-spin { from { rotate: 0deg; } to { rotate: 0deg; } }
}
/* Off screen (or the device can't keep up): everything on the card waits. */
[data-fx-paused] * { animation-play-state: paused !important; }
[data-fxq="low"] [data-fx-heavy] { display: none !important; }
`;

/** Any of these on = the shared keyframes are needed. */
export function fxKeyframesOn(fx: CardEffects | undefined): boolean {
  const m = fx?.motion;
  return !!(fx?.aura?.enabled || fx?.dust?.enabled || fx?.glitter?.enabled || fx?.edge?.enabled || fx?.seal?.enabled || fx?.strass?.enabled
    || m?.breathe?.enabled || m?.sway?.enabled || m?.heartbeat?.enabled || m?.sweep?.enabled || m?.borderRun?.enabled
    || m?.ripple?.enabled || m?.jelly?.enabled || m?.spin?.enabled);
}

// ── Animations of the card ─────────────────────────────────────────────────
export const MOTION_DEFAULTS = {
  breathe: { amount: 0.4, speed: 1 }, sway: { amount: 0.35, speed: 1 }, heartbeat: { amount: 0.4, speed: 1 },
  sweep: { interval: 5 }, borderRun: { speed: 1, width: 3 }, jelly: { amount: 0.5 },
} as const;
const speedOf = (v: number | undefined) => Math.max(0.3, Math.min(3, v ?? 1));

/**
 * The looping animations as two lists: `outer` goes with Flotar (which owns
 * `transform`: these use the separate `scale` / `rotate` properties, so they
 * add up instead of fighting), `inner` on the hover-scale wrapper.
 */
export function motionAnimations(fx: CardEffects | undefined): { outer: string[]; inner: string[]; vars: Record<string, string> } {
  const m = fx?.motion, outer: string[] = [], inner: string[] = [], vars: Record<string, string> = {};
  if (m?.breathe?.enabled) {
    vars["--mo-breathe"] = (1 + 0.006 + clamp01(m.breathe.amount ?? MOTION_DEFAULTS.breathe.amount) * 0.044).toFixed(4);
    outer.push(`mnemo-breathe ${(4.2 / speedOf(m.breathe.speed)).toFixed(2)}s ease-in-out infinite`);
  }
  if (m?.sway?.enabled) {
    vars["--mo-sway"] = `${(0.4 + clamp01(m.sway.amount ?? MOTION_DEFAULTS.sway.amount) * 3.6).toFixed(2)}deg`;
    outer.push(`mnemo-sway ${(5 / speedOf(m.sway.speed)).toFixed(2)}s ease-in-out infinite`);
  }
  if (m?.heartbeat?.enabled) {
    const a = 0.012 + clamp01(m.heartbeat.amount ?? MOTION_DEFAULTS.heartbeat.amount) * 0.06;
    vars["--mo-beat"] = (1 + a).toFixed(4);
    vars["--mo-beat2"] = (1 + a * 0.6).toFixed(4);
    inner.push(`mnemo-heartbeat ${(1.5 / speedOf(m.heartbeat.speed)).toFixed(2)}s ease-in-out infinite`);
  }
  return { outer, inner, vars };
}

/** Destello que cruza: per-card keyframes (the sweep takes ~1.1 s, then waits
 * the rest of `interval`), like Flotar's own per-card keyframes. */
export function sweepKeyframes(cardId: string, fx: CardEffects | undefined): { css: string; animation: string } | null {
  const s = fx?.motion?.sweep;
  if (!s?.enabled) return null;
  const interval = Math.max(2, Math.min(20, s.interval ?? MOTION_DEFAULTS.sweep.interval));
  const p = Math.min(90, (1.1 / interval) * 100);
  const name = `mnemo-sweep-${cardId}`;
  return {
    css: `@keyframes ${name}{0%{translate:-130% 0;opacity:1}${p.toFixed(2)}%{translate:230% 0;opacity:1}${(p + 0.01).toFixed(2)}%,100%{translate:230% 0;opacity:0}}`
      + `@media (prefers-reduced-motion: reduce){@keyframes ${name}{from{opacity:0}to{opacity:0}}}`,
    animation: `${name} ${interval.toFixed(2)}s cubic-bezier(0.4,0,0.2,1) 1.2s infinite backwards`,
  };
}
export function sweepColor(fx: CardEffects | undefined): string {
  return cleanColors(fx?.motion?.sweep?.color ? [fx.motion.sweep.color] : [])[0] ?? "#ffffff";
}

/** Luz que recorre el borde: a comet of color turning behind the ring mask. */
export function borderRunSpec(fx: CardEffects | undefined, box: FoilBox, cardColors?: readonly string[]): { width: number; style: CSSProperties } | null {
  const b = fx?.motion?.borderRun;
  if (!b?.enabled) return null;
  const c = fxColors(b, BORDER_RUN_AUTO, cardColors);
  const d = Math.ceil(Math.hypot(box.w, box.h)) + 4;
  const tail = c.map((col, i) => `${col} ${(72 + (i / Math.max(1, c.length - 1)) * 22).toFixed(1)}%`).join(", ");
  return {
    width: Math.max(1, Math.min(8, b.width ?? MOTION_DEFAULTS.borderRun.width)),
    style: {
      position: "absolute", left: (box.w - d) / 2, top: (box.h - d) / 2, width: d, height: d, willChange: "transform",
      backgroundImage: `conic-gradient(from 0deg, ${rgba(c[0], 0)} 0%, ${rgba(c[0], 0)} 55%, ${tail}, #ffffff 98%, ${rgba(c[0], 0)} 100%)`,
      animation: `mnemo-border-run ${(4 / speedOf(b.speed)).toFixed(2)}s linear infinite`,
    },
  };
}

/** Press animations (Web Animations, run once on a tap; useCardInteractions). */
export function jellyFrames(fx: CardEffects | undefined): Keyframe[] {
  const a = 0.03 + clamp01(fx?.motion?.jelly?.amount ?? MOTION_DEFAULTS.jelly.amount) * 0.12;
  const s = (x: number, y: number) => ({ transform: `scale(${(1 + x * a).toFixed(4)}, ${(1 + y * a).toFixed(4)})` });
  return [s(0, 0), s(1, -1), s(-0.7, 0.7), s(0.4, -0.4), s(-0.18, 0.18), s(0, 0)];
}
export const SPIN_FRAMES: Keyframe[] = [
  { transform: "perspective(1100px) rotateY(0deg)" },
  { transform: "perspective(1100px) rotateY(360deg)" },
];
export const FX_PRESS_EVENT = "mnemo:fx-press";
export function rippleColor(fx: CardEffects | undefined): string {
  return cleanColors(fx?.motion?.ripple?.color ? [fx.motion.ripple.color] : [])[0] ?? "#ffffff";
}

// ── Aura ───────────────────────────────────────────────────────────────────
export const AURA_DEFAULTS = { intensity: 0.6, size: 0.5 } as const;
/** Soft blobs of color around the card (radial gradients: no blur filter). */
export function auraSpec(fx: CardEffects | undefined, box: FoilBox, cardColors?: readonly string[]):
  { wrap: CSSProperties; pulse: CSSProperties; blobs: CSSProperties } | null {
  const a = fx?.aura;
  if (!a?.enabled) return null;
  const colors = fxColors(a, FX_PALETTES.neon, cardColors);
  const out = Math.round((0.12 + clamp01(a.size ?? AURA_DEFAULTS.size) * 0.5) * Math.min(box.w, box.h));
  const side = Math.max(box.w, box.h) + out * 2;
  const blobs = colors.map((c, i) => {
    const t = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + Math.cos(t) * (50 * box.w / side) * 0.9, y = 50 + Math.sin(t) * (50 * box.h / side) * 0.9;
    return `radial-gradient(ellipse 44% 44% at ${f1(x)}% ${f1(y)}%, ${rgba(c, 0.95)} 0%, ${rgba(c, 0.45)} 40%, ${rgba(c, 0)} 100%)`;
  });
  return {
    wrap: {
      position: "absolute", left: (box.w - side) / 2, top: (box.h - side) / 2, width: side, height: side, pointerEvents: "none",
      opacity: 0.25 + clamp01(a.intensity ?? AURA_DEFAULTS.intensity) * 0.75,
    },
    pulse: { position: "absolute", inset: 0, ...(a.pulse ? { animation: "mnemo-aura-pulse 3.6s ease-in-out infinite" } : {}) },
    blobs: {
      position: "absolute", inset: 0, backgroundImage: blobs.join(", "), willChange: a.spin ? "transform" : undefined,
      ...(a.spin ? { animation: "mnemo-aura-spin 26s linear infinite" } : {}),
    },
  };
}

// ── Sparkles as pictures (glitter over the card / the border, dust) ────────
function starPath(x: number, y: number, R: number): string {
  const q = R * 0.16;
  return `M${f1(x)} ${f1(y - R)} Q${f1(x + q)} ${f1(y - q)} ${f1(x + R)} ${f1(y)} Q${f1(x + q)} ${f1(y + q)} ${f1(x)} ${f1(y + R)} Q${f1(x - q)} ${f1(y + q)} ${f1(x - R)} ${f1(y)} Q${f1(x - q)} ${f1(y - q)} ${f1(x)} ${f1(y - R)} Z`;
}
export type TwinkleLayer = { image: string; animation: string };
export const TWINKLE_LAYERS = 4;
/**
 * Glitter over the whole card or along its border: the sparkles are split in
 * a few still pictures that fade in and out at different paces (opacity
 * only), plus `lit` — every sparkle, brighter — shown where the light is.
 */
export function sparkleField(fx: CardEffects, box: FoilBox, scope: "card" | "border", cardColors?: readonly string[]): { layers: TwinkleLayer[]; lit: string } {
  const g = fx.glitter ?? { enabled: true };
  const colors = glitterColors(fx, cardColors);
  const amount = clamp01(g.amount ?? GLITTER_DEFAULT_AMOUNT);
  const base = 4 + clamp01(g.size ?? GLITTER_DEFAULT_SIZE) * 8;
  const band = Math.max(14, Math.min(box.w, box.h) * 0.1);
  const area = scope === "border" ? 2 * band * (box.w + box.h) : box.w * box.h;
  const count = Math.max(8, Math.min(150, Math.round((area / 1500) * (0.2 + amount * 1.1))));
  const r = rand(scope === "border" ? 911 : 517);
  const groups: string[][] = Array.from({ length: TWINKLE_LAYERS }, () => []);
  const lit: string[] = [];
  for (let i = 0; i < count; i++) {
    let x = r() * box.w, y = r() * box.h;
    if (scope === "border") {
      const d = r() * band, side = Math.floor(r() * 4);
      if (side === 0) y = d; else if (side === 1) y = box.h - d; else if (side === 2) x = d; else x = box.w - d;
    }
    const star = r() < 0.5, size = (star ? base : base * 0.42) * (0.55 + r() * 0.7), c = colors[Math.floor(r() * colors.length)];
    const shape = star
      ? `<path d='${starPath(x, y, size / 2)}' fill='${c}'/><circle cx='${f1(x)}' cy='${f1(y)}' r='${f1(size * 0.55)}' fill='${c}' opacity='0.16'/>`
      : `<circle cx='${f1(x)}' cy='${f1(y)}' r='${f1(size / 2)}' fill='${c}'/><circle cx='${f1(x)}' cy='${f1(y)}' r='${f1(size * 1.3)}' fill='${c}' opacity='0.18'/>`;
    groups[i % TWINKLE_LAYERS].push(shape);
    lit.push(`<path d='${starPath(x, y, size * 0.85)}' fill='white'/>`);
  }
  const svg = (inner: string[]) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${Math.round(box.w)}' height='${Math.round(box.h)}'>${inner.join("")}</svg>`);
  const durs = [2.1, 2.9, 3.7, 4.6];
  return {
    layers: groups.map((gp, i) => ({ image: svg(gp), animation: `mnemo-twinkle ${durs[i % durs.length]}s ease-in-out ${(-i * 0.83).toFixed(2)}s infinite` })),
    lit: svg(lit),
  };
}

export const DUST_DEFAULTS = { amount: 0.5, size: 0.4, speed: 1 } as const;
export type DustLayer = { style: CSSProperties; inner: CSSProperties };
/** Polvo de estrellas: three sheets of fine dots drifting up at different
 * speeds (the picture repeats, so the loop has no seam). */
export function dustLayers(fx: CardEffects | undefined, box: FoilBox, cardColors?: readonly string[]): DustLayer[] {
  const d = fx?.dust;
  if (!d?.enabled) return [];
  const colors = fxColors(d, DUST_AUTO, cardColors);
  const amount = clamp01(d.amount ?? DUST_DEFAULTS.amount), size = 0.5 + clamp01(d.size ?? DUST_DEFAULTS.size) * 1.6;
  const speed = speedOf(d.speed);
  const W = Math.round(box.w), H = Math.round(box.h);
  return [0, 1, 2].map(i => {
    const r = rand(300 + i * 71);
    const n = Math.max(3, Math.round(((W * H) / 22000) * (0.3 + amount * 1.7) * (i === 0 ? 1.3 : 1)));
    const dots: string[] = [];
    for (let k = 0; k < n; k++) {
      const x = r() * W, y = r() * H, rad = (0.5 + r() * 1.1) * size * (1 + i * 0.35), c = colors[Math.floor(r() * colors.length)], o = 0.45 + r() * 0.55;
      // Drawn twice (y and y+H) by the repeat; halo for a soft glow.
      dots.push(`<circle cx='${f1(x)}' cy='${f1(y)}' r='${f1(rad * 2.6)}' fill='${c}' opacity='${(o * 0.16).toFixed(2)}'/><circle cx='${f1(x)}' cy='${f1(y)}' r='${f1(rad)}' fill='${c}' opacity='${o.toFixed(2)}'/>`);
    }
    const image = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${dots.join("")}</svg>`);
    return {
      style: { position: "absolute", inset: 0, overflow: "hidden", animation: `mnemo-twinkle ${(5 + i * 2.3).toFixed(1)}s ease-in-out ${(-i * 1.7).toFixed(1)}s infinite` } as CSSProperties,
      inner: {
        position: "absolute", left: 0, top: 0, width: W, height: H * 2, backgroundImage: image, backgroundSize: `${W}px ${H}px`, backgroundRepeat: "repeat",
        willChange: "transform", ["--dust-h" as string]: `${-H}px`,
        animation: `mnemo-dust ${((22 + i * 13) / speed).toFixed(1)}s linear infinite`,
      } as CSSProperties,
    };
  });
}

// ── Canto metálico ─────────────────────────────────────────────────────────
export const EDGE_METALS: { id: NonNullable<NonNullable<CardEffects["edge"]>["metal"]>; label: string }[] = [
  { id: "gold", label: "Oro" }, { id: "silver", label: "Plata" }, { id: "chrome", label: "Cromo" }, { id: "rose", label: "Oro rosa" }, { id: "custom", label: "Mi color" },
];
const METALS: Record<string, [dark: string, mid: string, light: string]> = {
  gold:   ["#5c3d08", "#d9a936", "#fff3c4"],
  silver: ["#5d6676", "#b9c2d0", "#ffffff"],
  chrome: ["#1d2330", "#8e9bb3", "#f4f8ff"],
  rose:   ["#6e3a3a", "#e0a08f", "#ffe9df"],
};
export const EDGE_DEFAULT_WIDTH = 5;
export function edgeMetal(fx: CardEffects | undefined): [string, string, string] {
  const e = fx?.edge;
  if (e?.metal === "custom") {
    const c = cleanColors(e.color ? [e.color] : [])[0] ?? EDGE_CUSTOM_DEFAULT;
    return [mixHex(c, "#000000", 0.6), c, mixHex(c, "#ffffff", 0.75)];
  }
  return METALS[e?.metal ?? "gold"] ?? METALS.gold;
}
/** The rim: a still brushed metal, a sheen that turns with the light and a
 * hot spot that follows it — all behind a ring mask. */
export function edgeSpec(fx: CardEffects | undefined, box: FoilBox): { width: number; layers: FoilLayer[] } | null {
  const e = fx?.edge;
  if (!e?.enabled) return null;
  const [dark, mid, light] = edgeMetal(fx);
  const d = Math.ceil(Math.hypot(box.w, box.h)) + 4, r = Math.round(Math.max(box.w, box.h) * 0.42);
  return {
    width: Math.max(2, Math.min(14, e.width ?? EDGE_DEFAULT_WIDTH)),
    layers: [
      { key: "metal", style: { position: "absolute", inset: 0, backgroundImage: `linear-gradient(135deg, ${light} 0%, ${mid} 18%, ${dark} 38%, ${mid} 52%, ${light} 64%, ${mid} 78%, ${dark} 100%)` } },
      {
        key: "sheen", lm: lm.rot(0, 110, 80),
        style: {
          position: "absolute", left: (box.w - d) / 2, top: (box.h - d) / 2, width: d, height: d, willChange: "transform", mixBlendMode: "soft-light",
          backgroundImage: `conic-gradient(from 0deg, #ffffff, #000000 12%, #ffffff 25%, #000000 38%, #ffffff 50%, #000000 62%, #ffffff 75%, #000000 88%, #ffffff)`,
        },
      },
      {
        key: "hot", lm: lm.follow(box.w, box.h),
        style: {
          position: "absolute", left: -r, top: -r, width: 2 * r, height: 2 * r, willChange: "transform",
          backgroundImage: `radial-gradient(circle closest-side, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 35%, rgba(255,255,255,0) 100%)`,
        },
      },
    ],
  };
}

// ── Sello holográfico ──────────────────────────────────────────────────────
export const SEAL_DEFAULTS = { size: 46, text: "★", corner: "br" } as const;
export const SEAL_CORNERS: { id: NonNullable<NonNullable<CardEffects["seal"]>["corner"]>; label: string }[] = [
  { id: "tl", label: "Arriba izq." }, { id: "tr", label: "Arriba der." }, { id: "bl", label: "Abajo izq." }, { id: "br", label: "Abajo der." },
];
/** At most 3 characters, as plain text. */
export function sealText(fx: CardEffects | undefined): string {
  const t = (fx?.seal?.text ?? SEAL_DEFAULTS.text).trim();
  return Array.from(t).slice(0, 3).join("") || SEAL_DEFAULTS.text;
}
/** A scalloped disc (the edge of an authenticity seal), as a clip-path. */
export function sealClip(scallops = 18): string {
  const pts: string[] = [];
  const steps = scallops * 6;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2, rr = 47 + 3 * Math.cos(a * scallops);
    pts.push(`${f1(50 + Math.cos(a) * rr)}% ${f1(50 + Math.sin(a) * rr)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}
export function sealSpec(fx: CardEffects | undefined, box: FoilBox, cardColors?: readonly string[]):
  { wrap: CSSProperties; size: number; foil: CSSProperties; foilLm: string; sheen: CSSProperties; sheenLm: string; text: string } | null {
  const s = fx?.seal;
  if (!s?.enabled) return null;
  const size = Math.round(Math.max(30, Math.min(84, s.size ?? SEAL_DEFAULTS.size, Math.min(box.w, box.h) * 0.4)));
  const m = Math.round(Math.max(8, size * 0.24));
  const corner = s.corner ?? SEAL_DEFAULTS.corner;
  const pal = loopColors(fxColors(s, FX_PALETTES.rainbow, cardColors));
  return {
    size, text: sealText(fx),
    wrap: {
      position: "absolute", width: size, height: size, pointerEvents: "none",
      ...(corner[0] === "t" ? { top: m } : { bottom: m }), ...(corner[1] === "l" ? { left: m } : { right: m }),
      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))",
    },
    foil: { position: "absolute", inset: "-25%", willChange: "transform", backgroundImage: `conic-gradient(from 0deg, ${pal.join(", ")})` },
    foilLm: lm.rot(0, 260, 180),
    sheen: {
      position: "absolute", left: -size * 0.3, top: -size, width: size * 0.6, height: size * 3, willChange: "transform",
      backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)",
    },
    sheenLm: lm.band(size, 28),
  };
}

// ── Foto con profundidad ───────────────────────────────────────────────────
export const DEPTH_DEFAULT = 0.5;
/** The photo slides a few px against the pointer / the phone's tilt, a
 * little enlarged so its edge never shows. */
export function depthLm(fx: CardEffects | undefined, photoSize: number): string | undefined {
  const d = fx?.depth;
  if (!d?.enabled || photoSize <= 0) return undefined;
  const k = (0.02 + clamp01(d.amount ?? DEPTH_DEFAULT) * 0.07) * photoSize;
  return lm.par(k, 1 + (2 * k) / photoSize + 0.01);
}

const FX_STYLE_ID = "mnemo-fx-keyframes";
/** Injects the keyframes above once (same pattern as cardMotion.ts). */
export function useFxKeyframes(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined" || document.getElementById(FX_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = FX_STYLE_ID;
    el.textContent = FX_KEYFRAMES_CSS;
    document.head.appendChild(el);
  }, [enabled]);
}
