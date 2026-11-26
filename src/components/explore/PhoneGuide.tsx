"use client";
/**
 * Editor de celular (2026-11-26): a light guide to a card that works as a
 * "link in bio" — 4 steps (photo, name, your links, a style), a pill on top
 * that says what is next (tap = do it), a celebration the first time the 4
 * are done (copy your link / share), and a one-time note that the whole room
 * is edited in the desktop version (PC or Mac).
 */
import React, { useState } from "react";
import type { ProfileCardData } from "@/types";
import type { ObjectId } from "@/lib/inspectorObjects";

const ACC = "#FF4F94";
const INK = "#F6F3F8";
const font = "var(--font-sans, system-ui), -apple-system, 'Segoe UI', sans-serif";

export interface GuideStep { id: "photo" | "name" | "links" | "style"; label: string; part: ObjectId; done: boolean }

export function guideSteps(card: ProfileCardData | undefined): GuideStep[] {
  const c = (card ?? {}) as ProfileCardData & Record<string, unknown>;
  const fx = (c.effects && typeof c.effects === "object" ? c.effects : {}) as Record<string, unknown>;
  const styled = Object.keys(fx).some(k => k !== "paused" && fx[k] && typeof fx[k] === "object" && (fx[k] as { enabled?: boolean }).enabled !== false);
  const links = (Array.isArray(c.contactLinks) && c.contactLinks.length > 0) || (Array.isArray(c.linkButtons) && c.linkButtons.length > 0);
  return [
    { id: "photo", label: "Tu foto", part: "photo", done: typeof c.photo === "string" && !!c.photo.trim() },
    { id: "name", label: "Tu nombre", part: "name", done: typeof c.name === "string" && !!c.name.trim() },
    { id: "links", label: "Tus redes", part: "links", done: links },
    { id: "style", label: "Un estilo", part: "cardFx", done: styled },
  ];
}

const VERB: Record<GuideStep["id"], string> = { photo: "Subir", name: "Escribir", links: "Agregar", style: "Elegir" };

/** "2 de 4 · Tus redes [Agregar]": the next step, on top of the card. */
export function PhoneGuidePill({ steps, top, onGo }: { steps: GuideStep[]; top: number; onGo: (s: GuideStep) => void }) {
  const done = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done);
  if (!next) return null;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <button type="button" data-mnemo-ui="" data-export-skip="" onClick={() => onGo(next)} aria-label={`${done} de ${steps.length} listos. Falta: ${next.label}`}
      style={{ position: "fixed", top, left: "50%", transform: "translateX(-50%)", zIndex: 2147480950, display: "flex", alignItems: "center", gap: 10,
        padding: "6px 6px 6px 10px", borderRadius: 999, border: "none", background: "#fff", color: "#16141c", boxShadow: "0 8px 22px rgba(0,0,0,.3)",
        font: `700 13px ${font}`, whiteSpace: "nowrap", cursor: "pointer" }}>
      <span aria-hidden style={{ width: 24, height: 24, borderRadius: 12, display: "grid", placeItems: "center",
        background: `conic-gradient(${ACC} 0 ${pct}%, #e6e2ee 0)` }}>
        <span style={{ width: 16, height: 16, borderRadius: 8, background: "#fff" }} />
      </span>
      {done}/{steps.length} · {next.label}
      <span style={{ background: ACC, color: "#fff", borderRadius: 999, padding: "6px 12px", font: `700 12px ${font}` }}>{VERB[next.id]}</span>
    </button>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return (
    <div data-mnemo-ui="" data-export-skip="" role="dialog" aria-modal="true" aria-label={label}
      style={{ position: "fixed", inset: 0, zIndex: 2147481200, display: "flex", alignItems: "flex-end", background: "rgba(8,4,14,.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", background: "#17131f", color: INK, borderRadius: "26px 26px 0 0", padding: "22px 18px calc(22px + env(safe-area-inset-bottom, 0px))",
        borderTop: "1px solid rgba(255,255,255,.1)", font: `500 15px ${font}`, boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

const CONFETTI = ["#FF4F94", "#ffd34f", "#7fd8ff", "#4be39a", "#ffffff", "#b48cff"];
const btn = (primary: boolean): React.CSSProperties => ({ width: "100%", height: 50, borderRadius: 25, border: primary ? "none" : "1px solid rgba(255,255,255,.18)",
  background: primary ? ACC : "rgba(255,255,255,.08)", color: "#fff", font: `800 15px ${font}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" });

/** The first time the 4 steps are done: a small celebration + share. */
export function CardReadySheet({ handle, onShare, onClose }: { handle: string; onShare?: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `https://www.myland.lol/${handle}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* the link is on screen anyway */ }
    setCopied(true);
  };
  return (
    <>
      <style>{`@keyframes mn-confetti{0%{transform:translateY(-20vh) rotate(0)}100%{transform:translateY(105vh) rotate(720deg)}}
        @media (prefers-reduced-motion: reduce){[data-confetti]{display:none}}`}</style>
      <div aria-hidden data-confetti="" style={{ position: "fixed", inset: 0, zIndex: 2147481210, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: 0, width: 8, height: 14, borderRadius: 2,
            background: CONFETTI[i % CONFETTI.length], animation: `mn-confetti ${2.2 + (i % 5) * 0.35}s ${(i % 7) * 0.12}s cubic-bezier(.3,.6,.5,1) both` }} />
        ))}
      </div>
      <Sheet label="Tu card está lista" onClose={onClose}>
        <div style={{ textAlign: "center", font: `800 24px ${font}` }}>¡Tu card está lista!</div>
        <div style={{ textAlign: "center", color: "rgba(246,243,248,.6)", margin: "6px 0 18px" }}>myland.lol/{handle}</div>
        <button type="button" style={btn(true)} onClick={copy}>{copied ? "¡Copiado! Pegalo en tu bio" : "Copiar link para tu bio"}</button>
        {onShare && <button type="button" style={{ ...btn(false), marginTop: 10 }} onClick={() => { onClose(); onShare(); }}>Subir como historia</button>}
        <button type="button" onClick={onClose} style={{ width: "100%", marginTop: 12, border: "none", background: "transparent", color: "rgba(246,243,248,.6)", font: `600 14px ${font}`, cursor: "pointer" }}>Seguir decorando</button>
      </Sheet>
    </>
  );
}

/** Once: the whole room (images, GIFs, texts, layers) lives in the desktop version. */
export function DesktopTipSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Versión de escritorio" onClose={onClose}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: "#fff", color: "#16141c", display: "grid", placeItems: "center", marginBottom: 14 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
      </div>
      <div style={{ font: `800 21px/1.25 ${font}` }}>Tu sala completa, en la versión de escritorio</div>
      <p style={{ margin: "10px 0 16px", color: "rgba(246,243,248,.7)", lineHeight: 1.5 }}>
        Imágenes, GIFs, textos y capas alrededor de tu card. Entrá a <b style={{ color: INK }}>myland.lol</b> desde tu PC o Mac con la misma cuenta: lo que hiciste acá ya está ahí.
      </p>
      <button type="button" style={btn(true)} onClick={onClose}>Entendido</button>
    </Sheet>
  );
}

const READY_KEY = "mnemo_card_ready_v1";
const DESK_KEY = "mnemo_desktop_tip_v1";
export const seen = (k: "ready" | "desk") => { try { return !!localStorage.getItem(k === "ready" ? READY_KEY : DESK_KEY); } catch { return true; } };
export const markSeen = (k: "ready" | "desk") => { try { localStorage.setItem(k === "ready" ? READY_KEY : DESK_KEY, "1"); } catch { /* ignore */ } };
