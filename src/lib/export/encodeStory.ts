/**
 * The story as a file: a PNG still (a screenshot), or an MP4 video (a screen
 * recording, made frame by frame: WebCodecs + mp4-muxer, exact, at 1080×1920).
 * Browsers without WebCodecs H.264 get the same frames played back into a
 * MediaRecorder in real time (MP4 where supported, else WebM).
 */
import { STORY_W, STORY_H, STORY_FPS, STORY_FRAMES } from "./storyRender";

/** Draws frame `i` (of STORY_FRAMES) on `ctx`. */
export type FramePainter = (ctx: CanvasRenderingContext2D, i: number) => Promise<void>;

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = STORY_W;
  c.height = STORY_H;
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/png", q?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob"))), type, q));
}

const BITRATE = 14_000_000;
const AVC_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42002a"];

async function pickAvc(): Promise<string | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of AVC_CODECS) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: STORY_W, height: STORY_H, bitrate: BITRATE, framerate: STORY_FPS });
      if (r.supported) return codec;
    } catch { /* next */ }
  }
  return null;
}

export interface StoryVideo { blob: Blob; ext: "mp4" | "webm"; }

export async function storyVideo(paint: FramePainter, onProgress?: (p: number) => void): Promise<StoryVideo> {
  const codec = await pickAvc();
  if (codec) {
    try { return { blob: await encodeWebCodecs(paint, codec, onProgress), ext: "mp4" }; } catch { /* fall back */ }
  }
  return recordRealtime(paint, onProgress);
}

async function encodeWebCodecs(paint: FramePainter, codec: string, onProgress?: (p: number) => void): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: STORY_W, height: STORY_H, frameRate: STORY_FPS }, fastStart: "in-memory" });
  let failure: unknown = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { failure = e; },
  });
  enc.configure({ codec, width: STORY_W, height: STORY_H, bitrate: BITRATE, framerate: STORY_FPS });
  const c = makeCanvas();
  const ctx = c.getContext("2d")!;
  const dur = 1_000_000 / STORY_FPS;
  for (let i = 0; i < STORY_FRAMES; i++) {
    if (failure) throw failure;
    await paint(ctx, i);
    const frame = new VideoFrame(c, { timestamp: Math.round(i * dur), duration: Math.round(dur) });
    enc.encode(frame, { keyFrame: i % (STORY_FPS * 2) === 0 });
    frame.close();
    onProgress?.((i + 1) / STORY_FRAMES);
    while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 5));
  }
  await enc.flush();
  enc.close();
  if (failure) throw failure;
  muxer.finalize();
  return new Blob([target.buffer], { type: "video/mp4" });
}

/** Every frame is made first (as JPEG, to keep memory low), then played
 * into a MediaRecorder at the story's frame rate. */
async function recordRealtime(paint: FramePainter, onProgress?: (p: number) => void): Promise<StoryVideo> {
  const c = makeCanvas();
  const ctx = c.getContext("2d")!;
  const frames: Blob[] = [];
  for (let i = 0; i < STORY_FRAMES; i++) {
    await paint(ctx, i);
    frames.push(await canvasToBlob(c, "image/jpeg", 0.95));
    onProgress?.(((i + 1) / STORY_FRAMES) * 0.7);
  }
  // Decoded a few frames ahead (all of them at once would be ~1 GB).
  const ahead = new Map<number, Promise<ImageBitmap | HTMLImageElement>>();
  const get = (i: number) => {
    for (let j = i; j < Math.min(frames.length, i + 8); j++) if (!ahead.has(j)) ahead.set(j, toBitmap(frames[j]));
    return ahead.get(i)!;
  };
  const first = await get(0);
  ctx.drawImage(first, 0, 0);
  const stream = (c as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(STORY_FPS);
  // H.264 first: Instagram and phones play it everywhere.
  const can = (m: string) => typeof MediaRecorder !== "undefined" && !!MediaRecorder.isTypeSupported?.(m);
  const mime = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(can) ?? "video/webm";
  const mp4 = mime.startsWith("video/mp4");
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: BITRATE });
  const parts: Blob[] = [];
  const stopped = new Promise<void>((resolve, reject) => {
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => resolve();
    rec.onerror = e => reject(e);
  });
  rec.start();
  const t0 = performance.now();
  for (let i = 0; i < frames.length; i++) {
    const bm = await get(i);
    const wait = t0 + (i * 1000) / STORY_FPS - performance.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    ctx.drawImage(bm, 0, 0);
    if ("close" in bm) bm.close();
    ahead.delete(i);
    onProgress?.(0.7 + ((i + 1) / frames.length) * 0.3);
  }
  await new Promise(r => setTimeout(r, 1000 / STORY_FPS));
  rec.stop();
  stream.getTracks().forEach(tr => tr.stop());
  await stopped;
  return { blob: new Blob(parts, { type: mp4 ? "video/mp4" : "video/webm" }), ext: mp4 ? "mp4" : "webm" };
}

async function toBitmap(b: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(b); } catch { /* below */ }
  }
  const url = URL.createObjectURL(b);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** Share sheet on phones (Instagram › Historia); download elsewhere. */
export async function shareOrDownload(blob: Blob, name: string, title: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    try { await nav.share({ files: [file], title }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  download(blob, name);
  return "downloaded";
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
