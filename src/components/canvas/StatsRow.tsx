"use client";
/**
 * Visitas y favoritos (2026-11-06): an eye with the views and a heart with
 * the favorites, side by side (one block of the card, on / off together).
 * The heart works for a signed-in visitor (like Instagram: it fills with a
 * small pop); signed out, it offers to log in. Sizes in em of the block's
 * font, the same numbers the layout engine reserves (statsRowWidth).
 */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { formatViewCount, STATS_ICON_EM, STATS_ICON_GAP_EM, STATS_GROUP_GAP_EM } from "@/lib/profileCardLayout";
import { useFavorite, type FavoriteState } from "@/hooks/useFavorite";

const POP_CSS = `@keyframes mnemo-heart-pop{0%{transform:scale(1)}35%{transform:scale(1.35)}70%{transform:scale(.92)}100%{transform:scale(1)}}`;

export function EyeIcon({ size = "1em" }: { size?: string | number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", display: "block" }}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function HeartIcon({ size = "1em", filled }: { size?: string | number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", display: "block" }}>
      <path d="M12 20.5s-7.5-4.6-9.4-9.2C1.2 7.9 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.7 3.4 4.3 6.8-1.9 4.6-9.4 9.2-9.4 9.2Z" />
    </svg>
  );
}

/** "Iniciá sesión para dar favorito", for a few seconds at the bottom. */
export function useLoginPrompt() {
  const [open, setOpen] = useState(false);
  const show = () => { setOpen(true); window.setTimeout(() => setOpen(false), 3800); };
  const node = open && typeof document !== "undefined" ? createPortal(
    <div role="status" data-export-skip="" style={{
      position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 2147482500,
      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 18px", borderRadius: 999,
      background: "rgba(18,18,24,0.92)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)",
      font: "500 14px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", whiteSpace: "nowrap",
    }}>
      Iniciá sesión para dar favorito
      <a href={`/login?next=${encodeURIComponent(location.pathname)}`} style={{ color: "#0b0b0e", background: "#fff", borderRadius: 999, padding: "6px 12px", fontWeight: 600, textDecoration: "none" }}>Entrar</a>
    </div>,
    document.body,
  ) : null;
  return { show, node };
}

export default function StatsRow({ views, fav, interactive, style }: {
  views: number;
  fav: FavoriteState;
  /** The public profile: the heart can be tapped. */
  interactive: boolean;
  style?: React.CSSProperties;
}) {
  const [pop, setPop] = useState(0);
  const prompt = useLoginPrompt();
  const icon = `${STATS_ICON_EM}em`;
  const group: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: `${STATS_ICON_GAP_EM}em` };
  const onHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (fav.signedOut) { prompt.show(); return; }
    if (!fav.canLike) return;
    if (!fav.liked) setPop(p => p + 1);
    fav.toggle();
  };
  const heart = <span key={pop} style={{ display: "block", animation: pop ? "mnemo-heart-pop .42s cubic-bezier(.3,1.5,.5,1)" : undefined }}><HeartIcon size={icon} filled={fav.liked} /></span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: `${STATS_GROUP_GAP_EM}em`, whiteSpace: "nowrap", ...style }}>
      <style>{POP_CSS}</style>
      <span style={group} aria-label={`${views} visitas`}>
        <EyeIcon size={icon} />
        <span aria-hidden>{formatViewCount(views)}</span>
      </span>
      {interactive ? (
        <button type="button" onClick={onHeart} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
          aria-pressed={fav.liked} aria-label={fav.liked ? `Sacar favorito (${fav.count})` : `Dar favorito (${fav.count})`}
          style={{ ...group, font: "inherit", color: "inherit", letterSpacing: "inherit", background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          {heart}
          <span>{formatViewCount(fav.count)}</span>
        </button>
      ) : (
        <span style={group} aria-label={`${fav.count} favoritos`}>
          {heart}
          <span aria-hidden>{formatViewCount(fav.count)}</span>
        </span>
      )}
      {prompt.node}
    </div>
  );
}

/** The heart by "Compartir" on the public profile (the card's block is off). */
export function HeartPill({ ownerUserId }: { ownerUserId?: string }) {
  const fav = useFavorite(ownerUserId);
  const [pop, setPop] = useState(0);
  const prompt = useLoginPrompt();
  return (
    <>
      <style>{POP_CSS}</style>
      <button type="button" aria-pressed={fav.liked} aria-label={fav.liked ? "Sacar favorito" : "Dar favorito"}
        onClick={() => {
          if (fav.signedOut) { prompt.show(); return; }
          if (!fav.canLike) return;
          if (!fav.liked) setPop(p => p + 1);
          fav.toggle();
        }}
        style={{ width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center", padding: 0,
          border: "1px solid rgba(255,255,255,0.18)", background: "rgba(14,14,18,0.6)", color: fav.liked ? "#ff4d6d" : "#fff",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", cursor: "pointer" }}>
        <span key={pop} style={{ display: "block", animation: pop ? "mnemo-heart-pop .42s cubic-bezier(.3,1.5,.5,1)" : undefined }}>
          <HeartIcon size={19} filled={fav.liked} />
        </span>
      </button>
      {prompt.node}
    </>
  );
}
