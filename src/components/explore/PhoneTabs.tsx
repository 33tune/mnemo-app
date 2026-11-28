"use client";
/**
 * Celular (2026-11-26, pedido del usuario; Feed since 2026-11-28): tabs at the bottom of your
 * own myLand on a phone — Inicio (your room as visitors see it, with copy link,
 * share and the notices bell), Explorar and Editar (the card editor).
 */
import React, { useState } from "react";

export const PHONE_TABS_H = 64;
export type PhoneTab = "inicio" | "explorar" | "feed" | "editar";
const INK = "#F6F3F8";
const font = "var(--font-sans, system-ui), -apple-system, 'Segoe UI', sans-serif";

const ICON: Record<PhoneTab, React.ReactNode> = {
  inicio: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  explorar: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" /></>,
  feed: <><rect x="4" y="3.5" width="16" height="7" rx="2.2" /><rect x="4" y="13.5" width="16" height="7" rx="2.2" /></>,
  editar: <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />,
};
const LABEL: Record<PhoneTab, string> = { inicio: "Inicio", explorar: "Explorar", feed: "Feed", editar: "Editar" };

export default function PhoneTabs({ tab, onTab, feedCount = 0 }: { tab: PhoneTab; onTab: (t: PhoneTab) => void; feedCount?: number }) {
  return (
    <nav data-mnemo-ui="" data-export-skip="" aria-label="Secciones"
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 2147481100, height: `calc(${PHONE_TABS_H}px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)", display: "flex", justifyContent: "space-around", alignItems: "stretch",
        background: "rgba(14,12,18,.92)", WebkitBackdropFilter: "blur(18px)", backdropFilter: "blur(18px)", borderTop: "1px solid rgba(255,255,255,.1)" }}>
      {(["inicio", "explorar", "feed", "editar"] as PhoneTab[]).map(t => (
        <button key={t} type="button" onClick={() => onTab(t)} aria-current={tab === t ? "page" : undefined}
          style={{ flex: 1, border: "none", background: "transparent", color: tab === t ? INK : "rgba(246,243,248,.45)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3, font: `600 11px ${font}`, cursor: "pointer", padding: 0 }}>
          <span style={{ position: "relative", display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>{ICON[t]}</svg>
            {t === "feed" && feedCount > 0 && tab !== "feed" && (
              <span aria-hidden style={{ position: "absolute", top: -5, right: -9, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 9, background: "#FF4F94", color: "#fff",
                font: `700 10px/17px ${font}`, textAlign: "center", boxSizing: "border-box" }}>{feedCount > 9 ? "9+" : feedCount}</span>
            )}
          </span>
          {LABEL[t]}
        </button>
      ))}
    </nav>
  );
}

/** Inicio: copy your link, share your card, and the notices bell (top right). */
export function PhoneHome({ handle, onShare, onNotices, unread }: { handle: string; onShare?: () => void; onNotices: () => void; unread: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `https://www.myland.lol/${handle}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch { /* ignore */ } t.remove();
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  const pill: React.CSSProperties = { flex: 1, height: 46, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(14,12,18,.78)",
    WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", color: INK, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    font: `700 14px ${font}`, cursor: "pointer" };
  return (
    <>
      <button type="button" data-mnemo-ui="" data-export-skip="" onClick={onNotices} aria-label={unread ? `Avisos (${unread} nuevos)` : "Avisos"}
        style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 14px)", right: 14, zIndex: 2147481100, width: 44, height: 44, borderRadius: 22,
          border: "1px solid rgba(255,255,255,.14)", background: "rgba(14,12,18,.78)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)",
          color: INK, display: "grid", placeItems: "center", cursor: "pointer" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" /></svg>
        {unread > 0 && (
          <span aria-hidden style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "#FF4F94",
            color: "#fff", font: `700 11px/18px ${font}`, textAlign: "center", boxSizing: "border-box" }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      <div data-mnemo-ui="" data-export-skip="" style={{ position: "fixed", left: 14, right: 14, zIndex: 2147481090, bottom: `calc(${PHONE_TABS_H + 14}px + env(safe-area-inset-bottom, 0px))`, display: "flex", gap: 8 }}>
        <button type="button" onClick={copy} style={pill} aria-live="polite">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
        {onShare && (
          <button type="button" onClick={onShare} style={pill}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
            Compartir
          </button>
        )}
      </div>
    </>
  );
}
