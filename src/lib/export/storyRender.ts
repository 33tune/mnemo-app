/**
 * Compartir como historia (2026-11-04, user request): the card drawn on a
 * 1080×1920 canvas — the room behind it, the card as a collectible that
 * turns slowly while its holographic foil and glare follow a moving light —
 * for a still image or a short video.
 *
 * The card itself is ONE snapshot of the real DOM card (cardSnapshot.ts),
 * taken without its holo / glare layers: those are drawn here per frame
 * (same palettes and blends as cardFoil.ts), so the light can move in the
 * video. The rest (tilt, entrance, sweep) is plain 2D canvas math, so every
 * frame is deterministic: frame i is always the same picture.
 */
import type { CardEffects } from "@/types";
import { HOLO_PALETTES, HOLO_BLEND, HOLO_STRENGTH, HOLO_STRENGTH_LIGHT, holoStyleOf, HOLO_DEFAULT_INTENSITY, GLARE_DEFAULT_INTENSITY, GLARE_DEFAULT_SIZE, holoOn, glareOn, clamp01, type HoloStyle } from "@/lib/cardFoil";

export const STORY_W = 1080;
export const STORY_H = 1920;
export const STORY_FPS = 30;
export const STORY_SECONDS = 6;
export const STORY_FRAMES = STORY_FPS * STORY_SECONDS;
/** The largest box the card may take in the story. */
export const STORY_CARD_BOX = { w: 800, h: 1180 } as const;

export interface StoryScene {
  /** Snapshot of the card with `pad` CSS px of room around it (stickers, glow). */
  card: CanvasImageSource;
  snapW: number;
  snapH: number;
  /** The card's own size and the snapshot's padding, in CSS px. */
  cardW: number;
  cardH: number;
  pad: number;
  radius: number;
  fx: CardEffects;
  lightCard: boolean;
  bg: { color: string; image?: CanvasImageSource | null; imageW?: number; imageH?: number; brightness?: number };
  handle: string;
  logo?: CanvasImageSource | null;
}

export interface FrameParams {
  /** 0 → 1 while the card comes in. */
  intro: number;
  /** Turn (degrees) around the vertical / horizontal axis. */
  rotY: number;
  rotX: number;
  /** Light point on the card (0–1) and how "held" it is (0–1). */
  lx: number;
  ly: number;
  la: number;
  /** The one light sweep across the card: -1 = not yet / done, else 0–1. */
  sweep: number;
}

const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Where everything is at time `t` (s). The still image uses t = STILL_T. */
export function storyFrameParams(t: number, seconds = STORY_SECONDS): FrameParams {
  const intro = ease(t / 0.8);
  const p = (t / seconds) * Math.PI * 2;
  const live = clamp01((t - 0.4) / 0.8); // the motion fades in after the entrance
  const sweepT = (t - 0.9) / 1.0;
  return {
    intro,
    rotY: Math.sin(p) * 11 * live,
    rotX: Math.sin(p * 2 + 0.6) * 4 * live,
    lx: 0.5 + Math.sin(p) * 0.42,
    ly: 0.42 + Math.sin(p * 2 + 1) * 0.24,
    la: 0.6 + 0.4 * live,
    sweep: sweepT >= 0 && sweepT <= 1 ? sweepT : -1,
  };
}
/** A good moment for the still: turned a little, light up-left. */
export const STILL_T = STORY_SECONDS * 0.86;

/** Scale that fits the card (not its padding) in STORY_CARD_BOX. */
export function storyCardScale(cardW: number, cardH: number): number {
  return Math.min(STORY_CARD_BOX.w / cardW, STORY_CARD_BOX.h / cardH, 4);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The room's wallpaper repeats at its own size, like on the site — scaled
 * by the card's scale so wallpaper and card keep their proportion. */
function drawBackground(ctx: CanvasRenderingContext2D, bg: StoryScene["bg"], scale: number) {
  ctx.fillStyle = bg.color || "#0a0a0c";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  if (bg.image && bg.imageW && bg.imageH) {
    const pat = ctx.createPattern(bg.image, "repeat");
    if (pat) {
      const tw = bg.imageW * scale, th = bg.imageH * scale;
      // Centered on the story, like the room is centered on the card.
      pat.setTransform?.(new DOMMatrix([scale, 0, 0, scale, (STORY_W / 2) % tw - tw / 2, (STORY_H * 0.45) % th - th / 2]));
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, STORY_W, STORY_H);
    }
    const b = bg.brightness ?? 100;
    if (b < 100) { ctx.fillStyle = `rgba(0,0,0,${(1 - b / 100).toFixed(3)})`; ctx.fillRect(0, 0, STORY_W, STORY_H); }
  }
  // A soft vignette, so the card reads on any room.
  const v = ctx.createRadialGradient(STORY_W / 2, STORY_H * 0.46, STORY_H * 0.18, STORY_W / 2, STORY_H * 0.46, STORY_H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, STORY_W, STORY_H);
}

let scratch: HTMLCanvasElement | OffscreenCanvas | null = null;
function scratchCanvas(w: number, h: number): CanvasRenderingContext2D {
  if (!scratch) scratch = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : document.createElement("canvas");
  if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
  const c = scratch.getContext("2d") as CanvasRenderingContext2D;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  return c;
}

/** Deterministic sparkle positions (glitter / galaxy stars). */
function sparkles(n: number, seed: number): [number, number, number][] {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => [r(), r(), r()] as [number, number, number]);
}
const GLITTER = sparkles(260, 7);
const STARS = sparkles(70, 11);

