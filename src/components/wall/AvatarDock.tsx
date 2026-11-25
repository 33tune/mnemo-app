"use client";
/**
 * Muro v2 (2026-11-26): your profile photo, round, at the bottom-left of every
 * page — a tap takes you home (your card). The little "+" bubble on it writes
 * on YOUR wall from anywhere (like Instagram's notes), with the same style bar
 * as the wall. A dot when something new happened on your wall.
 */
import React, { useEffect, useRef, useState } from "react";
import { useMe, useUnreadActivity, useWall } from "@/hooks/useWall";
import { Avatar, Composer, CloseIcon, roundBtn, UI_FONT } from "./WallParts";

const ACCENT = "#ff4d6d";

export interface AvatarDockProps {
  left?: number;
  bottom?: number;
  /** In the editor (already home): the photo turns your card to its wall instead. */
  onHome?: (unread: boolean) => void;
}

export default function AvatarDock(p: AvatarDockProps) {
  const me = useMe();
  const unread = useUnreadActivity(!!me);
  const [compose, setCompose] = useState(false);
  const left = (p.left ?? 0) + 16;
  const bottom = p.bottom ?? 16;
  const pos: React.CSSProperties = { position: "fixed", left, bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, zIndex: 2147481000 };

  if (me === undefined) return null;
  if (me === null) {
    return (
      <a href="/" aria-label="myLand" data-export-skip="" data-mnemo-ui=""
        style={{ ...pos, width: 46, height: 46, borderRadius: 99, display: "grid", placeItems: "center", background: "rgba(14,14,18,0.6)",
          border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <img src="/logo.png" alt="" width={26} height={26} style={{ display: "block", objectFit: "contain" }} />
      </a>
    );
  }
  const homeHref = unread > 0 ? "/dashboard?muro=1&tab=news" : "/dashboard";
  return (
    <>
      <div data-export-skip="" data-mnemo-ui="" style={{ ...pos, width: 46, height: 46 }} onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        {p.onHome ? (
          <button type="button" onClick={() => p.onHome?.(unread > 0)} aria-label={`Tu muro${unread ? `, ${unread} nuevos` : ""}`} title={`@${me.handle}`}
            style={{ width: 46, height: 46, padding: 0, border: "none", borderRadius: 99, cursor: "pointer", background: "transparent", boxShadow: "0 0 0 2px rgba(255,255,255,.85), 0 8px 24px rgba(0,0,0,.35)" }}>
            <Avatar a={me} size={46} round />
          </button>
        ) : (
          <a href={homeHref} aria-label={`Ir a mi card${unread ? `, ${unread} nuevos` : ""}`} title={`@${me.handle}`}
            style={{ display: "block", width: 46, height: 46, borderRadius: 99, boxShadow: "0 0 0 2px rgba(255,255,255,.85), 0 8px 24px rgba(0,0,0,.35)" }}>
            <Avatar a={me} size={46} round />
          </a>
        )}
        {unread > 0 && (
          <span aria-hidden style={{ position: "absolute", left: -2, top: -2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99, boxSizing: "border-box",
            background: ACCENT, color: "#fff", font: `700 10px/16px ${UI_FONT}`, textAlign: "center", boxShadow: "0 0 0 2px #0f0e13" }}>{unread > 9 ? "9+" : unread}</span>
        )}
        <button type="button" onClick={() => setCompose(c => !c)} aria-label="Publicar en tu muro" aria-expanded={compose} title="Publicar"
          style={{ position: "absolute", right: -8, top: -8, width: 24, height: 24, borderRadius: 99, padding: 0, border: "2px solid #0f0e13", cursor: "pointer",
            display: "grid", placeItems: "center", background: "#fff", color: "#111", boxShadow: "0 4px 12px rgba(0,0,0,.35)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      {compose && <ComposeSheet meId={me.id} left={left} bottom={bottom + 58} onClose={() => setCompose(false)} />}
    </>
  );
}

function ComposeSheet({ meId, left, bottom, onClose }: { meId: string; left: number; bottom: number; onClose: () => void }) {
  const w = useWall(meId, false);
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div ref={ref} role="dialog" aria-label="Publicar en tu muro" data-mnemo-ui="" data-export-skip=""
      onMouseDown={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      style={{ position: "fixed", left: Math.max(8, left - 8), bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, zIndex: 2147481600,
        width: "min(360px, calc(100vw - 16px))", padding: 12, borderRadius: 22, background: "#141318", color: "#f4f2f7",
        border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 24px 60px rgba(0,0,0,.5)", font: `500 14px ${UI_FONT}` }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ ...roundBtn, width: 28, height: 28, color: "#f4f2f7", background: "rgba(255,255,255,.08)" }}><CloseIcon size={13} /></button>
      </div>
      {done ? (
        <p role="status" style={{ margin: "8px 4px 6px", textAlign: "center", color: "#f4f2f7" }}>Publicado en tu muro</p>
      ) : (
        <Composer ink="#f4f2f7" accent={ACCENT} wallBg="#141318" placeholder="¿Qué estás pensando?" autoFocus
          onSend={async (body, style) => {
            const e = await w.post(body, style, null);
            if (!e) { setDone(true); window.setTimeout(onClose, 1100); }
            return e;
          }} />
      )}
    </div>
  );
}
