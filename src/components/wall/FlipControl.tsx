"use client";
/**
 * Muro (2026-11-25): what turns a card to its wall, drawn on the card. Two
 * versions to compare (the owner of the product picks): a small phone button
 * in the card's corner ("button", default) or a tab sticking out of the card's
 * right edge ("tab", with ?flip=tab — remembered on this device).
 */
import React from "react";
import { PhoneIcon } from "./WallParts";

export type FlipVariant = "button" | "tab";

export function flipVariantFromUrl(): FlipVariant {
  if (typeof window === "undefined") return "button";
  try {
    const q = new URLSearchParams(location.search).get("flip");
    if (q === "tab" || q === "button") localStorage.setItem("mnemo_flip_variant", q);
    return localStorage.getItem("mnemo_flip_variant") === "tab" ? "tab" : "button";
  } catch { return "button"; }
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export default function FlipControl({ variant, onFlip, count, light }: { variant: FlipVariant; onFlip: () => void; count: number; light?: boolean }) {
  const ink = light ? "#111114" : "#ffffff";
  const glass = light ? "rgba(255,255,255,0.55)" : "rgba(14,14,18,0.45)";
  const common: React.CSSProperties = {
    position: "absolute", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: 0,
    color: ink, background: glass, border: `1px solid ${light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.22)"}`,
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", cursor: "pointer",
    font: "700 11px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", touchAction: "manipulation",
  };
  const label = `Dar vuelta: muro${count ? ` (${count})` : ""}`;
  const handlers = {
    onMouseDown: stop, onPointerDown: stop, onTouchStart: stop, onTouchEnd: stop,
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); onFlip(); },
  };
  if (variant === "tab") {
    return (
      <button type="button" data-flip-control="" data-export-skip="" aria-label={label} title="Muro" {...handlers}
        style={{ ...common, right: -24, top: "50%", transform: "translateY(-50%)", width: 24, height: 68, flexDirection: "column",
          borderRadius: "0 12px 12px 0", borderLeft: "none" }}>
        <PhoneIcon size={15} />
        {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
      </button>
    );
  }
  return (
    <button type="button" data-flip-control="" data-export-skip="" aria-label={label} title="Muro" {...handlers}
      style={{ ...common, top: 10, right: 10, height: 32, minWidth: 32, padding: count ? "0 9px 0 7px" : 0, borderRadius: 999 }}>
      <PhoneIcon size={16} />
      {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}
