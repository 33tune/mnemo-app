/**
 * Compartir como historia (2026-11-04, redone the same day on the user's
 * feedback: "should look the same as the phone view — like a screenshot, and
 * the video like a screen recording; no new effects").
 *
 * The story is the PUBLIC PROFILE AS A PHONE SHOWS IT (mobileFit.ts ›
 * mobileView): a 9:16 phone screen of STORY_VIEW_W CSS px, rendered at
 * 1080×1920 (≈ 2.77 device px per CSS px, a real phone's density). The room's
 * wallpaper is laid out exactly like the public view lays it out (tied to the
 * room, at the view's scale, with the owner's blur / brightness / vignette),
 * and over it goes a capture of the real card — with the room's images and
 * texts that touch it, as the phone draws them — taken at full resolution
 * (cardSnapshot.ts). The video is the same capture, frame by frame, with the
 * card's own animations at each frame's time (exportClock.ts): nothing is
 * added or moved that the card does not do by itself.
 */
import { mobileView } from "@/lib/mobileFit";

export const STORY_W = 1080;
export const STORY_H = 1920;
export const STORY_FPS = 30;
export const STORY_SECONDS = 5;
export const STORY_FRAMES = STORY_FPS * STORY_SECONDS;
/** The phone screen the story is "taken" on (CSS px, 9:16). */
export const STORY_VIEW_W = 390;
export const STORY_VIEW_H = (STORY_VIEW_W * STORY_H) / STORY_W;
/** Device px per CSS px of that phone. */
export const STORY_DPR = STORY_W / STORY_VIEW_W;

export type Rect = { x: number; y: number; w: number; h: number };

export interface StoryView {
  /** Room px → phone CSS px, and the room's offset on the phone (mobileView). */
  s: number;
  tx: number;
  ty: number;
  /** The part of the room the phone shows (room px). */
  region: Rect;
  /** Story px per room px. */
  ratio: number;
}

/** Where the card (with its stickers, room px) sits on the story's phone. */
export function storyView(card: Rect): StoryView {
  const v = mobileView(STORY_VIEW_W, STORY_VIEW_H, card);
  return {
    ...v,
    region: { x: -v.tx / v.s, y: -v.ty / v.s, w: STORY_VIEW_W / v.s, h: STORY_VIEW_H / v.s },
    ratio: v.s * STORY_DPR,
  };
}

export interface StoryBg {
  color: string;
  image?: CanvasImageSource | null;
  imageW?: number;
  imageH?: number;
  /** Tu sala › Fondo: blur (px), brightness (%), vignette (0–100). */
  blur?: number;
  brightness?: number;
  vignette?: number;
}

/** The room's background as the public view draws it (CanvasBoard), once. */
export function storyBackground(bg: StoryBg, view: StoryView): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = STORY_W;
  c.height = STORY_H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg.color || "#0a0a0c";
  ctx.fillRect(0, 0, STORY_W, STORY_H);
  if (bg.image && bg.imageW && bg.imageH) {
    const pat = ctx.createPattern(bg.image, "repeat");
    if (pat) {
      // Each tile = the image at the view's scale; the pattern starts where
      // the room's origin lands on the phone (backgroundPosition tx ty).
      const k = view.s * STORY_DPR;
      pat.setTransform?.(new DOMMatrix([k, 0, 0, k, view.tx * STORY_DPR, view.ty * STORY_DPR]));
      ctx.save();
      const f: string[] = [];
      if (bg.blur && bg.blur > 0) f.push(`blur(${bg.blur * STORY_DPR}px)`);
      if (bg.brightness != null && bg.brightness !== 100) f.push(`brightness(${bg.brightness}%)`);
      if (f.length) ctx.filter = f.join(" ");
      ctx.fillStyle = pat;
      // Like the CSS layer: past the edges when blurred, so they stay solid.
      const m = bg.blur && bg.blur > 0 ? bg.blur * 2 * STORY_DPR : 0;
      ctx.fillRect(-m, -m, STORY_W + m * 2, STORY_H + m * 2);
      ctx.restore();
    }
  }
  if (bg.vignette && bg.vignette > 0) {
    // radial-gradient(ellipse at center, transparent X%, rgba(0,0,0,a) 100%)
    // — the ellipse reaches the corners (farthest-corner).
    ctx.save();
    ctx.translate(STORY_W / 2, STORY_H / 2);
    ctx.scale((STORY_W / 2) * Math.SQRT2, (STORY_H / 2) * Math.SQRT2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(Math.max(0, 85 - bg.vignette * 0.7) / 100, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${((bg.vignette / 100) * 0.92).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  return c;
}

/** A see-through card's frosted glass (cardSnapshot.ts › Backdrop). */
export type StoryBackdrop = { x: number; y: number; w: number; h: number; r: number; filter: string; alpha: number };

/** The background seen through the glass (filtered once per filter). */
const filtered = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function filteredRoom(background: HTMLCanvasElement, filter: string): HTMLCanvasElement {
  let byFilter = filtered.get(background);
  if (!byFilter) { byFilter = new Map(); filtered.set(background, byFilter); }
  let c = byFilter.get(filter);
  if (!c) {
    c = document.createElement("canvas");
    c.width = STORY_W;
    c.height = STORY_H;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(background, 0, 0);
    ctx.filter = filter;
    ctx.drawImage(background, 0, 0);
    byFilter.set(filter, c);
  }
  return c;
}

/** One frame: the background, the card's glass, then the capture of what
 * the phone shows. */
export function drawStoryFrame(ctx: CanvasRenderingContext2D, background: HTMLCanvasElement, shot: CanvasImageSource, glass: StoryBackdrop[] = []) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(background, 0, 0, STORY_W, STORY_H);
  for (const b of glass) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, b.r); else ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    ctx.globalAlpha = b.alpha;
    ctx.drawImage(filteredRoom(background, b.filter), 0, 0);
    ctx.restore();
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(shot, 0, 0, STORY_W, STORY_H);
}
