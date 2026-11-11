/**
 * Light layers (2026-11-11, performance): every effect that follows the
 * card's "light" (holo, glare, strass, edge, seal, photo depth) is built from
 * layers that are painted ONCE and then only MOVED — a `transform` the
 * compositor applies without repainting. Before, the gradients and the mask
 * read CSS variables and the browser repainted them on every frame (a holo
 * over the whole card ran at ~12 fps on a machine without a GPU).
 *
 * A layer says how it moves in `data-lm` (the strings built by `lm` below);
 * useCardInteractions calls `applyLight` on each frame of its eased loop and
 * writes each layer's transform. No CSS variable changes per frame, so no
 * style recalculation of the card either.
 *
 * Pure except `applyLight` (DOM writes).
 */

/** The light point on the card (0–1 each axis) and the pointer offset from
 * the card's center (-1…1; 0 when nobody is touching: never the idle drift). */
export type Light = { x: number; y: number; px: number; py: number };

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

export const lm = {
  /** A repeating gradient at `angleDeg` (CSS angle) with period `period` px:
   * slides along its own axis, `cx` / `cy` periods per unit of light travel,
   * wrapped to ±period/2 (so the layer only needs that much bleed). */
  shift(angleDeg: number, cx: number, cy: number, period: number): string {
    const a = (angleDeg * Math.PI) / 180;
    return `shift|${n(Math.sin(a))}|${n(-Math.cos(a))}|${n(cx * period)}|${n(cy * period)}|${n(period)}`;
  },
  /** A tiled texture (`pw`×`ph` px): slides `kx` / `ky` px per unit, wrapped per tile. */
  tile: (kx: number, ky: number, pw: number, ph: number) => `tile|${n(kx)}|${n(ky)}|${n(pw)}|${n(ph)}`,
  /** Centered on the light: for an element whose own center sits at the box's (0,0). */
  follow: (w: number, h: number) => `follow|${n(w)}|${n(h)}`,
  /** Undoes `follow` (the content of a window that follows the light stays put). */
  counter: (w: number, h: number) => `counter|${n(w)}|${n(h)}`,
  /** A band that follows the light on x only, kept at `rot` degrees. */
  band: (w: number, rot: number) => `band|${n(w)}|${n(rot)}`,
  /** Turns with the light: `base` + kx·dx + ky·dy degrees. */
  rot: (base: number, kx: number, ky: number) => `rot|${n(base)}|${n(kx)}|${n(ky)}`,
  /** Parallax against the pointer: `k` px at the card's edge, scaled by `s`. */
  par: (k: number, s: number) => `par|${n(k)}|${n(s)}`,
};

const wrap = (v: number, p: number) => (p > 0 ? v - p * Math.round(v / p) : v);
const px = (v: number) => `${Math.round(v * 100) / 100}px`;

/** The CSS transform of a layer for a light. Unknown specs = "none". */
export function lightTransform(spec: string, l: Light): string {
  const p = spec.split("|");
  const v = (i: number) => Number(p[i]) || 0;
  const dx = l.x - 0.5, dy = l.y - 0.5;
  switch (p[0]) {
    case "shift": {
      const t = wrap(dx * v(3) + dy * v(4), v(5));
      return `translate(${px(v(1) * t)}, ${px(v(2) * t)})`;
    }
    case "tile": return `translate(${px(wrap(dx * v(1), v(3)))}, ${px(wrap(dy * v(2), v(4)))})`;
    case "follow": return `translate(${px(l.x * v(1))}, ${px(l.y * v(2))})`;
    case "counter": return `translate(${px(-l.x * v(1))}, ${px(-l.y * v(2))})`;
    case "band": return `translate(${px(l.x * v(1))}, 0px) rotate(${n(v(2))}deg)`;
    case "rot": return `rotate(${n(v(1) + dx * v(2) + dy * v(3))}deg)`;
    case "par": return `translate(${px(-l.px * v(1))}, ${px(-l.py * v(1))}) scale(${n(v(2) || 1)})`;
    default: return "none";
  }
}

// ── The card's current light (read by the canvases: glitter) ───────────────
const lights = new WeakMap<Element, Light & { held: boolean }>();
export function cardLight(card: Element | null | undefined): (Light & { held: boolean }) | undefined {
  return card ? lights.get(card) : undefined;
}

/** Moves every light layer of the card. One querySelectorAll per call: the
 * card's subtree is small and React may have replaced layers since last time. */
export function applyLight(card: HTMLElement, l: Light, held: boolean): void {
  lights.set(card, { ...l, held });
  const els = card.querySelectorAll<HTMLElement>("[data-lm]");
  for (let i = 0; i < els.length; i++) {
    const t = lightTransform(els[i].dataset.lm ?? "", l);
    if (els[i].style.transform !== t) els[i].style.transform = t;
  }
}
