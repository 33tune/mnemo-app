"use client";
/**
 * Glitter v4 (2026-11-04): small sparkles that twinkle over a text — four-
 * point stars and fine glints, spread over the text itself (measured with a
 * Range of the row's text, re-measured when it changes or a font loads).
 * Placed in a box over the row (its previous sibling), so the row's clip
 * never cuts a sparkle.
 *
 * Drawn on ONE small canvas per text (v3 used up to 30 animated spans per
 * text: on a phone that was hundreds of composited layers and it lagged, and
 * Safari drew the clipped stars badly). All the glitter canvases share one
 * clock at ~24 fps, stop while off screen or in a hidden tab, and the sprites
 * (glow + star / dot per color) are drawn once and stamped. The canvas also
 * comes out right in the story snapshot (it is just a picture).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CardEffects } from "@/types";
import { glitterSparkles, type GlitterSpark } from "@/lib/cardFoil";
import { exportActive, onExportFrame } from "@/lib/export/exportClock";

type Box = { x: number; y: number; w: number; h: number };
/** Room around the text box so the sparkles on its edge are not cut. */
const BLEED = 10;
const FPS = 24;

// ── One shared clock for every glitter canvas ─────────────────────────────
type Painter = (t: number) => void;
const painters = new Set<Painter>();
let raf = 0, last = 0;
function loop(now: number) {
  raf = painters.size ? requestAnimationFrame(loop) : 0;
  // A story capture paints each frame itself (onExportFrame below).
  if (document.hidden || exportActive() || now - last < 1000 / FPS) return;
  last = now;
  const t = now / 1000;
  painters.forEach(p => p(t));
}
function addPainter(p: Painter) {
  painters.add(p);
  if (!raf) raf = requestAnimationFrame(loop);
}
function removePainter(p: Painter) { painters.delete(p); }

// ── Sprites: drawn once per color, then stamped with drawImage ─────────────
const SPRITE = 48;
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string, star: boolean): HTMLCanvasElement {
  const key = color + (star ? "*" : ".");
  const hit = sprites.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = SPRITE;
  const g = c.getContext("2d")!;
  const m = SPRITE / 2;
  // Soft glow behind.
  const glow = g.createRadialGradient(m, m, 0, m, m, m);
  glow.addColorStop(0, withAlpha(color, 0.55));
  glow.addColorStop(0.35, withAlpha(color, 0.18));
  glow.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.fillStyle = color;
  if (star) {
    // Four-point star with thin rays, the core a third of the sprite.
    const R = SPRITE * 0.32, r = R * 0.16;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      g.lineTo(m + Math.cos(a) * rad, m + Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
  } else {
    g.beginPath();
    g.arc(m, m, SPRITE * 0.12, 0, Math.PI * 2);
    g.fill();
  }
  sprites.set(key, c);
  return c;
}
function withAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(x => x + x).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Twinkle curve: 0 → 1 → 0.85 → 0 over one period (the v3 keyframes). */
function twinkle(p: number): number {
  if (p < 0.4) return p / 0.4;
  if (p < 0.6) return 1 - ((p - 0.4) / 0.2) * 0.15;
  return 0.85 * (1 - (p - 0.6) / 0.4);
}

function paint(ctx: CanvasRenderingContext2D, dpr: number, box: Box, sparks: GlitterSpark[], t: number, still: boolean) {
  const W = box.w + BLEED * 2, H = box.h + BLEED * 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  for (const s of sparks) {
    const p = still ? 0.4 : (((t - s.delay) / s.dur) % 1 + 1) % 1;
    const k = still ? 0.8 : twinkle(p);
    if (k <= 0.02) continue;
    const scale = 0.3 + 0.7 * k;
    // The sprite's core is ~0.64 of its side: stamp it so the core = size.
    const side = (s.size / 0.64) * scale * (s.star ? 1 : 2.6);
    const cx = BLEED + s.x * box.w, cy = BLEED + s.y * box.h;
    ctx.globalAlpha = k;
    if (s.star) {
      const a = (still ? 0.5 : p * 1.1) * 0.8;
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.drawImage(sprite(s.color, true), -side / 2, -side / 2, side, side);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.drawImage(sprite(s.color, false), cx - side / 2, cy - side / 2, side, side);
    }
  }
  ctx.globalAlpha = 1;
}

export default function CardGlitter({ fx, seed }: { fx: CardEffects; seed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const layer = ref.current, row = layer?.parentElement?.previousElementSibling as HTMLElement | null | undefined;
    if (!layer || !row) return;
    const measure = () => {
      const rr = row.getBoundingClientRect();
      if (rr.width <= 0) return;
      const scale = rr.width / (row.offsetWidth || rr.width);
      const range = document.createRange();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const child of Array.from(row.childNodes)) {
        range.selectNodeContents(child);
        for (const r of Array.from(range.getClientRects())) {
          if (r.width < 1 || r.height < 1) continue;
          x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        }
      }
      if (!isFinite(x0)) { setBox(null); return; }
      const next = { x: (x0 - rr.left) / scale, y: (y0 - rr.top) / scale, w: (x1 - x0) / scale, h: (y1 - y0) / scale };
      setBox(b => (b && Math.abs(b.x - next.x) < 1 && Math.abs(b.y - next.y) < 1 && Math.abs(b.w - next.w) < 1 && Math.abs(b.h - next.h) < 1 ? b : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    for (const child of Array.from(row.children)) ro.observe(child);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) measure(); });
    const late = setTimeout(measure, 1200);
    return () => { alive = false; ro.disconnect(); clearTimeout(late); };
  }, []);

  const g = fx.glitter;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box || !g) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sparks = glitterSparkles(box.w, box.h, fx, seed);
    // A phone gets the canvas at up to 2× (3× buys nothing at 3–9 px sparkles).
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.ceil((box.w + BLEED * 2) * dpr);
    canvas.height = Math.ceil((box.h + BLEED * 2) * dpr);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { paint(ctx, dpr, box, sparks, 0, true); return; }
    const offExport = onExportFrame(t => paint(ctx, dpr, box, sparks, t, false));
    let visible = true;
    const painter: Painter = t => { if (visible) paint(ctx, dpr, box, sparks, t, false); };
    paint(ctx, dpr, box, sparks, performance.now() / 1000, false);
    addPainter(painter);
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; })
      : null;
    io?.observe(canvas);
    return () => { removePainter(painter); io?.disconnect(); offExport(); };
    // fx is read only through the glitter settings below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, seed, g?.amount, g?.size, g?.color, g?.enabled]);

  return (
    <div ref={ref} data-fx="glitter" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {box && (
        <canvas ref={canvasRef} style={{
          position: "absolute", left: box.x - BLEED, top: box.y - BLEED,
          width: box.w + BLEED * 2, height: box.h + BLEED * 2,
        }} />
      )}
    </div>
  );
}
