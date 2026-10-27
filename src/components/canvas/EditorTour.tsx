"use client";
/**
 * First-visit tour of the editor (2026-10-27, replaces the old 4-slide
 * "THIS IS YOUR SPACE" overlay and the "Tocá algo para editarlo" hint).
 * The screen dims except the thing to touch, and each step moves on when the
 * user does it (CanvasBoard decides the step from the editor's real state):
 *   card    → "Tocá tu tarjeta…"             (until the card is selected)
 *   part    → "Tocá cualquier ELEMENTO…"     (until its inspector opens)
 *   add     → "Con A o + agregás…"           (Siguiente, or opening Agregar)
 *   publish → "Cuando termines, Publicar…"   (Listo)
 * The dim never blocks a click (pointer-events: none); only the bubble takes
 * clicks. "Saltar" ends it. Shown once per browser (localStorage).
 */
import { useEffect, useState } from "react";

export type TourStep = "card" | "part" | "add" | "publish";
export const TOUR_KEY = "mnemo_tour_v2";
export const TOUR_STEPS: TourStep[] = ["card", "part", "add", "publish"];

const COPY: Record<TourStep, { title: string; body?: string; button?: string }> = {
  card: { title: "Tocá tu tarjeta para empezar a editarla" },
  part: { title: "Tocá cualquier ELEMENTO dentro de la TARJETA para abrir su menú de edición", body: "Tu foto, tu nombre, los links… cada cosa tiene su menú." },
  add: { title: "Con la A o el + agregás imágenes y textos a tu sala", body: "Podés arrastrarlos, girarlos y acomodarlos donde quieras.", button: "Siguiente" },
  publish: { title: "Cuando termines, tocá Publicar", body: "Así tus cambios se ven en tu link.", button: "Listo" },
};

const TARGET: Record<TourStep, string> = {
  card: "[data-profile-card]",
  part: "[data-profile-card]",
  add: "#mnemo-rail-add",
  publish: "[data-tour='publish']",
};

type Box = { x: number; y: number; w: number; h: number };

function useTargetBox(selector: string): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    let raf = 0, last = "";
    const tick = () => {
      const el = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(e => e.offsetParent !== null || e.getClientRects().length);
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      const key = next ? `${Math.round(next.x)},${Math.round(next.y)},${Math.round(next.w)},${Math.round(next.h)}` : "";
      if (key !== last) { last = key; setBox(next); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selector]);
  return box;
}

export default function EditorTour({ step, onNext, onSkip }: { step: TourStep; onNext: () => void; onSkip: () => void }) {
  const box = useTargetBox(TARGET[step]);
  const copy = COPY[step];
  const index = TOUR_STEPS.indexOf(step);
  const pad = step === "card" || step === "part" ? 14 : 8;
  const hole = box ? { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 } : null;

  // The bubble goes below the target, or above when there's no room; beside
  // the rail button (it's on the left edge).
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const bw = Math.min(360, vw - 32);
  let bubble: React.CSSProperties = { left: (vw - bw) / 2, top: vh / 2 - 60 };
  if (hole) {
    if (step === "add") {
      bubble = { left: hole.x + hole.w + 16, top: Math.max(16, hole.y + hole.h / 2 - 70) };
    } else {
      const below = hole.y + hole.h + 16;
      const left = Math.min(Math.max(16, hole.x + hole.w / 2 - bw / 2), vw - bw - 16);
      bubble = below + 170 < vh ? { left, top: below } : { left, top: Math.max(16, hole.y - 16 - 170) };
      if (step === "publish") bubble = { left: Math.max(16, hole.x + hole.w - bw), top: below };
    }
  }

  return (
    <div data-mnemo-ui="" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 2147482000, pointerEvents: "none" }}>
      {/* The dim with a hole around the target (or all dim while it isn't there). */}
      <div aria-hidden style={hole ? {
        position: "fixed", left: hole.x, top: hole.y, width: hole.w, height: hole.h,
        borderRadius: step === "card" || step === "part" ? 22 : 999,
        boxShadow: "0 0 0 200vmax rgba(6,5,10,.66), 0 0 0 2px rgba(255,255,255,.55), 0 0 40px 6px rgba(255,79,148,.35)",
        transition: "left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1), width .35s cubic-bezier(.2,.8,.2,1), height .35s cubic-bezier(.2,.8,.2,1), border-radius .35s",
        animation: "mnemo-tour-pulse 2.2s ease-in-out infinite",
      } : { position: "fixed", inset: 0, background: "rgba(6,5,10,.66)" }} />
      <div className="mnemo-tour-bubble" role="dialog" aria-label="Tutorial" style={{
        position: "fixed", ...bubble, width: bw, boxSizing: "border-box", padding: "18px 18px 14px", borderRadius: 22,
        background: "rgba(24,21,30,.94)", color: "#F6F3F8", boxShadow: "0 0 0 1px rgba(255,255,255,.10), 0 24px 60px -18px rgba(0,0,0,.7)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", pointerEvents: "auto",
        fontFamily: "'DM Sans', system-ui, sans-serif", transition: "left .35s cubic-bezier(.2,.8,.2,1), top .35s cubic-bezier(.2,.8,.2,1)",
      }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {TOUR_STEPS.map((s, i) => (
            <span key={s} style={{ height: 4, flex: 1, borderRadius: 9, background: i <= index ? "#FF4F94" : "rgba(255,255,255,.14)", transition: "background .3s" }} />
          ))}
        </div>
        <p key={step} style={{ margin: 0, font: "700 17px/1.3 'DM Sans', system-ui, sans-serif", letterSpacing: "-0.01em", animation: "mnemo-tour-in .4s ease both" }}>{copy.title}</p>
        {copy.body ? <p style={{ margin: "6px 0 0", font: "500 13.5px/1.45 'DM Sans', system-ui, sans-serif", color: "rgba(238,232,244,.7)" }}>{copy.body}</p> : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <button type="button" onClick={onSkip} style={{ border: "none", background: "transparent", color: "rgba(238,232,244,.55)", font: "600 13px 'DM Sans', system-ui, sans-serif", cursor: "pointer", padding: "6px 2px" }}>
            Saltar tutorial
          </button>
          {copy.button ? (
            <button type="button" onClick={onNext} style={{ height: 38, padding: "0 18px", border: "none", borderRadius: 999, background: "#FF4F94", color: "#141118", font: "750 14px 'DM Sans', system-ui, sans-serif", cursor: "pointer" }}>
              {copy.button}
            </button>
          ) : <span style={{ font: "600 12px 'Space Mono', monospace", color: "rgba(238,232,244,.4)" }}>{index + 1} / {TOUR_STEPS.length}</span>}
        </div>
      </div>
      <style>{`
        @keyframes mnemo-tour-pulse { 0%,100% { outline: 0 solid rgba(255,79,148,0) } 50% { outline: 6px solid rgba(255,79,148,.18) } }
        @keyframes mnemo-tour-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .mnemo-tour-bubble, .mnemo-tour-bubble * { animation: none !important; transition: none !important } }
      `}</style>
    </div>
  );
}
