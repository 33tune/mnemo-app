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

export type HoloStyle = "rainbow" | "glitter" | "metal" | "galaxy";
export type EntranceStyle = "fade" | "rise" | "pop" | "flip" | "drop" | "spin";

export const HOLO_STYLES: { id: HoloStyle; label: string }[] = [
  { id: "rainbow", label: "Arcoíris" },
  { id: "glitter", label: "Glitter" },
  { id: "metal",   label: "Metal" },
  { id: "galaxy",  label: "Galaxia" },
];
export const ENTRANCE_STYLES: { id: EntranceStyle; label: string }[] = [
  { id: "fade", label: "Aparecer" },
  { id: "rise", label: "Subir" },
  { id: "pop",  label: "Pop" },
  { id: "flip", label: "Voltear" },
  { id: "drop", label: "Caer" },
  { id: "spin", label: "Girar" },
];

export const HOLO_DEFAULT_INTENSITY = 0.6;
export const GLARE_DEFAULT_INTENSITY = 0.6;
export const GLARE_DEFAULT_SIZE = 0.55;
export const ENTRANCE_DEFAULT_DURATION = 0.9;
export const ENTRANCE_DEFAULT_STYLE: EntranceStyle = "rise";
/** The editor's "Ver entrada" asks the card to replay its entrance. */
export const ENTRANCE_PREVIEW_EVENT = "mnemo:entrance-preview";
/** Where the light rests when nobody moves it: up and to the left. */
export const LIGHT_REST = { x: 0.38, y: 0.28 } as const;

/** Color stops (also drawn by the export). */
export const HOLO_PALETTES: Record<HoloStyle, string[]> = {
  rainbow: ["#ff6b8b", "#ffd36b", "#9bff7a", "#6bf3ff", "#7d8bff", "#e07bff", "#ff6b8b"],
  glitter: ["#ffd1f0", "#fff3b0", "#c6ffd9", "#b7f1ff", "#d9c6ff", "#ffd1f0"],
  metal:   ["#ffffff", "#9aa1ad", "#eef1f5", "#6f7684", "#ffffff"],
  galaxy:  ["#3b1d8f", "#c04bff", "#1e5bff", "#ff5fb8", "#3b1d8f"],
};
/** How each foil mixes with the card under it: on a dark card the light
 * adds (dodge / screen); on a light card it tints (multiply), or it would
 * vanish into the white. */
export const HOLO_BLEND: Record<HoloStyle, CSSProperties["mixBlendMode"]> = {
  rainbow: "color-dodge", glitter: "color-dodge", metal: "screen", galaxy: "screen",
};
/** Max opacity of the foil at intensity 1 (dark card / light card). */
const HOLO_STRENGTH: Record<HoloStyle, number> = { rainbow: 0.6, glitter: 0.65, metal: 0.5, galaxy: 0.65 };
const HOLO_STRENGTH_LIGHT: Record<HoloStyle, number> = { rainbow: 0.38, glitter: 0.42, metal: 0.45, galaxy: 0.35 };

const SPARKLE_DATA_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='1' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 9 -6.2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23s)'/%3E%3C/svg%3E\")";
const STARS_DATA_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='white'%3E%3Ccircle cx='12' cy='18' r='0.9'/%3E%3Ccircle cx='70' cy='9' r='0.6'/%3E%3Ccircle cx='101' cy='44' r='1.1'/%3E%3Ccircle cx='38' cy='61' r='0.7'/%3E%3Ccircle cx='88' cy='92' r='0.8'/%3E%3Ccircle cx='19' cy='103' r='1'/%3E%3Ccircle cx='57' cy='112' r='0.6'/%3E%3Ccircle cx='112' cy='112' r='0.7'/%3E%3C/g%3E%3C/svg%3E\")";

const HOLO_MASK = "radial-gradient(circle at calc((0.25 + var(--lx, 0.38) * 0.5) * 100%) calc((0.25 + var(--ly, 0.28) * 0.5) * 100%), #000 0%, rgba(0,0,0,0.6) 22%, rgba(0,0,0,0.2) 50%)";

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function holoOn(fx: CardEffects | undefined): boolean {
  return !!fx?.holo?.enabled && (fx.holo.intensity ?? HOLO_DEFAULT_INTENSITY) > 0;
}
export function glareOn(fx: CardEffects | undefined): boolean {
  return !!fx?.glare?.enabled && (fx.glare.intensity ?? GLARE_DEFAULT_INTENSITY) > 0;
}
/** The card has something that follows the light. */
export function lightEffectsOn(fx: CardEffects | undefined): boolean {
  return holoOn(fx) || glareOn(fx);
}

/** The foil's bands: a repeating gradient across the card, at an angle. */
export function holoGradient(style: HoloStyle): string {
  const c = HOLO_PALETTES[style];
  const step = 100 / (c.length - 1);
  const stops = c.map((col, i) => `${col} ${(i * step * 0.5).toFixed(1)}%`).join(", ");
  return `repeating-linear-gradient(115deg, ${stops})`;
}

/**
 * The foil layer: an oversized sheet (inset -50%) slid against the light, so
 * the bands sweep across the card as the light moves. `idle` = a slow drift
 * when nobody moves it (also what the export shows).
 */
export function holoSheetStyle(fx: CardEffects, lightCard = false): CSSProperties {
  const style = fx.holo?.style ?? "rainbow";
  const k = clamp01(fx.holo?.intensity ?? HOLO_DEFAULT_INTENSITY) * (lightCard ? HOLO_STRENGTH_LIGHT : HOLO_STRENGTH)[style];
  const images = [holoGradient(style)];
  const sizes = ["100% 100%"];
  if (style === "glitter") { images.unshift(SPARKLE_DATA_URI); sizes.unshift("160px 160px"); }
  if (style === "galaxy") { images.unshift(STARS_DATA_URI); sizes.unshift("120px 120px"); }
  return {
    position: "absolute", inset: "-50%", pointerEvents: "none",
    backgroundImage: images.join(", "),
    backgroundSize: sizes.join(", "),
    mixBlendMode: lightCard ? "multiply" : HOLO_BLEND[style],
    // Strongest around the light, fading away from it — the sheen of a real
    // foil, not a printed rainbow. On the sheet itself (a mask on a parent
    // would isolate it and break the blend); the sheet is twice the card,
    // so the card's light point sits at 25 % + half of it.
    WebkitMaskImage: HOLO_MASK, maskImage: HOLO_MASK,
    // Stronger while the light is held (--la), never gone at rest.
    opacity: `calc(${k.toFixed(3)} * (0.7 + 0.3 * var(--la, 0)))` as unknown as number,
    transform: "translate(calc((0.5 - var(--lx, 0.38)) * 18%), calc((0.5 - var(--ly, 0.28)) * 18%))",
    transition: "opacity 0.3s ease",
    animation: fx.holo?.idle === false ? undefined : `${HOLO_IDLE_ANIMATION} 7s ease-in-out infinite alternate`,
  };
}

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
