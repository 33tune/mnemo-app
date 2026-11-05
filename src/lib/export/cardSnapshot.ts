/**
 * The capture behind the story (storyRender.ts): a picture of the part of the
 * room a phone shows — the real card, plus the room's images and free texts
 * that touch it, nothing else (no wallpaper, grid or editor chrome) — at the
 * story's full resolution, like a screenshot. The card's holo / glare /
 * glitter / strass are in it as they are on screen.
 *
 * A capture session (`startCapture`) can take many frames: the card's CSS
 * animations are paused and set to each frame's time (Web Animations), and
 * its JS-driven motion is put at that time by the export clock
 * (exportClock.ts). Everything is restored at `done()`.
 */
import { setExportFrame, endExport } from "./exportClock";
import type { Rect } from "./storyRender";
import { stillMedia } from "./stillMedia";

/** Safari (every browser on an iPhone) decodes the pictures inside the SVG
 * snapshot only on a second draw: the first one comes out without images
 * (stickers, photos) and without the canvases. */
function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua));
}

const ROOM_EL = "[data-room-el]";
const touches = (a: DOMRect, b: DOMRect) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

/** A see-through card's frosted glass (backdrop-filter), in picture px: the
 * SVG picture cannot see what is behind the card (it drew a white panel), so
 * the story draws it — the room's background, filtered, inside the card. */
export interface Backdrop { x: number; y: number; w: number; h: number; r: number; filter: string; alpha: number }

export interface Frame {
  /** The picture: region × ratio px. */
  shot: HTMLCanvasElement;
  /** The card's frosted glass, where it is in this frame. */
  glass: Backdrop[];
}

/** Where the card element really is in the room (room px; the view may be
 * scaled or moved, and the editor may draw it apart from its stored x / y). */
export function cardRoomRect(el: HTMLElement): Rect {
  const root = el.parentElement!;
  const cardRect = el.getBoundingClientRect(), rootRect = root.getBoundingClientRect();
  const k = rootRect.width / (root.offsetWidth || rootRect.width) || 1;
  return {
    x: el.offsetParent === root ? el.offsetLeft : (cardRect.left - rootRect.left) / k,
    y: el.offsetParent === root ? el.offsetTop : (cardRect.top - rootRect.top) / k,
    w: el.offsetWidth,
    h: el.offsetHeight,
  };
}

export interface Capture {
  /** The frame at time `t` (s since the capture began). */
  frame(t: number): Promise<Frame>;
  /** Restores the page. */
  done(): void;
}

/**
 * `region` = the room rectangle to picture (room px), `ratio` = output px per
 * room px. The card element is `[data-profile-card]`, a child of the room.
 */
