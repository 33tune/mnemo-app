/**
 * One picture of the real card (DOM → canvas, html-to-image), for the story
 * export (storyRender.ts). Without its holo / glare layers (drawn per frame
 * by the export) and without the editor's chrome; at rest (no parallax,
 * rotation or entrance), with room around it for stickers and glow.
 */
import type { StoryScene } from "./storyRender";
import { STORY_CARD_BOX } from "./storyRender";

export interface CardSnapshot {
  canvas: HTMLCanvasElement;
  cardW: number;
  cardH: number;
  pad: number;
}

/** Safari (every browser on an iPhone) decodes the pictures inside the SVG
 * snapshot only on a second draw: the first one comes out without images
 * (stickers, photos) and without the strass canvas. */
function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua));
}

const ROOM_EL = "[data-room-el]";
const touches = (a: DOMRect, b: DOMRect) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

export async function snapshotCard(el: HTMLElement): Promise<CardSnapshot> {
  const { toCanvas } = await import("html-to-image");
  const cardW = el.offsetWidth, cardH = el.offsetHeight;
  // Stickers may stick out 25 % on each side; glows and shadows too.
  const pad = Math.round(Math.max(cardW, cardH) * 0.3);
  const scale = Math.min(STORY_CARD_BOX.w / cardW, STORY_CARD_BOX.h / cardH, 4);
  const ratio = Math.max(1, Math.min(3, scale));

  // The room's images / free texts that touch the card go in the picture too
  // (on a phone they are drawn around it, and they are part of the look).
  const root = el.parentElement;
  const cardRect = el.getBoundingClientRect();
  const extras = root && el.offsetParent === root
    ? [...root.querySelectorAll<HTMLElement>(`:scope > ${ROOM_EL}`)].filter(n => touches(n.getBoundingClientRect(), cardRect))
    : [];
  const withRoom = extras.length > 0 && !!root;
  const subjects = [el, ...extras];

  // Big GIFs / photos inside an SVG snapshot fail to draw (multi-MB data
  // URLs): each <img> becomes, just for the snapshot, a still at the size
  // it is shown. Animations are frozen at the current frame (an SVG picture
  // would show them at their first frame: glitter invisible, entrance
  // offsets). Everything is restored right after (the dialog covers the page).
  const undo: (() => void)[] = [];
  for (const s of subjects) undo.push(await stillImages(s, ratio), await stillCanvases(s), freezeAnimations(s));
  // The card's own outer glow / shadow: WebKit (every iPhone browser) draws a
  // big box-shadow inside the SVG snapshot as a hard, shifted rectangle. They
  // are taken out of the picture and drawn here on a canvas, the same on any
  // browser (the inset ones, inside the card, stay in the picture).
  const outer = takeOuterShadows(el, cardRect, undo);
  const common = {
    pixelRatio: ratio,
    width: cardW + pad * 2,
    height: cardH + pad * 2,
    cacheBust: false,
  };
  const skip = (node: Node) => {
    if (!(node instanceof HTMLElement)) return true;
    if (node.dataset?.fx === "holo" || node.dataset?.fx === "glare") return false;
    if (node.hasAttribute("data-mnemo-chrome") || node.hasAttribute("data-export-skip")) return false;
    return true;
  };
  const shoot = () => withRoom
    ? toCanvas(root!, {
        ...common,
        // The room, shifted so the card sits `pad` in from the corner; only
        // the card and what touches it (no wallpaper, grid or chrome).
        style: {
          position: "absolute", left: "0", top: "0", margin: "0",
          insetInlineStart: "0", insetBlockStart: "0", insetInlineEnd: "auto", insetBlockEnd: "auto",
          width: `${root!.offsetWidth}px`, height: `${root!.offsetHeight}px`,
          inlineSize: `${root!.offsetWidth}px`, blockSize: `${root!.offsetHeight}px`,
          transform: `translate(${pad - el.offsetLeft}px, ${pad - el.offsetTop}px)`, transformOrigin: "0 0",
          translate: "none", scale: "none", rotate: "none", animation: "none",
          background: "transparent", backgroundImage: "none", backgroundColor: "transparent",
          filter: "none", overflow: "visible", clipPath: "none",
        } as Partial<CSSStyleDeclaration>,
        filter: node => {
          if (node instanceof HTMLElement && node.parentElement === root) return subjects.includes(node);
          return skip(node);
        },
      })
    : toCanvas(el, {
        ...common,
        // html-to-image sizes the node itself to width / height: the card keeps
        // its own size here and sits `pad` in from the corner.
        style: {
          // The clone carries every computed property, the logical insets too
          // (they come later and would win over left / top): set both.
          position: "absolute", left: `${pad}px`, top: `${pad}px`, margin: "0",
          insetInlineStart: `${pad}px`, insetBlockStart: `${pad}px`, insetInlineEnd: "auto", insetBlockEnd: "auto",
          width: `${cardW}px`, height: `${cardH}px`, inlineSize: `${cardW}px`, blockSize: `${cardH}px`,
          transform: "none", translate: "none", scale: "none", rotate: "none", animation: "none",
        } as Partial<CSSStyleDeclaration>,
        filter: skip,
      });
  let shot: HTMLCanvasElement;
  try {
    if (isWebKit()) await shoot().catch(() => null);
    shot = await shoot();
  } finally {
    undo.forEach(u => u());
  }
  const canvas = outer.shadows.length ? withShadows(shot, outer, { cardW, cardH, pad, ratio }) : shot;
  return { canvas, cardW, cardH, pad };
}

