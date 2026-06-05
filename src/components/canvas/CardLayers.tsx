"use client";
import React, { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";

// Shared epoch so all floating cards stay in phase with each other.
const FLOAT_EPOCH = typeof window !== "undefined" ? Date.now() : 0;

function useCardAnimations(cardId: string, effects: CardEffects | undefined) {
  useEffect(() => {
    if (!effects?.animations?.floating) return;
    const id = `mnemo-anim-${cardId}`;
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    const a = effects.animations;
    const floatH = a.floatHeight ?? 8;
    el.textContent = `@keyframes mnemo-float-${cardId}{0%,100%{transform:translateY(0)}50%{transform:translateY(-${floatH}px)}}`;
    return () => { el?.remove(); };
  }, [cardId, effects?.animations]);
}

interface CardLayersProps {
  cardId:       string;
  effects?:     CardEffects;
  isSel?:       boolean;
  children:     React.ReactNode;
  borderRadius: number;
  style?:       CSSProperties;
  className?:   string;
}

export default function CardLayers({
  cardId, effects, isSel, children, borderRadius, style,
}: CardLayersProps) {
  useCardAnimations(cardId, effects);

  const bg   = effects?.bg;
  const glow = effects?.glow;
  const bord = effects?.border;
  const grad = effects?.gradient;
  const anim = effects?.animations;
  const sh   = effects?.shadow;

  const rad = bord?.radius ?? borderRadius;

  // Box shadow
  const glowColor = glow?.color ?? "#a855f7";
  const glowInt   = glow?.intensity ?? 0;
  const shadows: string[] = [];
  if (sh?.intensity && sh.intensity > 0) {
    const sColor = sh.color ?? "rgba(0,0,0,0.5)";
    const sBlur  = Math.round(sh.intensity * 40);
    shadows.push(`0 ${Math.round(sh.intensity * 8)}px ${sBlur}px ${sColor}`);
  } else {
    shadows.push("0 4px 20px rgba(0,0,0,0.2)");
  }
  if (glow?.outer && glowInt > 0) {
    shadows.push(`0 0 ${Math.round(glowInt * 30)}px ${glowColor}`);
    shadows.push(`0 0 ${Math.round(glowInt * 60)}px ${glowColor}40`);
  }
  if (isSel) shadows.push("0 0 0 1.5px rgba(255,255,255,0.35)");
  if (glow?.inner && glowInt > 0) {
    shadows.push(`inset 0 0 ${Math.round(glowInt * 20)}px ${glowColor}60`);
  }
  const boxShadow = shadows.join(", ");

  // Border
  const borderColor = bord?.color ?? (isSel ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)");
  const borderWidth = bord?.width ?? 1;
  const border      = `${borderWidth}px solid ${borderColor}`;

  // Background
  const bgColor   = bg?.color ?? "rgba(255,255,255,0.055)";
  const bgOpacity = bg?.opacity ?? 1;
  const bgBlur    = bg?.blur    ?? 0;
  const isGlass   = bg?.glass   ?? false;

  // Spotlight
  const spotlightColor = effects?.interactions?.spotlightColor ?? "rgba(255,255,255,0.12)";
  const spotlightSize  = effects?.interactions?.spotlightSize  ?? 65;
  const spotOn         = effects?.interactions?.spotlight       ?? false;

  // Wrapper animation — negative delay syncs all cards to the same global phase
  const wrapperAnimStyle: CSSProperties = {};
  if (anim?.floating) {
    const speed   = anim.floatSpeed ?? 3;
    const periodMs = speed * 1000;
    const phase    = (Date.now() - FLOAT_EPOCH) % periodMs;
    wrapperAnimStyle.animation = `mnemo-float-${cardId} ${speed}s ease-in-out -${phase}ms infinite`;
  }

  return (
    <div style={{
      ...style,
      ...wrapperAnimStyle,
      position: "absolute",
      inset: 0,
      borderRadius: rad,
      transform: "perspective(1000px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))",
      willChange: "transform",
    }}>

      {/* ── Layer 0a: Background fill (opacity-affected) ── */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: rad,
        ...(bg?.image ? bgImageStyle(bg.image, bg.imageMode) : { background: bgColor }),
        opacity:              bgOpacity,
        filter:               bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
        backdropFilter:       isGlass ? "blur(20px)" : undefined,
        WebkitBackdropFilter: isGlass ? "blur(20px)" : undefined,
      }} />
      {/* ── Layer 0b: Border + shadow (always full opacity) ── */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: rad,
        border,
        boxShadow,
        pointerEvents: "none",
      }} />

      {/* ── Layer 1: Gradient Overlay ── */}
      {grad && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          background: `linear-gradient(${grad.angle}deg,${grad.from},${grad.to})`,
          opacity: grad.opacity,
        }} />
      )}

      {/* ── Layer 2: Spotlight (follows cursor via CSS vars on parent) ── */}
      {spotOn && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          background: `radial-gradient(circle at var(--spot-x,50%) var(--spot-y,30%),${spotlightColor} 0%,transparent ${spotlightSize}%)`,
        }} />
      )}

      {/* ── Content Layer ── */}
      <div style={{ position: "absolute", inset: 0, borderRadius: rad }}>
        {children}
      </div>
    </div>
  );
}
