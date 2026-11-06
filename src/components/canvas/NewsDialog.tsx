"use client";
/**
 * Novedades (2026-11-06): a one-time notice in the editor about Favoritos,
 * Notas, the bottom bar and the phone view, reminding that myLand is a beta.
 * Shown once per browser (NEWS_KEY). Someone who meets the editor for the
 * first time gets the tour instead and never sees it (CanvasBoard marks it
 * seen when the tour starts).
 */
import React, { useEffect, useRef } from "react";

export const NEWS_KEY = "mnemo_news_2026_11_06";

const ICONS: Record<string, React.ReactNode> = {
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  quote: <><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
};

const ROWS: [keyof typeof ICONS, string, string][] = [
  ["heart", "Favoritos", "Dale corazón a las cards que te gustan, al lado de \"Compartir\". Es anónimo."],
  ["quote", "Notas", "Arriba de tu card: tocá el cuadro y escribí. Dura 24 h y les avisa a quienes te dieron favorito. El engranaje lo decora."],
  ["search", "Barra de abajo", "Tus favoritos con su nota del día, y la lupa para buscar cards."],
  ["phone", "Mejor en el celular", "Tu card centrada y con las imágenes que la rodean."],
];

const PINK = "#ff4fa3";

export default function NewsDialog({ onClose }: { onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [onClose]);
  return (
    <div data-mnemo-ui="" data-export-skip="" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147482000, background: "rgba(6,6,10,.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        display: "grid", placeItems: "center", padding: 16, fontFamily: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#f5f3f7" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="mnemo-news-title"
        style={{ width: "min(440px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box", padding: "28px 28px 24px", borderRadius: 28,
          background: "rgba(24,22,30,.92)", backdropFilter: "blur(24px) saturate(1.4)", WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
        <span style={{ display: "inline-block", font: "700 11px/1 system-ui, sans-serif", letterSpacing: ".08em", padding: "6px 10px", borderRadius: 999, background: PINK, color: "#fff" }}>NUEVO</span>
        <h2 id="mnemo-news-title" style={{ margin: "14px 0 6px", fontSize: 24, letterSpacing: "-.4px" }}>Novedades en myLand</h2>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "rgba(245,243,247,.65)" }}>Esto cambió desde la última vez que entraste.</p>
        {ROWS.map(([icon, title, text]) => (
          <div key={title} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <div aria-hidden style={{ flex: "none", width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,.07)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[icon]}</svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
              <div style={{ marginTop: 2, fontSize: 13.5, lineHeight: 1.45, color: "rgba(245,243,247,.68)" }}>{text}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: "rgba(255,79,163,.1)", border: "1px solid rgba(255,79,163,.25)", fontSize: 13, lineHeight: 1.45, color: "rgba(245,243,247,.8)" }}>
          <b>myLand es una beta.</b>{" "}Puede haber errores: si ves algo raro, tocá &quot;Reportar un error&quot; abajo a la izquierda.
        </div>
        <button ref={btn} type="button" onClick={onClose}
          style={{ marginTop: 18, width: "100%", height: 46, border: 0, borderRadius: 999, background: PINK, color: "#fff", font: "700 15px system-ui, sans-serif", cursor: "pointer" }}>
          Entendido
        </button>
      </div>
    </div>
  );
}
