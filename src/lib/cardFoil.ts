/**
 * Collectible-card effects (2026-11-04, user request): Holográfico (a foil
 * sheen that moves with the light), Reflejo (a glare that follows it) and
 * the card's entrance animation on the public profile.
 *
 * The "light" is a point on the card (0–1 on each axis) that
 * useCardInteractions moves with the cursor, the finger or the phone's
 * gyroscope, and writes as the CSS vars --lx / --ly on the card (--la = 1
 * while the light is "held", 0 at rest). Everything here is plain CSS read
 * from those vars, so the export (cardExport.ts) can draw the same thing on a
 * canvas from the same palettes.
 *
 * Every field is optional and absent = off: no existing card changes.
 */
import { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";

export type HoloStyle = "rays" | "rainbow" | "etched" | "gold" | "cracked" | "refractor" | "mojo";
/** Where the foil goes. "bg" = under the content (the photo, texts and
 * icons stay clean, like a "reverse holo"). */
export type HoloScope = "card" | "bg" | "photo" | "border";
export type EntranceStyle = "fade" | "rise" | "pop" | "flip" | "drop" | "spin";

/** Finishes of real collectible cards (pokemon-cards-css for the TCG ones,
 * Panini Prizm / Topps Chrome for the sports-card ones). */
export const HOLO_STYLES: { id: HoloStyle; label: string }[] = [
  { id: "rays",      label: "Rayos" },
  { id: "rainbow",   label: "Arcoíris secreto" },
  { id: "etched",    label: "Relieve" },
  { id: "gold",      label: "Oro" },
  { id: "cracked",   label: "Hielo quebrado" },
  { id: "refractor", label: "Refractor" },
  { id: "mojo",      label: "Mojo" },
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

/** Main colors of each finish (also what the story export draws). */
export const HOLO_PALETTES: Record<HoloStyle, string[]> = {
  rays:      ["#ff7ab8", "#ffe27a", "#7affc1", "#7ad7ff", "#b47aff", "#ff7ab8"],
  rainbow:   ["#ff6b8b", "#ffd36b", "#9bff7a", "#6bf3ff", "#7d8bff", "#e07bff", "#ff6b8b"],
  etched:    ["#ff9ad5", "#a0f0ff", "#c8ff9a", "#ffe08a", "#ff9ad5"],
  gold:      ["#2a1a02", "#c9952c", "#fff3c4", "#e8b54a", "#4a3005", "#ffe08a", "#2a1a02"],
  cracked:   ["#9fe8ff", "#e3b8ff", "#fff6c2", "#b8ffd8", "#9fe8ff"],
  refractor: ["#ff5f6d", "#ffc371", "#fff27a", "#61ffb0", "#5fb8ff", "#b26bff", "#ff5f6d"],
  mojo:      ["#ff4fa3", "#ffb34f", "#4fffd2", "#4f8cff", "#c84fff", "#ff4fa3"],
};
/** How each finish mixes with a dark card (a light card always tints:
 * multiply — light added to white vanishes). */
export const HOLO_BLEND: Record<HoloStyle, CSSProperties["mixBlendMode"]> = {
  rays: "color-dodge", rainbow: "color-dodge", etched: "color-dodge", gold: "screen",
  cracked: "color-dodge", refractor: "color-dodge", mojo: "color-dodge",
};
/** Opacity at intensity 1 (dark card / light card). */
export const HOLO_STRENGTH: Record<HoloStyle, number> = { rays: 0.8, rainbow: 0.7, etched: 0.9, gold: 0.7, cracked: 0.65, refractor: 0.5, mojo: 0.45 };
export const HOLO_STRENGTH_LIGHT: Record<HoloStyle, number> = { rays: 0.5, rainbow: 0.42, etched: 0.6, gold: 0.6, cracked: 0.5, refractor: 0.45, mojo: 0.45 };

const svgUri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Deterministic pseudo-random (the textures look the same on every visit). */
function rand(seed: number) {
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
  const g = () => { const v = Math.round(70 + r() * 130); return `rgb(${v},${v},${v})`; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = pt[i][j], b = pt[i][j + 1], c = pt[i + 1][j + 1], d = pt[i + 1][j];
    const flip = r() > 0.5;
    const t1 = flip ? [a, b, c] : [a, b, d], t2 = flip ? [a, c, d] : [b, c, d];
    for (const t of [t1, t2]) polys.push(`<polygon points='${t.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ")}' fill='${g()}' stroke='rgba(255,255,255,0.35)' stroke-width='0.6'/>`);
  }
  return svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='${CRACKED_TILE}' height='${CRACKED_TILE}'>${polys.join("")}</svg>`);
})();

/** Etched: a fine engraved lattice, white lines on black (multiplied with
 * the rainbow, only the lines light up — Ultimate-Rare-like texture). */
const ETCHED_SVG = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='rgb(25,25,25)'/><path d='M0 8 L8 0 L16 8 L8 16 Z' fill='none' stroke='white' stroke-width='1.1'/><circle cx='8' cy='8' r='1.3' fill='white'/></svg>`);

/** Fine glitter noise (gold), static on the card. */
const SPARK_SVG = svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' seed='9'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 10 -7.5'/></filter><rect width='140' height='140' filter='url(%23s)'/></svg>`);

const LX = "var(--lx, 0.38)", LY = "var(--ly, 0.28)";
/** A moving layer: big, and slid against the light. */
const MOVE_POS = `calc(${LX} * 100%) calc(${LY} * 100%)`;

function stops(colors: string[], spanPct: number): string {
  return colors.map((c, i) => `${c} ${((i / (colors.length - 1)) * spanPct).toFixed(1)}%`).join(", ");
}

/** The layers of each finish: background-image / -size / -position /
 * -blend-mode, top layer first. Textures stay put; colors follow the light. */
export function holoLayers(style: HoloStyle): { image: string; size: string; position: string; blend: string } {
  const pal = HOLO_PALETTES[style];
  const L: { image: string; size: string; position: string; blend: string }[] = [];
  switch (style) {
    case "rays":
      // Regular holo: narrow vertical beams that sweep sideways.
      L.push({ image: `repeating-linear-gradient(90deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 14px, rgba(255,255,255,0.9) 18px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 34px)`, size: "100% 100%", position: `calc(${LX} * 60px) 0`, blend: "overlay" });
      L.push({ image: `repeating-linear-gradient(90deg, ${stops(pal, 30)})`, size: "300% 100%", position: MOVE_POS, blend: "normal" });
      break;
    case "rainbow":
      // Secret Rare: wide rainbow + fine diagonal lines.
      L.push({ image: `repeating-linear-gradient(-45deg, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 1px, rgba(0,0,0,0.35) 1px, rgba(0,0,0,0.35) 3px)`, size: "100% 100%", position: "0 0", blend: "overlay" });
      L.push({ image: `repeating-linear-gradient(115deg, ${stops(pal, 40)})`, size: "300% 300%", position: MOVE_POS, blend: "normal" });
      break;
    case "etched":
      L.push({ image: ETCHED_SVG, size: "16px 16px", position: "0 0", blend: "multiply" });
      L.push({ image: `repeating-linear-gradient(125deg, ${stops(pal, 35)})`, size: "300% 300%", position: MOVE_POS, blend: "normal" });
      break;
    case "gold":
      L.push({ image: SPARK_SVG, size: "140px 140px", position: "0 0", blend: "screen" });
      L.push({ image: `repeating-linear-gradient(110deg, ${stops(pal, 45)})`, size: "300% 300%", position: MOVE_POS, blend: "normal" });
      break;
    case "cracked":
      L.push({ image: CRACKED_SVG, size: `${CRACKED_TILE}px ${CRACKED_TILE}px`, position: "0 0", blend: "overlay" });
      L.push({ image: `repeating-linear-gradient(140deg, ${stops(pal, 30)})`, size: "300% 300%", position: MOVE_POS, blend: "normal" });
      break;
    case "refractor":
      // Rays of split light radiating from where the light is.
      L.push({ image: `repeating-conic-gradient(from 0deg at calc(${LX} * 100%) calc(${LY} * 100%), rgba(0,0,0,0) 0deg, ${pal[0]} 4deg, ${pal[2]} 7deg, rgba(0,0,0,0) 11deg, rgba(0,0,0,0) 18deg, ${pal[4]} 22deg, ${pal[5]} 25deg, rgba(0,0,0,0) 29deg, rgba(0,0,0,0) 36deg)`, size: "100% 100%", position: "0 0", blend: "normal" });
      break;
    case "mojo":
      // A multicolor swirl of rings around a point opposite the light.
      L.push({ image: `repeating-radial-gradient(circle at calc((1 - ${LX}) * 100%) calc((1 - ${LY}) * 100%), ${stops(pal, 14)})`, size: "100% 100%", position: "0 0", blend: "normal" });
      L.push({ image: `repeating-conic-gradient(from 45deg at 50% 50%, rgba(255,255,255,0.25) 0deg, rgba(0,0,0,0.25) 12deg, rgba(255,255,255,0.25) 24deg)`, size: "100% 100%", position: "0 0", blend: "overlay" });
      return {
        image: [L[1].image, L[0].image].join(", "), size: [L[1].size, L[0].size].join(", "),
        position: [L[1].position, L[0].position].join(", "), blend: [L[1].blend, L[0].blend].join(", "),
      };
  }
  return {
    image: L.map(l => l.image).join(", "), size: L.map(l => l.size).join(", "),
    position: L.map(l => l.position).join(", "), blend: L.map(l => l.blend).join(", "),
  };
}

/** Strongest around the light — the sheen of a real foil, not a print. */
const HOLO_MASK = `radial-gradient(circle at calc(${LX} * 100%) calc(${LY} * 100%), #000 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.18) 100%)`;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function holoOn(fx: CardEffects | undefined): boolean {
  return !!fx?.holo?.enabled && (fx.holo.intensity ?? HOLO_DEFAULT_INTENSITY) > 0;
}
export function glareOn(fx: CardEffects | undefined): boolean {
  return !!fx?.glare?.enabled && (fx.glare.intensity ?? GLARE_DEFAULT_INTENSITY) > 0;
}
/** The card has something that follows the light. */
export function lightEffectsOn(fx: CardEffects | undefined): boolean {
  return holoOn(fx) || glareOn(fx) || !!fx?.strass?.enabled;
}
/** The light drifts by itself (holo "Moverse solo"). */
export function lightIdleOn(fx: CardEffects | undefined): boolean {
  return (holoOn(fx) && fx?.holo?.idle !== false) || !!fx?.strass?.enabled;
}

/** Kept for the story export: the finish's colors as one angled gradient. */
export function holoGradient(style: HoloStyle): string {
  return `repeating-linear-gradient(115deg, ${stops(HOLO_PALETTES[style], 50)})`;
}

/**
 * The foil sheet, sized to the card (`w`×`h`) and placed at (-ox, -oy)
 * inside its clip (the whole card, the photo, or a strip of the border), so
 * the pattern lines up across the pieces.
 */
export function holoSheetStyle(fx: CardEffects, lightCard = false, box?: { w: number; h: number; ox?: number; oy?: number }): CSSProperties {
  const style = holoStyleOf(fx);
  const k = clamp01(fx.holo?.intensity ?? HOLO_DEFAULT_INTENSITY) * (lightCard ? HOLO_STRENGTH_LIGHT : HOLO_STRENGTH)[style];
  const l = holoLayers(style);
  return {
    position: "absolute", pointerEvents: "none",
    ...(box ? { left: -(box.ox ?? 0), top: -(box.oy ?? 0), width: box.w, height: box.h } : { inset: 0 }),
    backgroundImage: l.image, backgroundSize: l.size, backgroundPosition: l.position,
    backgroundBlendMode: l.blend as CSSProperties["backgroundBlendMode"],
    mixBlendMode: lightCard ? "multiply" : HOLO_BLEND[style],
    WebkitMaskImage: HOLO_MASK, maskImage: HOLO_MASK,
    // Stronger while the light is held (--la), never gone at rest.
    opacity: `calc(${k.toFixed(3)} * (0.75 + 0.25 * var(--la, 0)))` as unknown as number,
    transition: "opacity 0.3s ease",
  };
}

/** The border ring as 4 strips (inner corners square), in card px. */
export function borderStrips(w: number, h: number, ring: number): { x: number; y: number; w: number; h: number }[] {
  const t = Math.max(4, Math.min(ring, w / 3, h / 3));
  return [
    { x: 0, y: 0, w, h: t }, { x: 0, y: h - t, w, h: t },
    { x: 0, y: t, w: t, h: h - 2 * t }, { x: w - t, y: t, w: t, h: h - 2 * t },
  ];
}
export const holoRingWidth = (w: number, h: number) => Math.round(Math.max(10, Math.min(26, Math.min(w, h) * 0.07)));

/** The glare: a bright spot at the light and a soft streak through it. */
export function glareStyle(fx: CardEffects): CSSProperties {
  const k = clamp01(fx.glare?.intensity ?? GLARE_DEFAULT_INTENSITY);
  const size = Math.round(20 + clamp01(fx.glare?.size ?? GLARE_DEFAULT_SIZE) * 60);
  const at = "calc(var(--lx, 0.38) * 100%) calc(var(--ly, 0.28) * 100%)";
  return {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: [
      `radial-gradient(circle at ${at}, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) ${Math.round(size * 0.4)}%, rgba(255,255,255,0) ${size}%)`,
      `linear-gradient(115deg, rgba(255,255,255,0) calc(var(--lx, 0.38) * 100% - 16%), rgba(255,255,255,0.16) calc(var(--lx, 0.38) * 100%), rgba(255,255,255,0) calc(var(--lx, 0.38) * 100% + 16%))`,
    ].join(", "),
    mixBlendMode: "screen",
    opacity: `calc(${k.toFixed(3)} * (0.45 + 0.55 * var(--la, 0)))` as unknown as number,
    transition: "opacity 0.3s ease",
  };
}

// ── Entrance (public profile) ──────────────────────────────────────────────

export const HOLO_IDLE_ANIMATION = "mnemo-holo-idle";
export const ENTRANCE_SHINE_ANIMATION = "mnemo-entrance-shine";
const entranceName = (s: EntranceStyle) => `mnemo-enter-${s}`;

/** Uses the individual transform properties (translate / scale / rotate) so
 * it never fights the card's own `transform` (parallax + rotation). */
const FOIL_KEYFRAMES_CSS = `
@keyframes ${HOLO_IDLE_ANIMATION} { from { translate: -6% -4%; } to { translate: 6% 4%; } }
@keyframes ${entranceName("fade")} { from { opacity: 0; } to { opacity: 1; } }
@keyframes ${entranceName("rise")} { from { opacity: 0; translate: 0 70px; } 60% { opacity: 1; } to { opacity: 1; translate: 0 0; } }
@keyframes ${entranceName("pop")} { 0% { opacity: 0; scale: 0.6; } 55% { opacity: 1; scale: 1.06; } 78% { scale: 0.98; } 100% { opacity: 1; scale: 1; } }
@keyframes ${entranceName("flip")} { 0% { opacity: 0; scale: 0 1; } 30% { opacity: 1; } 55% { scale: 1.04 1; } 100% { opacity: 1; scale: 1 1; } }
@keyframes ${entranceName("drop")} { 0% { opacity: 0; translate: 0 -120px; } 45% { opacity: 1; translate: 0 0; } 62% { translate: 0 -18px; } 80% { translate: 0 0; } 90% { translate: 0 -5px; } 100% { opacity: 1; translate: 0 0; } }
@keyframes ${entranceName("spin")} { 0% { opacity: 0; scale: 0.4; rotate: -200deg; } 70% { opacity: 1; scale: 1.04; rotate: 8deg; } 100% { opacity: 1; scale: 1; rotate: 0deg; } }
@keyframes ${ENTRANCE_SHINE_ANIMATION} { from { translate: -130% 0; } to { translate: 130% 0; } }
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
export function glitterSparkles(w: number, h: number, fx: CardEffects, seed: number): GlitterSpark[] {
  const g = fx.glitter!;
  const amount = clamp01(g.amount ?? GLITTER_DEFAULT_AMOUNT);
  const n = Math.max(4, Math.round((w * h) / 70 * (0.15 + amount * 0.85)));
  const colors = GLITTER_COLORS[g.color ?? "white"] ?? GLITTER_COLORS.white;
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
/** The glints on the stones show where the light is. */
export const STRASS_GLINT_MASK = `radial-gradient(circle at calc(${LX} * 100%) calc(${LY} * 100%), #000 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.05) 42%)`;

/** Menu names of the glitter and stone colors. */
export const GLITTER_COLOR_LABEL: Record<string, string> = { white: "Blanco", gold: "Dorado", pink: "Rosa", rainbow: "Arcoíris" };
export const STRASS_COLOR_LABEL: Record<string, string> = { crystal: "Cristal", pink: "Rosa", gold: "Dorado", rainbow: "Arcoíris" };
