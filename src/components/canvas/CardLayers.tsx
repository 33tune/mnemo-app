"use client";
import React, { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";

// Injects scoped CSS animations for this card into <head>
function useCardAnimations(cardId: string, effects: CardEffects | undefined) {
  useEffect(() => {
    if (!effects?.animations) return;
    const id = `mnemo-anim-${cardId}`;
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    const a = effects.animations;
    const floatH = a.floatHeight  ?? 8;
    const floatS = a.floatSpeed   ?? 3;
    const pulseS = a.pulseSpeed   ?? 1.8;
    const breathS = a.breathSpeed ?? 2.5;
    const sweepI  = a.sweepInterval ?? 4;

    let css = "";
    if (a.floating) {
      css += `@keyframes mnemo-float-${cardId}{0%,100%{transform:translateY(0)}50%{transform:translateY(-${floatH}px)}}`;
    }
    if (a.pulse) {
      css += `@keyframes mnemo-pulse-${cardId}{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.025);opacity:0.92}}`;
    }
    if (a.breathingGlow) {
      css += `@keyframes mnemo-breath-${cardId}{0%,100%{opacity:0.4}50%{opacity:1}}`;
    }
    if (a.shineSweep) {
      css += `@keyframes mnemo-sweep-${cardId}{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}`;
    }
    if (a.shimmer) {
      css += `@keyframes mnemo-shimmer-${cardId}{0%{background-position:200% center}100%{background-position:-200% center}}`;
    }
    if (a.borderAnimation) {
      css += `@keyframes mnemo-border-${cardId}{0%{--border-angle:0deg}100%{--border-angle:360deg}}`;
    }

    // Suppress unused-variable warnings
    void floatS; void pulseS; void breathS; void sweepI;

    el.textContent = css;
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
  const lays = effects?.layers;
  const anim = effects?.animations;
  const sh   = effects?.shadow;

  const rad = bord?.radius ?? borderRadius;

  // Box shadow: base + outer glow + shadow
  const glowColor = glow?.color ?? "#a855f7";
  const glowInt   = glow?.intensity ?? 0;
  const shadows: string[] = [];
  if (sh?.blur) {
    shadows.push(`${sh.x ?? 0}px ${sh.y ?? 4}px ${sh.blur}px ${sh.color ?? "rgba(0,0,0,0.35)"}`);
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
  const bgBright  = bg?.brightness ?? 1;
  const bgSat     = bg?.saturation ?? 1;
  const isGlass   = lays?.glass ?? false;
  const glassBlur = lays?.glassBlur ?? 20;

  const bgFilter: string[] = [];
  if (bgBlur > 0)    bgFilter.push(`blur(${bgBlur}px)`);
  if (bgBright !== 1) bgFilter.push(`brightness(${bgBright})`);
  if (bgSat !== 1)    bgFilter.push(`saturate(${bgSat})`);

  // Spotlight
  const spotlightColor = effects?.interactions?.spotlightColor ?? "rgba(255,255,255,0.12)";
  const spotOn         = effects?.interactions?.spotlight ?? false;

  // Shimmer on bg
  const shimmerStyle: CSSProperties = anim?.shimmer ? {
    backgroundImage:    "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.08) 50%,transparent 100%)",
    backgroundSize:     "200% 100%",
    animation:          `mnemo-shimmer-${cardId} 2.5s linear infinite`,
  } : {};

  // Breathing glow
  const hasBreathingGlow = !!(anim?.breathingGlow && glowInt > 0);

  // Wrapper animation (floating or pulse)
  const wrapperAnimStyle: CSSProperties = {};
  if (anim?.floating) {
    wrapperAnimStyle.animation = `mnemo-float-${cardId} ${anim.floatSpeed ?? 3}s ease-in-out infinite`;
  } else if (anim?.pulse) {
    wrapperAnimStyle.animation = `mnemo-pulse-${cardId} ${anim.pulseSpeed ?? 1.8}s ease-in-out infinite`;
  }

  return (
    <div style={{
      ...style,
      ...wrapperAnimStyle,
      position: "absolute",
      inset: 0,
      borderRadius: rad,
      // Tilt + magnetic via CSS vars set by useCardInteractions on the parent shell
      transform: "perspective(800px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg)) translate(var(--mag-x,0px),var(--mag-y,0px))",
      willChange: "transform",
      transition: "transform 0.15s ease",
    }}>

      {/* ── Layer 0: Background ── */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: rad,
        ...(bg?.image ? bgImageStyle(bg.image, bg.imageMode) : { background: bgColor }),
        opacity:              bgOpacity,
        filter:               bgFilter.length ? bgFilter.join(" ") : undefined,
        backdropFilter:       isGlass ? `blur(${glassBlur}px)` : undefined,
        WebkitBackdropFilter: isGlass ? `blur(${glassBlur}px)` : undefined,
        border,
        boxShadow,
        ...shimmerStyle,
      }} />

      {/* ── Layer 1: Noise Overlay ── */}
      {lays?.noise && lays.noise > 0 && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          opacity: lays.noise,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize:   "128px 128px",
          mixBlendMode:     "overlay",
        }} />
      )}

      {/* ── Layer 2: Grain ── */}
      {lays?.grain && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          opacity: 0.08,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.75' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          backgroundSize: "64px 64px",
          mixBlendMode:   "screen",
        }} />
      )}

      {/* ── Layer 3: Gradient Overlay ── */}
      {lays?.gradient && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          background: `linear-gradient(${lays.gradient.angle}deg,${lays.gradient.from},${lays.gradient.to})`,
          opacity: lays.gradient.opacity,
        }} />
      )}

      {/* ── Layer 4: Vignette ── */}
      {lays?.vignette && lays.vignette > 0 && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          background: `radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,${lays.vignette * 0.8}) 100%)`,
        }} />
      )}

      {/* ── Layer 5: Breathing Glow ── */}
      {hasBreathingGlow && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: rad + 4, pointerEvents: "none",
          boxShadow: `0 0 ${Math.round(glowInt * 40)}px ${glowColor},0 0 ${Math.round(glowInt * 80)}px ${glowColor}50`,
          animation: `mnemo-breath-${cardId} ${anim?.breathSpeed ?? 2.5}s ease-in-out infinite`,
        }} />
      )}

      {/* ── Layer 6: Shine Sweep ── */}
      {anim?.shineSweep && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad,
          pointerEvents: "none", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: "40%",
            background: "linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.12) 50%,transparent 70%)",
            animation: `mnemo-sweep-${cardId} ${anim.sweepInterval ?? 4}s ease-in-out infinite`,
          }} />
        </div>
      )}

      {/* ── Layer 7: Spotlight (follows cursor via CSS vars on parent) ── */}
      {spotOn && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
          // Uses --spot-x and --spot-y CSS vars set by useCardInteractions on the card shell
          // When mouse leaves, vars are set to -200% to move gradient off-card
          background: `radial-gradient(circle at var(--spot-x,50%) var(--spot-y,30%),${spotlightColor} 0%,transparent 65%)`,
        }} />
      )}

      {/* ── Content Layer ── */}
      <div style={{ position: "absolute", inset: 0, borderRadius: rad }}>
        {children}
      </div>
    </div>
  );
}
