/**
 * The story as a file: a JPEG still, or an MP4 video (WebCodecs + mp4-muxer,
 * frame by frame, so it is exact and faster than real time). Browsers
 * without WebCodecs H.264 record the canvas in real time (MediaRecorder:
 * MP4 where supported, else WebM).
 */
import { drawStoryFrame, STORY_W, STORY_H, STORY_FPS, STORY_FRAMES, STORY_SECONDS, STILL_T, type StoryScene } from "./storyRender";

function makeCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = STORY_W;
  c.height = STORY_H;
  return c;
}

export async function storyImage(scene: StoryScene): Promise<Blob> {
  const c = makeCanvas();
  drawStoryFrame(c.getContext("2d")!, scene, STILL_T);
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.92));
}

const AVC_CODECS = ["avc1.640028", "avc1.4d0028", "avc1.42002a"];

async function pickAvc(): Promise<string | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of AVC_CODECS) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: STORY_W, height: STORY_H, bitrate: 6_000_000, framerate: STORY_FPS });
      if (r.supported) return codec;
    } catch { /* next */ }
  }
  return null;
}

export interface StoryVideo { blob: Blob; ext: "mp4" | "webm"; }

export async function storyVideo(scene: StoryScene, onProgress?: (p: number) => void): Promise<StoryVideo> {
  const codec = await pickAvc();
  if (codec) {
    try { return { blob: await encodeWebCodecs(scene, codec, onProgress), ext: "mp4" }; } catch { /* fall back */ }
  }
  return recordRealtime(scene, onProgress);
}

async function encodeWebCodecs(scene: StoryScene, codec: string, onProgress?: (p: number) => void): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width: STORY_W, height: STORY_H, frameRate: STORY_FPS }, fastStart: "in-memory" });
  let failure: unknown = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => { failure = e; },
  });
  enc.configure({ codec, width: STORY_W, height: STORY_H, bitrate: 6_000_000, framerate: STORY_FPS });
  const c = makeCanvas();
  const ctx = c.getContext("2d")!;
  const dur = 1_000_000 / STORY_FPS;
  for (let i = 0; i < STORY_FRAMES; i++) {
    if (failure) throw failure;
    drawStoryFrame(ctx, scene, i / STORY_FPS);
    const frame = new VideoFrame(c, { timestamp: Math.round(i * dur), duration: Math.round(dur) });
    enc.encode(frame, { keyFrame: i % (STORY_FPS * 2) === 0 });
    frame.close();
    onProgress?.((i + 1) / STORY_FRAMES);
    // Let the encoder (and the page) breathe.
    while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 5));
    if (i % 10 === 9) await new Promise(r => setTimeout(r, 0));
  }
  await enc.flush();
  enc.close();
  if (failure) throw failure;
  muxer.finalize();
  return new Blob([target.buffer], { type: "video/mp4" });
}

function recordRealtime(scene: StoryScene, onProgress?: (p: number) => void): Promise<StoryVideo> {
  return new Promise((resolve, reject) => {
    const c = makeCanvas();
    const ctx = c.getContext("2d")!;
    drawStoryFrame(ctx, scene, 0);
    const stream = (c as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(STORY_FPS);
    // H.264 first: Instagram and phones play it everywhere.
    const can = (m: string) => typeof MediaRecorder !== "undefined" && !!MediaRecorder.isTypeSupported?.(m);
    const mime = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(can) ?? "video/webm";
    const mp4 = mime.startsWith("video/mp4");
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 }); } catch (e) { reject(e); return; }
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => resolve({ blob: new Blob(parts, { type: mp4 ? "video/mp4" : "video/webm" }), ext: mp4 ? "mp4" : "webm" });
    rec.onerror = e => reject(e);
    rec.start();
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= STORY_SECONDS) { drawStoryFrame(ctx, scene, STORY_SECONDS); rec.stop(); stream.getTracks().forEach(tr => tr.stop()); return; }
      drawStoryFrame(ctx, scene, t);
      onProgress?.(t / STORY_SECONDS);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
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
