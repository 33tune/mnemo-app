/**
 * The pictures of the capture (cardSnapshot.ts): every <img> and every CSS
 * background picture under the captured nodes becomes, for the capture, a
 * small data URL at the size it is shown in the story — a multi-MB GIF or
 * photo would be embedded and decoded again in every video frame (and big
 * ones fail to draw at all inside the SVG picture).
 *
 * Animated GIF / WebP / APNG keep moving in the video: where the browser can
 * decode their frames (ImageDecoder), each frame is prepared once and the
 * capture shows the one for the video's time — like the phone shows it.
 * Elsewhere they are a still of their first frame.
 */

type Frames = { urls: string[]; ends: number[]; total: number };
type Slot = { frames: Frames; set: (url: string) => void };

export interface StillMedia {
  /** Something here moves (an animated picture). */
  animated: boolean;
  /** Shows the frames for time `t` (s). */
  at(t: number): void;
  undo(): void;
}

const MAX_SIDE = 2400;
/** Frames of an animated picture prepared at most (≈ the video's length). */
const MAX_FRAMES = 160;

export async function stillMedia(roots: HTMLElement[], ratio: number, seconds: number): Promise<StillMedia> {
  const undo: (() => void)[] = [];
  const slots: Slot[] = [];
  const cache = new Map<string, Promise<Frames | null>>();
  const framesFor = (src: string, scale: number) => {
    const key = `${src}@${scale.toFixed(3)}`;
    if (!cache.has(key)) cache.set(key, decodeFrames(src, scale, seconds));
    return cache.get(key)!;
  };
  const jobs: Promise<void>[] = [];
  for (const root of roots) {
    for (const img of [...root.querySelectorAll("img")]) {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:")) continue;
      jobs.push((async () => {
        const nat = await natural(src);
        if (!nat) return;
        const w = img.offsetWidth || img.getBoundingClientRect().width, h = img.offsetHeight || img.getBoundingClientRect().height;
        // object-fit is kept by the <img> itself: the whole picture at about
        // the size it is shown, never stretched.
        const scale = Math.min(1, Math.max((w * ratio) / nat.w, (h * ratio) / nat.h) * 1.05, MAX_SIDE / Math.max(nat.w, nat.h));
        const frames = await framesFor(src, scale);
        if (!frames) return;
        const old = { src: img.getAttribute("src"), srcset: img.getAttribute("srcset") };
        img.removeAttribute("srcset");
        const set = (url: string) => { if (img.getAttribute("src") !== url) img.setAttribute("src", url); };
        set(frames.urls[0]);
        await img.decode().catch(() => {});
        slots.push({ frames, set });
        undo.push(() => {
          if (old.srcset != null) img.setAttribute("srcset", old.srcset);
          if (old.src != null) img.setAttribute("src", old.src); else img.removeAttribute("src");
        });
      })());
    }
    for (const e of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      const bg = getComputedStyle(e).backgroundImage;
      if (!bg || !bg.includes("url(")) continue;
      const urls = [...bg.matchAll(/url\("?([^")]+)"?\)/g)].map(m => m[1]).filter(u => !u.startsWith("data:"));
      if (!urls.length) continue;
      jobs.push((async () => {
        const cs = getComputedStyle(e);
        const w = e.offsetWidth, h = e.offsetHeight;
        const prepared = await Promise.all(urls.map(async u => {
          const nat = await natural(u);
          if (!nat) return null;
          const tile = tileScale(cs.backgroundSize, w, h, nat.w, nat.h);
          const scale = Math.min(1, tile * ratio * 1.05, MAX_SIDE / Math.max(nat.w, nat.h));
          const frames = await framesFor(u, scale);
          return frames ? { u, frames } : null;
        }));
        const old = e.style.backgroundImage;
        let current = bg;
        // Each url is swapped for its frame; the rest (gradients) stays.
        const apply = (picks: Map<string, string>) => {
          let v = bg;
          for (const [u, url] of picks) v = v.split(u).join(url);
          if (v !== current) { e.style.backgroundImage = v; current = v; }
        };
        const picks = new Map<string, string>();
        for (const p of prepared) if (p) picks.set(p.u, p.frames.urls[0]);
        if (!picks.size) return;
        apply(picks);
        for (const p of prepared) {
          if (!p || p.frames.urls.length < 2) continue;
          slots.push({ frames: p.frames, set: url => { picks.set(p.u, url); apply(picks); } });
        }
        undo.push(() => { e.style.backgroundImage = old; });
      })());
    }
  }
  await Promise.all(jobs);
  const moving = slots.filter(s => s.frames.urls.length > 1);
  return {
    animated: moving.length > 0,
    at(t: number) {
      for (const s of moving) s.set(s.frames.urls[frameAt(s.frames, t)]);
    },
    undo() { while (undo.length) undo.pop()!(); },
  };
}

