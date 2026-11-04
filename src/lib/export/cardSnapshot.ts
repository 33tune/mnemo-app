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

export async function snapshotCard(el: HTMLElement): Promise<CardSnapshot> {
  const { toCanvas } = await import("html-to-image");
  const cardW = el.offsetWidth, cardH = el.offsetHeight;
  // Stickers may stick out 25 % on each side; glows and shadows too.
  const pad = Math.round(Math.max(cardW, cardH) * 0.3);
  const scale = Math.min(STORY_CARD_BOX.w / cardW, STORY_CARD_BOX.h / cardH, 4);
  const ratio = Math.max(1, Math.min(3, scale));
  // Big GIFs / photos inside an SVG snapshot fail to draw (multi-MB data
  // URLs): each <img> becomes, just for the snapshot, a still at the size
  // it is shown. Restored right after (the dialog covers the page).
  const restore = await stillImages(el, ratio);
  let canvas: HTMLCanvasElement;
  try {
   canvas = await toCanvas(el, {
    pixelRatio: ratio,
    width: cardW + pad * 2,
    height: cardH + pad * 2,
    cacheBust: false,
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
    filter: node => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.dataset?.fx === "holo" || node.dataset?.fx === "glare") return false;
      if (node.hasAttribute("data-mnemo-chrome") || node.hasAttribute("data-export-skip")) return false;
      return true;
    },
   });
  } finally {
    restore();
  }
  return { canvas, cardW, cardH, pad };
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
