"use client";
/**
 * Strass v3 (2026-11-11, performance): the rhinestones are drawn ONCE on a
 * canvas — cut stones with their facets, table and shadow — and never
 * redrawn while the light moves. What follows the light is a small window
 * (CardFx › LightWindow) showing a second, brighter drawing of the same
 * stones with their cross glints: the stones under the light flash, by a
 * transform only.
 *
 * v2 rendered every stone in WebGL on a canvas the size of the card on each
 * change of the light: ~17 fps on a machine without a GPU, and a WebGL
 * context per card. The cut look is kept (facets shaded from a fixed light),
 * and the stones can now be hearts or stars and take any color.
 */
import React, { useEffect, useMemo, useRef } from "react";
import type { CardEffects } from "@/types";
import { strassPoints, strassColors, STRASS_DEFAULT_SIZE, STRASS_DEFAULT_GAP } from "@/lib/cardFoil";
import { mixHex } from "@/lib/fxPalette";
import { LightWindow } from "./CardFx";

type Strass = NonNullable<CardEffects["strass"]>;
type Shape = NonNullable<Strass["shape"]>;

/** The stone's outline, unit size (fits a circle of radius 1). */
function outline(shape: Shape): [number, number][] {
  const pts: [number, number][] = [];
  if (shape === "star") {
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 === 0 ? 1.08 : 0.5;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  } else if (shape === "heart") {
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([x / 16.5, (y + 2.4) / 16.5]);
    }
  } else {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push([Math.cos(a), Math.sin(a)]); }
  }
  return pts;
}

/** One cut stone at (0,0), radius `r`: crown facets shaded from a light up
 * and to the left, the table with the pavilion showing through, a specular. */
function drawGem(g: CanvasRenderingContext2D, r: number, body: string, shape: Shape, lit: boolean) {
  const hi = mixHex(body, "#ffffff", lit ? 0.92 : 0.78), deep = mixHex(body, "#0a0c18", 0.62);
  const out = outline(shape), n = out.length, k = shape === "round" ? 0.56 : 0.5;
  const P = out.map(([x, y]) => [x * r, y * r] as const), Q = out.map(([x, y]) => [x * r * k, y * r * k] as const);
  const lx = -0.62, ly = -0.78; // the fixed light
  // Crown: one facet per side, lit by where it faces.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (out[i][0] + out[j][0]) / 2, my = (out[i][1] + out[j][1]) / 2, ml = Math.hypot(mx, my) || 1;
    // Facing the light = bright; every other facet a step darker (the cut).
    let t = ((mx / ml) * lx + (my / ml) * ly) * 0.5 + 0.5;
    t = t * 0.8 + (i % 2 === 0 ? 0.2 : 0);
    g.beginPath();
    g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); g.lineTo(Q[j][0], Q[j][1]); g.lineTo(Q[i][0], Q[i][1]);
    g.closePath();
    g.fillStyle = t > 0.5 ? mixHex(body, hi, (t - 0.5) * 2) : mixHex(deep, body, t * 2);
    g.fill();
  }
  // Table: lighter toward the light, with the pavilion's star seen through.
  const table = () => { g.beginPath(); Q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const grad = g.createLinearGradient(lx * r * k, ly * r * k, -lx * r * k, -ly * r * k);
  grad.addColorStop(0, hi); grad.addColorStop(0.55, mixHex(body, hi, 0.25)); grad.addColorStop(1, mixHex(body, deep, 0.45));
  table(); g.fillStyle = grad; g.fill();
  g.save(); table(); g.clip();
  const spokes = shape === "round" ? 8 : n / 2;
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * Math.PI * 2 + 0.2, a1 = a0 + Math.PI / spokes;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); g.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); g.closePath();
    g.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.16)";
    g.fill();
  }
  g.restore();
  // Girdle line and the specular dot.
  g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.lineWidth = Math.max(0.5, r * 0.07); g.strokeStyle = mixHex(deep, "#000000", 0.35); g.stroke();
  g.beginPath(); g.arc(lx * r * 0.3, ly * r * 0.3, r * (lit ? 0.2 : 0.14), 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.95)"; g.fill();
}