/** The frame showing at `t` (s), the animation looping. */
export function frameAt(f: { ends: number[]; total: number }, t: number): number {
  if (f.ends.length < 2 || f.total <= 0) return 0;
  const ms = ((t * 1000) % f.total + f.total) % f.total;
  let lo = 0, hi = f.ends.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (f.ends[mid] > ms) hi = mid; else lo = mid + 1; }
  return lo;
}

/** How a background picture is scaled in its box (background-size). */
function tileScale(size: string, w: number, h: number, nw: number, nh: number): number {
  const s = (size || "auto").trim().split(",")[0].trim();
  if (s === "cover") return Math.max(w / nw, h / nh);
  if (s === "contain") return Math.min(w / nw, h / nh);
  const [a, b] = s.split(/\s+/);
  const len = (v: string | undefined, box: number, nat: number) =>
    !v || v === "auto" ? null : v.endsWith("%") ? (parseFloat(v) / 100) * box / nat : parseFloat(v) / nat;
  const sx = len(a, w, nw), sy = len(b, h, nh);
  return sx ?? sy ?? 1;
}

const naturals = new Map<string, Promise<{ w: number; h: number } | null>>();
function natural(src: string) {
  if (!naturals.has(src)) {
    naturals.set(src, new Promise(resolve => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im.naturalWidth ? { w: im.naturalWidth, h: im.naturalHeight } : null);
      im.onerror = () => resolve(null);
      im.src = src;
    }));
  }
  return naturals.get(src)!;
}

type Decoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number; animated: boolean } | null };
  completed: Promise<void>;
  decode(o: { frameIndex: number }): Promise<{ image: VideoFrame }>;
  close(): void;
};
type DecoderCtor = { new (o: { data: ReadableStream | ArrayBuffer; type: string }): Decoder; isTypeSupported(t: string): Promise<boolean> };

async function decodeFrames(src: string, scale: number, seconds: number): Promise<Frames | null> {
  const ID = (globalThis as unknown as { ImageDecoder?: DecoderCtor }).ImageDecoder;
  if (ID) {
    try {
      const res = await fetch(src, { mode: "cors" });
      const type = (res.headers.get("content-type") || "").split(";")[0].trim();
      if (/^image\/(gif|webp|png|apng|avif)$/.test(type) && await ID.isTypeSupported(type)) {
        const dec = new ID({ data: await res.arrayBuffer(), type });
        await dec.tracks.ready;
        const tr = dec.tracks.selectedTrack;
        if (tr && tr.animated) {
          await dec.completed.catch(() => {});
          const count = tr.frameCount;
          const urls: string[] = [], ends: number[] = [];
          let total = 0;
          for (let i = 0; i < count && i < MAX_FRAMES && total < seconds * 1000 + 1; i++) {
            const { image } = await dec.decode({ frameIndex: i });
            const dur = Math.max(20, (image.duration ?? 100000) / 1000);
            urls.push(encode(image, image.displayWidth, image.displayHeight, scale));
            image.close();
            total += dur;
            ends.push(total);
          }
          dec.close();
          if (urls.length > 1) return { urls, ends, total };
          if (urls.length === 1) return { urls, ends: [1], total: 1 };
        }
        dec.close();
      }
    } catch { /* below: a still */ }
  }
  const im = await new Promise<HTMLImageElement | null>(resolve => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
  if (!im) return null;
  try { return { urls: [encode(im, im.naturalWidth, im.naturalHeight, scale)], ends: [1], total: 1 }; } catch { return null; }
}

/** A picture at `scale`, as a small data URL: JPEG when it has no
 * transparency, else WebP (PNG where WebP can't be written). */
function encode(src: CanvasImageSource, w: number, h: number, scale: number): string {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  if (opaque(c)) return c.toDataURL("image/jpeg", 0.93);
  const webp = c.toDataURL("image/webp", 0.95);
  return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/png");
}

function opaque(c: HTMLCanvasElement): boolean {
  try {
    const t = document.createElement("canvas");
    t.width = t.height = 48;
    const g = t.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(c, 0, 0, 48, 48);
    const d = g.getImageData(0, 0, 48, 48).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return false;
    return true;
  } catch { return false; }
}
