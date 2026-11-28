"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

/** A row that scrolls sideways with a finger, the mouse wheel, dragging with
 * the mouse, or the arrows that show up when there is more to see. */
export default function HRow({ children, gap = 8, label, pills }: { children: React.ReactNode; gap?: number; label?: string;
  /** Grafito v2: the row is a pill well (tabs), the chosen one in lime gel. */
  pills?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const update = useCallback(() => {
    const el = ref.current; if (!el) return;
    setEdge({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    update();
    const ro = new ResizeObserver(update); ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    // A vertical wheel over the row moves it sideways (only while it can move).
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { ro.disconnect(); el.removeEventListener("wheel", wheel); };
  }, [update, children]);
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = (dir: -1 | 1): React.CSSProperties => ({ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: -4, transform: "translateY(-60%)",
    width: 30, height: 30, borderRadius: 15, border: "none", background: "var(--gf-gel, rgba(246,243,248,.95))", color: "var(--gf-gel-ink, #141118)", display: "grid", placeItems: "center",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.4)", zIndex: 2, padding: 0 });
  return (
    <div style={{ position: "relative" }} role={label ? "group" : undefined} aria-label={label}>
      <div ref={ref} onScroll={update} className={pills ? "gf-pills" : undefined}
        onPointerDown={e => { if (e.pointerType === "mouse" && e.button === 0) drag.current = { x: e.clientX, left: ref.current!.scrollLeft, moved: false }; }}
        onPointerMove={e => {
          const d = drag.current; if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 4) { d.moved = true; ref.current.setPointerCapture(e.pointerId); }
          if (d.moved) ref.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => { const d = drag.current; drag.current = null; if (d?.moved) { const stop = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); }; ref.current?.addEventListener("click", stop, { capture: true, once: true }); window.setTimeout(() => ref.current?.removeEventListener("click", stop, { capture: true }), 0); } }}
        onPointerCancel={() => { drag.current = null; }}
        style={{ display: "flex", gap, overflowX: "auto", ...(pills ? { width: "fit-content", maxWidth: "100%", boxSizing: "border-box" } : {}), scrollbarWidth: "none", paddingBottom: 2, overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch",
          maskImage: edge.l || edge.r ? `linear-gradient(90deg, ${edge.l ? "transparent, #000 28px" : "#000"}, ${edge.r ? "#000 calc(100% - 28px), transparent" : "#000"})` : undefined }}>
        {children}
      </div>
      {edge.l && <button type="button" aria-label="Ver anteriores" onClick={() => by(-1)} style={arrow(-1)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg></button>}
      {edge.r && <button type="button" aria-label="Ver más" onClick={() => by(1)} style={arrow(1)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg></button>}
    </div>
  );
}