/** Sprites: a stone per color, drawn big once and stamped. */
function gemSprite(px: number, body: string, shape: Shape, lit: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const side = Math.ceil(px * 1.3);
  c.width = c.height = side;
  const g = c.getContext("2d")!;
  g.translate(side / 2, side / 2);
  drawGem(g, px / 2, body, shape, lit);
  return c;
}

function paintRing(canvas: HTMLCanvasElement, w: number, h: number, pts: { x: number; y: number }[], size: number, colors: string[], shape: Shape, lit: boolean) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.ceil(w * dpr); canvas.height = Math.ceil(h * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const res = Math.ceil(size * dpr * 2);
  const sprites = colors.map(c => gemSprite(res, c, shape, lit));
  const r = size / 2, side = size * 1.3;
  pts.forEach((p, i) => {
    if (!lit) {
      // Contact shadow, a touch down and to the right.
      const sh = g.createRadialGradient(p.x + r * 0.12, p.y + r * 0.3, 0, p.x + r * 0.12, p.y + r * 0.3, r * 1.45);
      sh.addColorStop(0, "rgba(0,0,0,0.5)"); sh.addColorStop(0.6, "rgba(0,0,0,0.22)"); sh.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = sh;
      g.fillRect(p.x - r * 1.6, p.y - r * 1.4, r * 3.4, r * 3.4);
    }
    g.save();
    g.translate(p.x, p.y);
    // Round stones each turned differently (as set by hand); shapes upright.
    if (shape === "round") g.rotate((i * 2.399) % (Math.PI * 2));
    g.drawImage(sprites[i % sprites.length], -side / 2, -side / 2, side, side);
    g.restore();
    if (lit) {
      // The cross glint of a stone catching the light.
      const L = r * 2.3, t = r * 0.14;
      g.fillStyle = "rgba(255,255,255,0.95)";
      g.beginPath();
      g.moveTo(p.x, p.y - L); g.quadraticCurveTo(p.x + t, p.y - t, p.x + L, p.y); g.quadraticCurveTo(p.x + t, p.y + t, p.x, p.y + L);
      g.quadraticCurveTo(p.x - t, p.y + t, p.x - L, p.y); g.quadraticCurveTo(p.x - t, p.y - t, p.x, p.y - L);
      g.fill();
    }
  });
}

export default function StrassRing({ w, h, radius, cfg, colors }: { w: number; h: number; radius: number; cfg: Strass; colors: string[] }) {
  const size = Math.max(4, Math.min(18, cfg.size ?? STRASS_DEFAULT_SIZE));
  const shape: Shape = cfg.shape ?? "round";
  const pts = useMemo(() => strassPoints(w, h, radius, size, cfg.gap ?? STRASS_DEFAULT_GAP), [w, h, radius, size, cfg.gap]);
  const baseRef = useRef<HTMLCanvasElement>(null), litRef = useRef<HTMLCanvasElement>(null);
  const key = colors.join();
  useEffect(() => {
    if (baseRef.current) paintRing(baseRef.current, w, h, pts, size, colors, shape, false);
    if (litRef.current) paintRing(litRef.current, w, h, pts, size, colors, shape, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, pts, size, key, shape]);
  const cv: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: w, height: h, pointerEvents: "none" };
  return (
    <div data-fx="strass" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <canvas ref={baseRef} style={cv} />
      <LightWindow w={w} h={h} radius={Math.round(Math.hypot(w, h) * 0.3)}>
        <canvas ref={litRef} style={cv} />
      </LightWindow>
    </div>
  );
}

/** Colors for a card (the palette, or the old "Piedras" setting). */
export function useStrassColors(fx: CardEffects | undefined, cardColors?: readonly string[]): string[] {
  const key = [fx?.strass?.color, fx?.strass?.palette, (fx?.strass?.colors ?? []).join(), (cardColors ?? []).join()].join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => strassColors(fx, cardColors), [key]);
}
