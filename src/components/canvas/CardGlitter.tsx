"use client";
/**
 * Glitter v3 (2026-11-04): small sparkles that twinkle over a text — four-
 * point stars and fine glints, spread over the text itself (measured with a
 * Range of the row's text, re-measured when it changes or a font loads).
 * Placed in a box over the row (its previous sibling), so the row's clip
 * never cuts a sparkle. Plain spans animated with transform / opacity only
 * (no SVG, no filters: cheap for the compositor).
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { CardEffects } from "@/types";
import { glitterSparkles } from "@/lib/cardFoil";

const ANIM = "mnemo-glitter-twinkle";
const CSS = `@keyframes ${ANIM}{0%,100%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(0deg)}40%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(30deg)}60%{opacity:.85;transform:translate(-50%,-50%) scale(.8) rotate(45deg)}}
@media (prefers-reduced-motion: reduce){@keyframes ${ANIM}{0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(.8)}}}`;
/** A four-point star with thin rays (the classic sparkle). */
const STAR = "polygon(50% 0%, 57% 43%, 100% 50%, 57% 57%, 50% 100%, 43% 57%, 0% 50%, 43% 43%)";

function ensureCss() {
  if (typeof document === "undefined" || document.getElementById(ANIM)) return;
  const el = document.createElement("style");
  el.id = ANIM;
  el.textContent = CSS;
  document.head.appendChild(el);
}

export default function CardGlitter({ fx, seed }: { fx: CardEffects; seed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    ensureCss();
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

  const sparks = box ? glitterSparkles(box.w, box.h, fx, seed) : [];
  return (
    <div ref={ref} data-fx="glitter" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {box && sparks.map((s, i) => (
        <span key={i} style={{
          position: "absolute", left: box.x + s.x * box.w, top: box.y + s.y * box.h, width: s.size, height: s.size,
          animation: `${ANIM} ${s.dur.toFixed(2)}s ease-in-out ${s.delay.toFixed(2)}s infinite both`, willChange: "transform, opacity",
        }}>
          {/* Soft glow behind, crisp star (or round glint) on top. */}
          <span style={{ position: "absolute", inset: "-60%", borderRadius: "50%", background: `radial-gradient(circle, ${s.color} 0%, rgba(255,255,255,0) 60%)`, opacity: 0.55 }} />
          <span style={{ position: "absolute", inset: 0, background: s.color, ...(s.star ? { clipPath: STAR } : { borderRadius: "50%" }) }} />
        </span>
      ))}
    </div>
  );
}