type OuterShadow = { color: string; x: number; y: number; blur: number; spread: number; alpha: number };

/** Splits a computed box-shadow list at the commas outside parentheses. */
export function splitShadowList(v: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of v) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** One computed shadow ("rgba(…) 0px 0px 24px 0px [inset]") → parts. */
export function parseShadow(part: string): { color: string; x: number; y: number; blur: number; spread: number; inset: boolean } | null {
  const inset = /\binset\b/.test(part);
  // Computed styles always give the color as rgb()/rgba() (sometimes hex).
  const colorMatch = part.match(/(rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/i);
  const color = colorMatch ? colorMatch[0] : "rgba(0,0,0,1)";
  const rest = part.replace(color, " ");
  const nums = [...rest.matchAll(/(-?[\d.]+)px/g)].map(m => parseFloat(m[1]));
  if (nums.length < 2) return null;
  return { color, x: nums[0], y: nums[1], blur: nums[2] ?? 0, spread: nums[3] ?? 0, inset };
}

/** Finds the card-sized layers with outer box-shadows, keeps their numbers
 * and leaves only the inset ones on them until `undo`. */
function takeOuterShadows(card: HTMLElement, cardRect: DOMRect, undo: (() => void)[]): { shadows: OuterShadow[]; radius: number } {
  const shadows: OuterShadow[] = [];
  let radius = 0;
  for (const e of card.querySelectorAll<HTMLElement>("*")) {
    const cs = getComputedStyle(e);
    if (!cs.boxShadow || cs.boxShadow === "none") continue;
    const r = e.getBoundingClientRect();
    if (Math.abs(r.width - cardRect.width) > 3 || Math.abs(r.height - cardRect.height) > 3) continue;
    const parts = splitShadowList(cs.boxShadow);
    const parsed = parts.map(parseShadow);
    if (!parsed.some(p => p && !p.inset)) continue;
    // Opacity of the layer and of its parents inside the card (glow pulse).
    let alpha = 1;
    for (let n: HTMLElement | null = e; n && n !== card; n = n.parentElement) alpha *= parseFloat(getComputedStyle(n).opacity) || 0;
    if (alpha > 0.01) {
      for (const p of parsed) if (p && !p.inset) shadows.push({ color: p.color, x: p.x, y: p.y, blur: p.blur, spread: p.spread, alpha });
      radius = Math.max(radius, parseFloat(cs.borderTopLeftRadius) || 0);
    }
    const old = e.style.boxShadow;
    const insetOnly = parts.filter((_, i) => parsed[i]?.inset).join(", ");
    e.style.boxShadow = insetOnly || "none";
    undo.push(() => { e.style.boxShadow = old; });
  }
  return { shadows, radius };
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The outer shadows (outside the card only, like CSS) under the picture. */
function withShadows(shot: HTMLCanvasElement, outer: { shadows: OuterShadow[]; radius: number },
  g: { cardW: number; cardH: number; pad: number; ratio: number }): HTMLCanvasElement {
  const W = shot.width, H = shot.height;
  const k = W / (g.cardW + g.pad * 2);   // device px per CSS px of the picture
  const sh = document.createElement("canvas");
  sh.width = W; sh.height = H;
  const c = sh.getContext("2d")!;
  const FAR = 100000;
  for (const s of outer.shadows) {
    c.save();
    c.globalAlpha = s.alpha;
    c.shadowColor = s.color;
    c.shadowBlur = s.blur * k;
    c.shadowOffsetX = (s.x + FAR) * k;
    c.shadowOffsetY = s.y * k;
    c.fillStyle = "#000";
    roundRectPath(c, (g.pad - s.spread - FAR) * k, (g.pad - s.spread) * k, (g.cardW + s.spread * 2) * k, (g.cardH + s.spread * 2) * k, (outer.radius + s.spread) * k);
    c.fill();
    c.restore();
  }
  // CSS never paints an outer shadow under the box itself.
  c.globalCompositeOperation = "destination-out";
  roundRectPath(c, g.pad * k, g.pad * k, g.cardW * k, g.cardH * k, outer.radius * k);
  c.fill();
  c.globalCompositeOperation = "source-over";
  c.drawImage(shot, 0, 0);
  return sh;
}

/** Inline-freezes every running animation under `root` (itself included) at
 * the frame it is showing; returns the undo. */
function freezeAnimations(root: HTMLElement): () => void {
  const els: Element[] = [root, ...root.querySelectorAll("*")];
  const undo: (() => void)[] = [];
  for (const e of els) {
    if (!(e instanceof HTMLElement || e instanceof SVGElement)) continue;
    const cs = getComputedStyle(e);
    if (!cs.animationName || cs.animationName === "none") continue;
    const st = (e as HTMLElement | SVGElement).style;
    const old = { animation: st.animation, opacity: st.opacity, transform: st.transform, translate: st.translate, scale: st.scale, rotate: st.rotate };
    const now = { opacity: cs.opacity, transform: cs.transform, translate: cs.translate, scale: cs.scale, rotate: cs.rotate };
    st.animation = "none";
    st.opacity = now.opacity;
    st.transform = now.transform === "none" ? "" : now.transform;
    st.translate = now.translate; st.scale = now.scale; st.rotate = now.rotate;
    undo.push(() => Object.assign(st, old));
  }
  return () => undo.forEach(u => u());
}

/** Canvases (glitter, the strass gems) become, just for the snapshot, an
 * <img> of their current frame: WebKit leaves canvases out of the SVG
 * picture, and a fixed image also comes out the same in both shots. */
async function stillCanvases(root: HTMLElement): Promise<() => void> {
  const undo: (() => void)[] = [];
  await Promise.all([...root.querySelectorAll("canvas")].map(async cv => {
    if (!cv.width || !cv.height || !cv.parentElement) return;
    let url: string;
    try { url = cv.toDataURL("image/png"); } catch { return; }
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.setAttribute("style", cv.getAttribute("style") ?? "");
    const cs = getComputedStyle(cv);
    img.style.width = cs.width;
    img.style.height = cs.height;
    if (cs.position === "static") img.style.display = "block";
    cv.parentElement.insertBefore(img, cv);
    const oldDisplay = cv.style.display;
    cv.style.display = "none";
    await img.decode().catch(() => {});
    undo.push(() => { img.remove(); cv.style.display = oldDisplay; });
  }));
  return () => undo.forEach(u => u());
}

async function stillImages(root: HTMLElement, ratio: number): Promise<() => void> {
  const imgs = [...root.querySelectorAll("img")].filter(i => i.currentSrc || i.src);
  const undo: (() => void)[] = [];
  await Promise.all(imgs.map(async img => {
    const src = img.currentSrc || img.src;
    if (src.startsWith("data:")) return;
    const r = img.getBoundingClientRect();
    const w = Math.max(1, Math.round(Math.min(1400, (img.offsetWidth || r.width) * ratio)));
    const h = Math.max(1, Math.round(Math.min(1400, (img.offsetHeight || r.height) * ratio)));
    const im = await loadImage(src);
    if (!im) return;
    try {
      const c = document.createElement("canvas");
      // object-fit is kept by the <img> itself: draw the whole picture at a
      // size close to how it is shown, never stretched.
      const k = Math.min(1, Math.max(w / im.naturalWidth, h / im.naturalHeight) * 1.05);
      c.width = Math.max(1, Math.round(im.naturalWidth * k));
      c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/png");
      const old = { src: img.getAttribute("src"), srcset: img.getAttribute("srcset") };
      img.removeAttribute("srcset");
      img.src = url;
      await img.decode().catch(() => {});
      undo.push(() => {
        if (old.srcset != null) img.setAttribute("srcset", old.srcset);
        if (old.src != null) img.setAttribute("src", old.src);
      });
    } catch { /* tainted or too big: leave it */ }
  }));
  return () => undo.forEach(u => u());
}

/** Loads an image for the canvas (CORS, so the canvas stays exportable). */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export type SceneInput = Omit<StoryScene, "card" | "snapW" | "snapH" | "cardW" | "cardH" | "pad">;

export function sceneFrom(snap: CardSnapshot, input: SceneInput): StoryScene {
  return { ...input, card: snap.canvas, snapW: snap.canvas.width, snapH: snap.canvas.height, cardW: snap.cardW, cardH: snap.cardH, pad: snap.pad };
}