export async function startCapture(el: HTMLElement, region: Rect, ratio: number): Promise<Capture> {
  const { toCanvas, getFontEmbedCSS } = await import("html-to-image");
  const root = el.parentElement!;
  const cardRect = el.getBoundingClientRect();
  // The room's images / free texts that touch the card (the phone draws them).
  const extras = el.offsetParent === root
    ? [...root.querySelectorAll<HTMLElement>(`:scope > ${ROOM_EL}`)].filter(n => touches(n.getBoundingClientRect(), cardRect))
    : [];
  const subjects = [el, ...extras];
  const { x: cardX, y: cardY, w: cardW, h: cardH } = cardRoomRect(el);

  const undo: (() => void)[] = [];
  const restore = () => { while (undo.length) undo.pop()!(); };
  try {
    // Every picture at the size it is shown in the story (animated ones frame
    // by frame), as small data URLs: stillMedia.ts.
    // A still: only the first frame of animated pictures is prepared.
    const media = await stillMedia(subjects, ratio, 0);
    undo.push(() => media.undo());
    // Transitions still running (the editor's panel closing, a hover
    // ending) end now: the picture is the card at rest, not halfway.
    const isTransition = (a: Animation) => typeof CSSTransition !== "undefined" && a instanceof CSSTransition;
    for (const sub of [root, ...subjects]) {
      for (const a of sub.getAnimations?.({ subtree: sub !== root }) ?? []) if (isTransition(a)) { try { a.finish(); } catch { /* gone */ } }
    }
    // The card's own animations: paused, then set to each frame's time.
    const anims = subjects.flatMap(sub => sub.getAnimations?.({ subtree: true }) ?? []).filter(a => !isTransition(a));
    const running = anims.map(a => a.playState === "running");
    const base = anims.map(a => { a.pause(); return Number(a.currentTime ?? 0); });
    undo.push(() => anims.forEach((a, i) => { try { if (running[i]) a.play(); } catch { /* gone */ } }));
    undo.push(endExport);
    const animated = animatedElements(anims);
    const glassLayers = takeBackdrops(el, ratio, undo);
    const glassNow = (): Backdrop[] => {
      const cr = el.getBoundingClientRect();
      const kk = cr.width / (cardW || cr.width) || 1;
      return glassLayers.map(gl => {
        const rr = gl.el.getBoundingClientRect();
        return {
          x: (cardX - region.x + (rr.left - cr.left) / kk) * ratio, y: (cardY - region.y + (rr.top - cr.top) / kk) * ratio,
          w: cardW * ratio, h: cardH * ratio, r: gl.r, filter: gl.filter, alpha: gl.alpha,
        };
      });
    };
    const fontEmbedCSS = await getFontEmbedCSS(root).catch(() => "");
    let firstShot = true;
    // A frame with nothing moving is the previous frame (no CSS animation, no
    // canvas, the same light): it is not pictured again.
    const lightOf = () => [...el.querySelectorAll<HTMLElement>("[data-light]")].map(n => n.style.getPropertyValue("--lx") + n.style.getPropertyValue("--ly")).join();
    const still = anims.length === 0 && !media.animated && !subjects.some(sub => sub.querySelector("canvas"));
    let last: { light: string; pic: Frame } | null = null;

    const skip = (node: Node) => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.hasAttribute("data-mnemo-chrome") || node.hasAttribute("data-export-skip")) return false;
      return true;
    };
    const shoot = () => toCanvas(root, {
      pixelRatio: ratio,
      width: region.w,
      height: region.h,
      cacheBust: false,
      fontEmbedCSS,
      // The room, shifted so the region's corner is the picture's corner;
      // only the card and what touches it.
      style: {
        position: "absolute", left: "0", top: "0", margin: "0",
        insetInlineStart: "0", insetBlockStart: "0", insetInlineEnd: "auto", insetBlockEnd: "auto",
        width: `${root.offsetWidth}px`, height: `${root.offsetHeight}px`,
        inlineSize: `${root.offsetWidth}px`, blockSize: `${root.offsetHeight}px`,
        transform: `translate(${-region.x}px, ${-region.y}px)`, transformOrigin: "0 0",
        translate: "none", scale: "none", rotate: "none", animation: "none", transition: "none",
        background: "transparent", backgroundImage: "none", backgroundColor: "transparent",
        filter: "none", overflow: "visible", clipPath: "none",
      } as Partial<CSSStyleDeclaration>,
      filter: node => {
        if (node instanceof HTMLElement && node.parentElement === root) return subjects.includes(node);
        return skip(node);
      },
    });

    return {
      async frame(t: number) {
        anims.forEach((a, i) => { try { a.currentTime = base[i] + t * 1000; } catch { /* gone */ } });
        setExportFrame(t);
        media.at(t);
        const light = lightOf();
        if (still && last && last.light === light) return last.pic;
        const per: (() => void)[] = [];
        try {
          per.push(neutralParallax(subjects));
          per.push(freezeAnimations(animated));
          for (const sub of subjects) per.push(await stillCanvases(sub));
          // WebKit (every iPhone browser) draws a big outer box-shadow inside
          // the SVG snapshot as a hard, shifted rectangle: the card's own are
          // taken out and drawn on a canvas under the picture.
          const outer = takeOuterShadows(el, el.getBoundingClientRect(), per);
          if (firstShot && isWebKit()) await shoot().catch(() => null);
          firstShot = false;
          const shot = await shoot();
          const pic = outer.shadows.length
            ? withShadows(shot, outer, { x: cardX - region.x, y: cardY - region.y, w: cardW, h: cardH, ratio })
            : shot;
          const fr = { shot: pic, glass: glassNow() };
          last = { light, pic: fr };
          return fr;
        } finally {
          while (per.length) per.pop()!();
        }
      },
      done: restore,
    };
  } catch (e) {
    restore();
    throw e;
  }
}

/** ox / oy: where the layer is now vs the card (room px) — a floating card's layers move. */
type OuterShadow = { color: string; x: number; y: number; blur: number; spread: number; alpha: number; ox: number; oy: number };

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
      const k = cardRect.width / (card.offsetWidth || cardRect.width) || 1;
      const ox = (r.left - cardRect.left) / k, oy = (r.top - cardRect.top) / k;
      for (const p of parsed) if (p && !p.inset) shadows.push({ color: p.color, x: p.x, y: p.y, blur: p.blur, spread: p.spread, alpha, ox, oy });
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

/** The outer shadows (outside the card only, like CSS) under the picture.
 * `g` = the card's box in the picture (room px) and the picture's px per room px. */
function withShadows(shot: HTMLCanvasElement, outer: { shadows: OuterShadow[]; radius: number },
  g: { x: number; y: number; w: number; h: number; ratio: number }): HTMLCanvasElement {
  const W = shot.width, H = shot.height, k = g.ratio;
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
    roundRectPath(c, (g.x + s.ox - s.spread - FAR) * k, (g.y + s.oy - s.spread) * k, (g.w + s.spread * 2) * k, (g.h + s.spread * 2) * k, (outer.radius + s.spread) * k);
    c.fill();
    c.restore();
  }
  // CSS never paints an outer shadow under the box itself.
  c.globalCompositeOperation = "destination-out";
  for (const o of new Set(outer.shadows.map(s => `${s.ox},${s.oy}`))) {
    const [ox, oy] = o.split(",").map(Number);
    roundRectPath(c, (g.x + ox) * k, (g.y + oy) * k, g.w * k, g.h * k, outer.radius * k);
    c.fill();
  }
  c.globalCompositeOperation = "source-over";
  c.drawImage(shot, 0, 0);
  return sh;
}

