"use client";
/**
 * Glitter (2026-11-04): little sparkles that twinkle over a text. Placed in
 * a box over the text's row (its previous sibling, so the row's clip never
 * cuts a sparkle) and spread over the text itself (measured with a Range of
 * the row's text), so they sit on the letters, not on the empty row.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import type { CardEffects } from "@/types";
import { glitterSparkles } from "@/lib/cardFoil";

const GLITTER_ANIM = "mnemo-glitter-twinkle";
const GLOW_ID = "mnemo-glitter-glow";
const CSS = `@keyframes ${GLITTER_ANIM}{0%,100%{opacity:.15;transform:translate(-50%,-50%) scale(.35) rotate(0deg)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.1) rotate(40deg)}55%{opacity:.85;transform:translate(-50%,-50%) scale(.75) rotate(60deg)}80%{opacity:.4;transform:translate(-50%,-50%) scale(.5) rotate(80deg)}}
@media (prefers-reduced-motion: reduce){@keyframes ${GLITTER_ANIM}{0%,100%{opacity:.8;transform:translate(-50%,-50%) scale(.8)}}}`;

function ensureCss() {
  if (typeof document === "undefined" || document.getElementById(GLITTER_ANIM)) return;
  const el = document.createElement("style");
  el.id = GLITTER_ANIM;
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
        if (child === layer) continue;
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
    // The text's own size changes when a font finishes loading (the row
    // keeps its size): watch the text elements too, and re-measure then.
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    for (const child of Array.from(row.children)) if (child !== layer) ro.observe(child);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) measure(); });
    const late = setTimeout(measure, 1200);
    return () => { alive = false; ro.disconnect(); clearTimeout(late); };
  }, []);

  const sparks = box ? glitterSparkles(box.w, box.h, fx, seed) : [];
  return (
    <div ref={ref} data-fx="glitter" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <radialGradient id={GLOW_ID}>
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      {box && sparks.map((s, i) => (
        <svg key={i} width={s.size} height={s.size} viewBox="0 0 10 10"
          style={{ position: "absolute", left: box.x + s.x * box.w, top: box.y + s.y * box.h, overflow: "visible",
            animation: `${GLITTER_ANIM} ${s.dur.toFixed(2)}s ease-in-out ${s.delay.toFixed(2)}s infinite both` }}>
          {/* The glow is drawn in the SVG (a CSS drop-shadow on an animated
              element left dark boxes in Chromium). */}
          <circle cx="5" cy="5" r="5" fill={`url(#${GLOW_ID})`} />
          <path d="M5 0 Q5.6 4.4 10 5 Q5.6 5.6 5 10 Q4.4 5.6 0 5 Q4.4 4.4 5 0 Z" fill={s.color} />
          <circle cx="5" cy="5" r="1.1" fill="#fff" />
        </svg>
      ))}
    </div>
  );
}
