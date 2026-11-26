"use client";
/**
 * Muro v3 (2026-11-26): the button on the card that turns it to its wall. A
 * block of the card's free engine (profileCardLayout › placeInFreeSpace): it
 * sits in free space, never on another block, and is dragged like the others
 * in the editor. Its look is the owner's: a standard "feed" icon (or three
 * others), their own image / GIF, round or loose, size and color.
 */
import React from "react";
import type { CommentsBoxStyle, WallButtonIcon } from "@/types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function flipButtonOf(s?: CommentsBoxStyle) {
  const b = s?.button;
  return {
    size: clamp(typeof b?.size === "number" ? b.size : 34, 24, 64),
    color: b?.color && /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : null,
    icon: (b?.icon ?? "feed") as WallButtonIcon,
    image: b?.image && /^https?:\/\//.test(b.image) ? b.image : null,
    shape: b?.shape === "none" ? "none" as const : "circle" as const,
  };
}

/** The four icons (24×24, currentColor) — the first is the standard one. */
export function WallButtonGlyph({ icon, size }: { icon: WallButtonIcon; size: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, style: { display: "block" } };
  switch (icon) {
    case "stack": return <svg {...p}><rect x="4" y="9" width="16" height="11" rx="2.5" /><path d="M6.5 6h11M9 3h6" /><path d="M8 13.5h8M8 16.5h5" /></svg>;
    case "bubble": return <svg {...p}><path d="M20 11.5c0 4-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4 19.5l1.3-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z" /><path d="M8.5 10h7M8.5 13h4.5" /></svg>;
    case "pencil": return <svg {...p}><path d="M5 3.5h9l5 5v12H5z" /><path d="M14 3.5v5h5" /><path d="M8.5 13h7M8.5 16.5h4" /></svg>;
    default: return <svg {...p}><rect x="4.5" y="3.5" width="15" height="17" rx="2.6" /><path d="M8 8h8M8 11.5h8M8 15h5" /></svg>;
  }
}
export const WALL_ICONS: WallButtonIcon[] = ["feed", "stack", "bubble", "pencil"];

function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export default function FlipControl({ style, rect, light, onFlip, editing, active, down }: {
  style?: CommentsBoxStyle;
  /** Its place on the card (px, card coordinates) — from the engine. */
  rect: { x: number; y: number; w: number; h: number };
  light?: boolean;
  onFlip: () => void;
  /** Editor: draggable (mouse or finger) through the card's own block drag. */
  editing?: boolean;
  /** Editor, Muro › Botón: dashed outline. */
  active?: boolean;
  down?: React.DOMAttributes<HTMLButtonElement>;
}) {
  const b = flipButtonOf(style);
  const round = b.shape === "circle";
  const ink = b.color ? (luma(b.color) > 0.6 ? "#111114" : "#ffffff") : light ? "#111114" : "#ffffff";
  const fill = b.color ?? (light ? "rgba(255,255,255,0.62)" : "rgba(14,14,18,0.52)");
  return (
    <button type="button" data-flip-control="" data-export-skip="" aria-label="Ver el muro" title="Muro"
      {...down}
      onTouchStart={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); e.preventDefault(); onFlip(); }}
      style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, padding: 0, zIndex: 60,
        display: "grid", placeItems: "center", overflow: "hidden", color: ink, cursor: editing ? "grab" : "pointer",
        pointerEvents: "auto", touchAction: editing ? "none" : "manipulation", transition: "left .18s ease, top .18s ease",
        borderRadius: round ? 999 : 8,
        background: round && !b.image ? fill : "transparent",
        border: round && !b.image ? `1px solid ${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"}` : "none",
        backdropFilter: round && !b.image && !b.color ? "blur(10px)" : undefined, WebkitBackdropFilter: round && !b.image && !b.color ? "blur(10px)" : undefined,
        boxShadow: round && b.image ? `0 0 0 1px ${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"}` : undefined,
        outline: active ? "1.5px dashed currentColor" : undefined, outlineOffset: 4 }}>
      {b.image
        ? <img src={b.image} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: round ? "cover" : "contain", display: "block", pointerEvents: "none" }} />
        : <span style={{ color: round ? ink : (b.color ?? ink), filter: round ? undefined : "drop-shadow(0 1px 2px rgba(0,0,0,.45))" }}><WallButtonGlyph icon={b.icon} size={Math.round(rect.w * (round ? 0.52 : 0.9))} /></span>}
    </button>
  );
}
