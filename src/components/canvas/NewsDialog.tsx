"use client";
/**
 * Novedades (2026-11-28): "Compartí fragmentos de tu alma" — Recursos / reposts
 * / descargas / el Feed en Explorar. Shown once per browser (NEWS_KEY) to
 * EVERYONE who opens the editor, newcomers included (after the tour on a
 * computer). The main button turns your card to its Fragmentos.
 * (Before: 2026-11-26 Explorar & favoritos; 2026-11-06 Favoritos / Notas.)
 */
import React, { useEffect, useRef } from "react";

export const NEWS_KEY = "mnemo_news_2026_11_28";

const ICONS: Record<string, React.ReactNode> = {
  images: <><rect x="7" y="3" width="14" height="14" rx="2.5" /><path d="M3 7.5V19a2 2 0 0 0 2 2h11.5" /><circle cx="12" cy="8" r="1.6" /><path d="m21 13.5-3.6-3.6a1.4 1.4 0 0 0-2 0L9 16.4" /></>,
  repost: <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
};

const ROWS: [keyof typeof ICONS, string, string][] = [
  ["images", "Fragmentos en cada card", "Dale vuelta a cualquier card: las imágenes, GIFs y stickers de su sala están ahí, a un toque."],
  ["repost", "Reposteá lo que te gusta", "Sumá a tu card las imágenes de otros, y también sus posts del muro. Siempre con su @."],
  ["download", "Descargá e inspirate", "Guardá lo que te sirva para armar tu card. Cada uno elige si sus fragmentos se pueden bajar."],
  ["compass", "Feed en Explorar", "Lo que publican y repostean tus favoritos, todo en un lugar."],
];

const STICKERS = ["wings", "starburst", "tribal", "star", "spine"].map(n => `/editor/stickers/${n}.webp`);
const PINK = "#ff4fa3";

/** The back of a card with its Fragmentos — made of myLand's own sample stickers. */
function Hero() {
  return (
    <div aria-hidden style={{ position: "relative", height: 168, margin: "-28px -28px 18px", borderRadius: "28px 28px 0 0", overflow: "hidden",
      background: "radial-gradient(120% 90% at 20% 0%, #4a1a3c 0%, #1b1222 55%, #121018 100%)" }}>
      <div style={{ position: "absolute", left: "50%", top: 22, transform: "translateX(-50%) rotate(-3deg)", width: 300, padding: "12px 12px 14px", borderRadius: 18,
        background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 18px 40px rgba(0,0,0,.45)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: "700 9.5px system-ui, sans-serif", letterSpacing: ".1em", color: "rgba(255,255,255,.6)", marginBottom: 9 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS.images}</svg>
          FRAGMENTOS DE TU ALMA
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {STICKERS.map((s, i) => (
            <div key={s} style={{ position: "relative", flex: "none", width: 50, height: 50, borderRadius: 11, background: "repeating-conic-gradient(rgba(255,255,255,.07) 0 25%, transparent 0 50%) 0 0 / 10px 10px",
              border: "1px solid rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}>
              <img src={s} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: "contain" }} />
              {i === 3 && <span style={{ position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: 7, background: "rgba(0,0,0,.65)", display: "grid", placeItems: "center" }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              </span>}
            </div>
          ))}
        </div>
      </div>
      <Chip style={{ left: "calc(50% - 150px)", top: 112 }} icon="repost" label="Repostear" pink />
      <Chip style={{ left: "calc(50% + 22px)", top: 120 }} icon="download" label="Descargar" />
    </div>
  );
}
function Chip({ style, icon, label, pink }: { style: React.CSSProperties; icon: keyof typeof ICONS; label: string; pink?: boolean }) {
  return (
    <span style={{ position: "absolute", ...style, display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 13px", borderRadius: 999,
      background: pink ? PINK : "rgba(255,255,255,.12)", border: pink ? "none" : "1px solid rgba(255,255,255,.18)", color: "#fff",
      font: "700 12.5px system-ui, sans-serif", boxShadow: "0 10px 24px rgba(0,0,0,.4)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ICONS[icon]}</svg>
      {label}
    </span>
  );
}

export default function NewsDialog({ onClose, onOpenFragments }: { onClose: () => void; onOpenFragments?: () => void }) {
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
          background: "rgba(24,22,30,.96)", backdropFilter: "blur(24px) saturate(1.4)", WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
        <Hero />
        <span style={{ display: "inline-block", font: "700 11px/1 system-ui, sans-serif", letterSpacing: ".08em", padding: "6px 10px", borderRadius: 999, background: PINK, color: "#fff" }}>NUEVO</span>
        <h2 id="mnemo-news-title" style={{ margin: "12px 0 6px", fontSize: 25, lineHeight: 1.15, letterSpacing: "-.5px" }}>Compartí fragmentos de tu alma</h2>
        <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.45, color: "rgba(245,243,247,.7)" }}>
          Tu sala ahora es tu colección. Las imágenes y stickers que elegiste para tu card se ven, se guardan y se repostean.
        </p>
        {ROWS.map(([icon, title, text]) => (
          <div key={title} style={{ display: "flex", gap: 12, padding: "11px 0", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <div aria-hidden style={{ flex: "none", width: 34, height: 34, borderRadius: 11, background: "rgba(255,79,163,.14)", display: "grid", placeItems: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[icon]}</svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
              <div style={{ marginTop: 2, fontSize: 13.5, lineHeight: 1.45, color: "rgba(245,243,247,.68)" }}>{text}</div>
            </div>
          </div>
        ))}
        <button ref={btn} type="button" onClick={() => { onClose(); onOpenFragments?.(); }}
          style={{ marginTop: 16, width: "100%", height: 46, border: 0, borderRadius: 999, background: PINK, color: "#fff", font: "700 15px system-ui, sans-serif", cursor: "pointer" }}>
          {onOpenFragments ? "Ver mis fragmentos" : "Entendido"}
        </button>
        {onOpenFragments && (
          <button type="button" onClick={onClose}
            style={{ marginTop: 8, width: "100%", height: 38, border: 0, borderRadius: 999, background: "transparent", color: "rgba(245,243,247,.6)", font: "600 13.5px system-ui, sans-serif", cursor: "pointer" }}>
            Después
          </button>
        )}
      </div>
    </div>
  );
}
