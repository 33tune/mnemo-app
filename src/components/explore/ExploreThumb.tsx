"use client";
/**
 * Explorar (2026-11-26): one community card in the grid — the REAL card
 * (ProfileCard, public render) scaled to the cell. Mounted only while it is
 * on screen (the effects stop off screen), so a long grid stays light. The
 * whole cell is a link to the profile; the heart gives / removes a favorite.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ProfileCard from "@/components/canvas/ProfileCard";
import type { ProfileCardData } from "@/types";
import { HeartIcon } from "@/components/canvas/StatsRow";
import { liteEffects } from "@/lib/thumbImages";

// Every device gets the light version of each card (liteEffects): a grid of
// full cards with particles and motion dropped the frame rate while scrolling
// on a computer and ran iPhones out of memory.
const lite = true;

const noop = () => {};

export interface ExploreItem { userId: string; handle: string; name: string; isNew: boolean; favorite: boolean; card: ProfileCardData; room?: { wallpaper: string; bgColor: string } }

export default function ExploreThumb({ item, onFavorite, canFavorite, height = 170 }: {
  item: ExploreItem; onFavorite: (item: ExploreItem) => void; canFavorite: boolean; height?: number;
}) {
  const box = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);
  // Mounted once it has been on screen (mounting a card mid-scroll made the
  // scroll stutter); off screen it only pauses its effects.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (visible) setMounted(true); }, [visible]);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setW(el.clientWidth);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);
  const card = useMemo(() => (lite ? { ...item.card, effects: liteEffects(item.card.effects as Record<string, unknown> | undefined) } as ProfileCardData : item.card), [item.card]);
  const cw = Math.max(1, card.w || 320), ch = Math.max(1, card.h || 240);
  const pad = 14;
  const s = w ? Math.min((w - pad * 2) / cw, (height - pad * 2 - 18) / ch) : 0;

  return (
    <a ref={box} href={`/${item.handle}`} data-explore-card="" aria-label={`${item.name} (@${item.handle})`}
      style={{ position: "relative", display: "block", height, borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "#fff",
        background: item.room?.bgColor || "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", isolation: "isolate", contain: "layout paint", willChange: "transform" }}>
      {/* The card's own room behind it: transparent / glass cards need it. */}
      {item.room?.wallpaper && mounted && (
        <span aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url(${JSON.stringify(item.room.wallpaper)})`,
          backgroundSize: "cover", backgroundPosition: "center", opacity: .9 }} />
      )}
      <div aria-hidden {...(visible ? {} : { "data-fx-paused": "" })}
        style={{ position: "absolute", left: "50%", top: `calc(50% - 9px)`, width: cw, height: ch, transform: `translate(-50%, -50%) scale(${s})`,
          transformOrigin: "50% 50%", pointerEvents: "none" }}>
        {mounted && s > 0 && (
          <div style={{ position: "relative", width: cw, height: ch }}>
            <ProfileCard card={{ ...card, x: 0, y: 0 }} isSel={false} draggingId={null} parallaxTransform=""
              onMouseDown={noop} onClick={noop} onResizeMD={noop} updateProfile={noop} canInteract={false} />
          </div>
        )}
      </div>
      <span style={{ position: "absolute", left: 8, bottom: 8, maxWidth: "calc(100% - 52px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        font: "700 12px var(--font-sans, system-ui), sans-serif", background: "rgba(0,0,0,.6)", padding: "4px 9px", borderRadius: 99, zIndex: 2 }}>
        @{item.handle}
      </span>
      {item.isNew && (
        <span style={{ position: "absolute", right: 8, top: 8, font: "700 11px var(--font-sans, system-ui), sans-serif", background: "rgba(0,0,0,.6)", padding: "3px 8px", borderRadius: 99, zIndex: 2 }}>Nueva</span>
      )}
      {canFavorite && (
        <button type="button" aria-label={item.favorite ? `Sacar a @${item.handle} de favoritos` : `Agregar a @${item.handle} a favoritos`} aria-pressed={item.favorite}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(item); }}
          style={{ position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: 16, border: "none", display: "grid", placeItems: "center",
            background: "rgba(0,0,0,.6)", color: item.favorite ? "#FF4F94" : "#fff", cursor: "pointer", zIndex: 2, padding: 0 }}>
          <HeartIcon size={15} filled={item.favorite} />
        </button>
      )}
    </a>
  );
}
