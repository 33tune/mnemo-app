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
  for (const s of subjects) undo.push(await stillImages(s, ratio), freezeAnimations(s));
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
  let canvas: HTMLCanvasElement;
  try {
    if (isWebKit()) await shoot().catch(() => null);
    canvas = await shoot();
  } finally {
    undo.forEach(u => u());
  }
  return { canvas, cardW, cardH, pad };
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
