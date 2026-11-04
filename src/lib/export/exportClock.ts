/**
 * The export clock (2026-11-04): while a story video is recorded, the card's
 * own JS-driven motion (the drifting light, the glitter twinkle, the strass
 * gems) stops following the real clock and is drawn, synchronously, at the
 * time of the frame being captured. CSS animations are driven the same way
 * by the recorder (Web Animations: paused, currentTime per frame). So every
 * frame of the video is the card exactly as it looks at that moment — a
 * screen recording, frame by frame, at full quality.
 *
 * While a capture runs, mouse / finger / gyroscope input is ignored, the tilt
 * is at rest and the light is where the card puts it by itself.
 */
type FrameFn = (t: number) => void;

let frameT: number | null = null;
/** "light" runs first (it sets the light the painters read), then "paint". */
const listeners = { light: new Set<FrameFn>(), paint: new Set<FrameFn>() };

/** A capture is running (input ignored, own clocks stopped). */
export function exportActive(): boolean {
  return frameT != null;
}

/** Register a synchronous painter for capture frames; returns the unsubscribe. */
export function onExportFrame(fn: FrameFn, phase: keyof typeof listeners = "paint"): () => void {
  listeners[phase].add(fn);
  if (frameT != null) fn(frameT);
  return () => { listeners[phase].delete(fn); };
}

/** Puts every registered painter at time `t` (seconds since the capture began). */
export function setExportFrame(t: number): void {
  frameT = t;
  for (const set of [listeners.light, listeners.paint]) {
    set.forEach(fn => { try { fn(t); } catch { /* one painter never stops the capture */ } });
  }
}

/** Back to the real clock. */
export function endExport(): void {
  frameT = null;
}
