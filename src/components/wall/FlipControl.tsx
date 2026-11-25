"use client";
/**
 * Muro v2 (2026-11-26): the button that turns a card to its wall. It lives
 * INSIDE the card's layers (the `over` slot of CardLayers), so it tilts,
 * floats and moves with the card like a sticker. Where it sits, its size and
 * color are the owner's (card.commentsBox.button); in the editor it is
 * dragged anywhere on the card (a tap still turns the card).
 */
import React, { useRef } from "react";
import type { CommentsBoxStyle } from "@/types";
import { WallIcon } from "./WallParts";

export const FLIP_BTN_DEFAULT = { x: 0.9, y: 0.09, size: 32 } as const;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function flipButtonOf(s?: CommentsBoxStyle) {
  const b = s?.button;
  return {
    x: clamp(typeof b?.x === "number" ? b.x : FLIP_BTN_DEFAULT.x, 0, 1),
    y: clamp(typeof b?.y === "number" ? b.y : FLIP_BTN_DEFAULT.y, 0, 1),
    size: clamp(typeof b?.size === "number" ? b.size : FLIP_BTN_DEFAULT.size, 22, 56),
    color: b?.color && /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : null,
  };
}

export default function FlipControl({ style, onFlip, count, light, onMove }: {
  style?: CommentsBoxStyle;
  onFlip: () => void;
  count: number;
  light?: boolean;
  /** Editor: dragging moves it (fractions of the card, its center). */
  onMove?: (x: number, y: number) => void;
}) {
  const b = flipButtonOf(style);
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x0: number; y0: number; moved: boolean; rect: DOMRect } | null>(null);
  const ink = b.color ? (luma(b.color) > 0.6 ? "#111114" : "#ffffff") : light ? "#111114" : "#ffffff";
  const fill = b.color ?? (light ? "rgba(255,255,255,0.6)" : "rgba(14,14,18,0.5)");
  const icon = Math.round(b.size * 0.52);

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!onMove) return;
    const card = ref.current?.closest<HTMLElement>("[data-profile-card]");
    if (!card) return;
    drag.current = { x0: e.clientX, y0: e.clientY, moved: false, rect: card.getBoundingClientRect() };
    ref.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onMove) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.moved = true;
    const x = clamp((e.clientX - d.rect.left) / d.rect.width, 0.04, 0.96);
    const y = clamp((e.clientY - d.rect.top) / d.rect.height, 0.04, 0.96);
    if (ref.current) { ref.current.style.left = `${x * 100}%`; ref.current.style.top = `${y * 100}%`; }
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && onMove) {
      e.stopPropagation();
      const x = clamp((e.clientX - d.rect.left) / d.rect.width, 0.04, 0.96);
      const y = clamp((e.clientY - d.rect.top) / d.rect.height, 0.04, 0.96);
      onMove(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
      (ref.current as HTMLButtonElement & { _skipClick?: boolean })._skipClick = true;
    }
  };

  return (
    <button ref={ref} type="button" data-flip-control="" data-export-skip=""
      aria-label={`Dar vuelta: muro${count ? ` (${count})` : ""}`} title={onMove ? "Muro · arrastrá para moverlo" : "Muro"}
      onPointerDown={down} onPointerMove={move} onPointerUp={up}
      onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation(); e.preventDefault();
        const el = ref.current as (HTMLButtonElement & { _skipClick?: boolean }) | null;
        if (el?._skipClick) { el._skipClick = false; return; }
        onFlip();
      }}
      style={{ position: "absolute", left: `${b.x * 100}%`, top: `${b.y * 100}%`, transform: "translate(-50%, -50%)",
        height: b.size, minWidth: b.size, padding: count ? `0 ${Math.round(b.size * 0.3)}px 0 ${Math.round(b.size * 0.24)}px` : 0,
        borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        color: ink, background: fill, border: `1px solid ${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"}`,
        backdropFilter: b.color ? undefined : "blur(10px)", WebkitBackdropFilter: b.color ? undefined : "blur(10px)",
        cursor: onMove ? "grab" : "pointer", pointerEvents: "auto", touchAction: onMove ? "none" : "manipulation",
        font: `700 ${Math.max(10, Math.round(b.size * 0.36))}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` }}>
      <WallIcon size={icon} />
      {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