/** The holo foil over a card of w×h (in story px), at the frame's light. */
function drawHolo(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, fx: CardEffects, light: boolean, f: FrameParams) {
  const style: HoloStyle = holoStyleOf(fx);
  const strength = (light ? HOLO_STRENGTH_LIGHT : HOLO_STRENGTH)[style] * 0.8;
  const k = clamp01(fx.holo?.intensity ?? HOLO_DEFAULT_INTENSITY) * strength * (0.7 + 0.3 * f.la);
  const W = Math.ceil(w), H = Math.ceil(h);
  const c = scratchCanvas(W, H);
  // Bands along 115°, shifted against the light (like the CSS sheet).
  const ang = (115 - 90) * Math.PI / 180;
  const len = Math.hypot(W, H);
  const cx = W / 2 + (0.5 - f.lx) * W * 0.36, cy = H / 2 + (0.5 - f.ly) * H * 0.36;
  const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
  const g = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  const pal = HOLO_PALETTES[style];
  const reps = 4;
  for (let i = 0; i <= reps * (pal.length - 1); i++) g.addColorStop(i / (reps * (pal.length - 1)), pal[i % (pal.length - 1)]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  if (style === "gold" || style === "cracked") {
    const pts = style === "gold" ? GLITTER : STARS;
    c.fillStyle = "#ffffff";
    for (const [px, py, pz] of pts) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(pz * 20 + f.lx * 9 + f.ly * 7));
      c.globalAlpha = tw;
      c.beginPath();
      c.arc(px * W, py * H, (style === "gold" ? 1.2 : 1.6) + pz * 1.6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  // Strongest around the light.
  c.globalCompositeOperation = "destination-in";
  const m = c.createRadialGradient(f.lx * W, f.ly * H, 0, f.lx * W, f.ly * H, Math.max(W, H));
  m.addColorStop(0, "rgba(0,0,0,1)");
  m.addColorStop(0.22, "rgba(0,0,0,0.6)");
  m.addColorStop(0.5, "rgba(0,0,0,0.2)");
  m.addColorStop(1, "rgba(0,0,0,0.2)");
  c.fillStyle = m;
  c.fillRect(0, 0, W, H);
  roundRect(c, 0, 0, W, H, r);
  c.fillStyle = "#000";
  c.fill();
  ctx.save();
  ctx.globalAlpha = k;
  ctx.globalCompositeOperation = (light ? "multiply" : HOLO_BLEND[style]) as GlobalCompositeOperation;
  ctx.drawImage(c.canvas, 0, 0, W, H, 0, 0, w, h);
  ctx.restore();
}

function drawGlare(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, fx: CardEffects, f: FrameParams) {
  const k = clamp01(fx.glare?.intensity ?? GLARE_DEFAULT_INTENSITY) * (0.45 + 0.55 * f.la);
  const size = (20 + clamp01(fx.glare?.size ?? GLARE_DEFAULT_SIZE) * 60) / 100;
  const rad = Math.hypot(w, h) * size * 0.7;
  ctx.save();
  roundRect(ctx, 0, 0, w, h, r);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(f.lx * w, f.ly * h, 0, f.lx * w, f.ly * h, rad);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.4, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The one light sweep after the card comes in. */
function drawSweep(ctx: CanvasRenderingContext2D, w: number, h: number, r: number, t: number) {
  ctx.save();
  roundRect(ctx, 0, 0, w, h, r);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  const x = -w * 0.6 + t * w * 2.2;
  const g = ctx.createLinearGradient(x - w * 0.3, 0, x + w * 0.3, h * 0.25);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawFooter(ctx: CanvasRenderingContext2D, scene: StoryScene, alpha: number) {
  const text = `myland.lol/${scene.handle}`;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "600 40px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(text).width;
  const logoW = scene.logo ? 54 : 0, gap = scene.logo ? 16 : 0;
  const padX = 34, h = 92;
  const w = tw + logoW + gap + padX * 2;
  const x = (STORY_W - w) / 2, y = STORY_H - 230;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(10,10,14,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (scene.logo) ctx.drawImage(scene.logo, x + padX, y + (h - 43) / 2, logoW, 43);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + padX + logoW + gap, y + h / 2 + 1);
  ctx.restore();
}

/** Draws frame `t` (seconds) of the story. */
export function drawStoryFrame(ctx: CanvasRenderingContext2D, scene: StoryScene, t: number, seconds = STORY_SECONDS) {
  const f = storyFrameParams(t, seconds);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const s = storyCardScale(scene.cardW, scene.cardH);
  drawBackground(ctx, scene.bg, s);

  const w = scene.cardW * s, h = scene.cardH * s, pad = scene.pad * s, r = scene.radius * s;
  const cx = STORY_W / 2, cy = STORY_H * 0.45 + (1 - f.intro) * 140;
  const ry = f.rotY * Math.PI / 180, rx = f.rotX * Math.PI / 180;
  const grow = 0.9 + 0.1 * f.intro;
  // A turned card, in 2D: narrower on the turning axis, a little sheared.
  ctx.globalAlpha = f.intro;
  ctx.setTransform(Math.cos(ry) * grow, Math.sin(ry) * 0.12 * grow, Math.sin(rx) * -0.06 * grow, Math.cos(rx) * grow, cx, cy);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(scene.card, 0, 0, scene.snapW, scene.snapH, -pad, -pad, w + pad * 2, h + pad * 2);
  if (holoOn(scene.fx)) drawHolo(ctx, w, h, r, scene.fx, scene.lightCard, f);
  if (glareOn(scene.fx)) drawGlare(ctx, w, h, r, scene.fx, f);
  if (f.sweep >= 0) drawSweep(ctx, w, h, r, f.sweep);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  drawFooter(ctx, scene, f.intro);
  ctx.restore();
}