/** Card-sized layers with a backdrop-filter: their filter (px scaled to the
 * picture), radius and opacity; the filter is turned off until `undo`. */
function takeBackdrops(card: HTMLElement, ratio: number, undo: (() => void)[]): { el: HTMLElement; r: number; filter: string; alpha: number }[] {
  const out: { el: HTMLElement; r: number; filter: string; alpha: number }[] = [];
  const cr = card.getBoundingClientRect();
  for (const e of [card, ...card.querySelectorAll<HTMLElement>("*")]) {
    const cs = getComputedStyle(e) as CSSStyleDeclaration & { webkitBackdropFilter?: string };
    const f = cs.backdropFilter && cs.backdropFilter !== "none" ? cs.backdropFilter : cs.webkitBackdropFilter;
    if (!f || f === "none") continue;
    const rr = e.getBoundingClientRect();
    if (Math.abs(rr.width - cr.width) <= 3 && Math.abs(rr.height - cr.height) <= 3) {
      // The layer's opacity (and its parents' inside the card) fades the glass too.
      let alpha = 1;
      for (let n: HTMLElement | null = e; n && n !== card.parentElement; n = n.parentElement) alpha *= parseFloat(getComputedStyle(n).opacity) || 0;
      out.push({ el: e, alpha, r: (parseFloat(cs.borderTopLeftRadius) || 0) * ratio, filter: f.replace(/(-?[\d.]+)px/g, (_, n) => `${parseFloat(n) * ratio}px`) });
    }
    const old = { a: e.style.backdropFilter, b: e.style.getPropertyValue("-webkit-backdrop-filter") };
    e.style.backdropFilter = "none";
    e.style.setProperty("-webkit-backdrop-filter", "none");
    undo.push(() => { e.style.backdropFilter = old.a; if (old.b) e.style.setProperty("-webkit-backdrop-filter", old.b); else e.style.removeProperty("-webkit-backdrop-filter"); });
  }
  return out;
}

/** The mouse parallax (CanvasBoard / useParallax: a translate in front of
 * each room element's own transform) at rest: the card and what touches it
 * where the owner placed them, as a phone shows them. Rotation stays. */
export function withoutParallax(transform: string): string {
  return transform.replace(/^\s*translate(?:3d)?\([^)]*\)\s*/, "").trim();
}
function neutralParallax(els: HTMLElement[]): () => void {
  const undo: (() => void)[] = [];
  for (const e of els) {
    const old = e.style.transform;
    if (!old) continue;
    const next = withoutParallax(old);
    if (next === old) continue;
    e.style.transform = next || "none";
    undo.push(() => { e.style.transform = old; });
  }
  return () => undo.forEach(u => u());
}

/** The elements the animations run on, and the properties they animate. */
function animatedElements(anims: Animation[]): Map<HTMLElement | SVGElement, Set<string>> {
  const out = new Map<HTMLElement | SVGElement, Set<string>>();
  for (const a of anims) {
    const eff = a.effect as KeyframeEffect | null;
    const target = eff?.target as HTMLElement | SVGElement | null | undefined;
    if (!target) continue;
    const props = out.get(target) ?? new Set<string>();
    try {
      for (const kf of eff!.getKeyframes()) {
        for (const key of Object.keys(kf)) {
          if (key === "offset" || key === "computedOffset" || key === "easing" || key === "composite") continue;
          props.add(key.startsWith("--") ? key : key.replace(/[A-Z]/g, m => "-" + m.toLowerCase()));
        }
      }
    } catch { /* keep what we have */ }
    out.set(target, props);
  }
  return out;
}

/** Inline-freezes each animated element at the value it shows now (the SVG
 * picture would restart its animations from their first frame); returns the
 * undo. Every animated property is kept (background-position of a shimmer,
 * a pulse's opacity, a letter's bounce…), then the animation is removed. */
function freezeAnimations(animated: Map<HTMLElement | SVGElement, Set<string>>): () => void {
  const undo: (() => void)[] = [];
  const base = ["opacity", "transform", "translate", "scale", "rotate"];
  for (const [e, props] of animated) {
    if (!e.isConnected) continue;
    const cs = getComputedStyle(e);
    const st = e.style;
    const names = [...new Set([...base, ...props])];
    const now = names.map(n => [n, cs.getPropertyValue(n)] as const);
    const old = names.map(n => [n, st.getPropertyValue(n), st.getPropertyPriority(n)] as const);
    const oldAnim = st.animation, oldTrans = st.transition;
    st.animation = "none";
    st.transition = "none";
    for (const [n, v] of now) if (v) st.setProperty(n, v);
    undo.push(() => {
      for (const [n, v, pr] of old) { if (v) st.setProperty(n, v, pr); else st.removeProperty(n); }
      st.animation = oldAnim;
      st.transition = oldTrans;
    });
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
    // WebP: much faster to write than PNG on every video frame (PNG where
    // the browser can't write WebP).
    try { url = cv.toDataURL("image/webp", 0.95); if (!url.startsWith("data:image/webp")) url = cv.toDataURL("image/png"); } catch { return; }
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

