"use client";
import React, { useEffect, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import { withOpacity } from "@/lib/cardColors";
import { useMotionKeyframes, resolveGlowPulseAnimation, resolveFlickerAnimation } from "@/lib/cardMotion";

// "Product closeout" (Parte 8): static SVG feTurbulence grain texture, same
// technique GuestbookWidget.tsx/MobilePublicCanvas.tsx already use for their
// static grain overlay — reused verbatim here as the VHS/analog noise layer,
// now toggleable/parametrized instead of baked into those two components.
const NOISE_DATA_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

  // Box shadow — Stage FASE 1: blur/offsetX/offsetY/opacity now independent
  // of `intensity`. Absent fields fall back to the exact formula this file
  // always used (blur = intensity*40, offsetY = intensity*8, offsetX = 0),
  // so a shadow with none of the new fields set looks byte-identical to
  // before this stage. `sColor` defaults to "#000000" (not the old literal
  // "rgba(0,0,0,0.5)" string) so it can be combined with an independent
  // opacity via withOpacity — when neither color nor opacity is set, the
  // math below reproduces that exact same rgba(0,0,0,0.5) look.
  const glowColor = glow?.color ?? "#a855f7";
  const glowInt   = glow?.intensity ?? 0;
  // Stage FASE 1: independent radius — absent falls back to intensity*30,
  // same base unit the old *60 (secondary falloff) and *20 (inner) layers
  // were already derived from (2x and 2/3x respectively) — preserved as
  // ratios off whichever base (default or overridden) applies. Left
  // unrounded here and rounded only at each usage site below — rounding
  // this shared base early and then multiplying would double-round and
  // drift by up to 1px from the original single-formula output at some
  // intensities (e.g. intensity 0.15 -> round(round(4.5)*2)=10 vs the
  // original round(9)=9); every derived layer below must independently
  // reproduce the pre-existing exact formula when glow.radius is absent.
  const glowBaseRadius = glow?.radius ?? glowInt * 30;
  // Stage FASE 3: plain shadow (+ selection ring) and glow are now built as
  // two SEPARATE layer strings, not one combined `boxShadow` — "border
  // animation" pulses only the glow's opacity (see the glow layer below),
  // and doing that on a div that also carries the plain drop-shadow/
  // selection ring would incorrectly pulse those too. Same "each effect
  // owns its own property on its own element" rule FASE 1 already
  // established for tilt/floating and border-opacity/shadow.
  const plainShadowLayers: string[] = [];
  if (sh?.intensity && sh.intensity > 0) {
    const sColorBase = sh.color ?? "#000000";
    const sOpacity   = sh.opacity ?? (sh.color ? 1 : 0.5);
    const sColor     = sColorBase.startsWith("#") ? withOpacity(sColorBase, sOpacity) : sColorBase;
    const sBlur      = sh.blur    ?? Math.round(sh.intensity * 40);
    const sOffsetX   = sh.offsetX ?? 0;
    const sOffsetY   = sh.offsetY ?? Math.round(sh.intensity * 8);
    plainShadowLayers.push(`${sOffsetX}px ${sOffsetY}px ${sBlur}px ${sColor}`);
  } else {
    plainShadowLayers.push("0 4px 20px rgba(0,0,0,0.2)");
  }
  if (isSel) plainShadowLayers.push("0 0 0 1.5px rgba(255,255,255,0.35)");
  const boxShadow = plainShadowLayers.join(", ");

  const glowLayers: string[] = [];
  if (glow?.outer && glowInt > 0) {
    glowLayers.push(`0 0 ${Math.round(glowBaseRadius)}px ${glowColor}`);
    glowLayers.push(`0 0 ${Math.round(glowBaseRadius * 2)}px ${glowColor}40`);
  }
  if (glow?.inner && glowInt > 0) {
    glowLayers.push(`inset 0 0 ${Math.round(glowBaseRadius * (2 / 3))}px ${glowColor}60`);
  }
  const glowBoxShadow = glowLayers.join(", ");
  const glowPulseOn = glow?.animation?.enabled ?? false;

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

  // Stage FASE 3: hoverGlow (own opacity layer below, driven by the
  // `--hover-glow` CSS var useCardInteractions.ts sets on mouseenter/leave)
  // reuses the card's own glow color when one is configured, falling back
  // to the same default glow color as the static Glow effect — so a card
  // with no glow configured at all still gets a sensible hover accent
  // instead of needing the user to set up static Glow first. It's a plain
  // CSS `transition` on opacity, not a looping @keyframes animation, so it
  // doesn't need the shared motion keyframes below — only glowPulseOn does.
  const hoverGlowOn = effects?.interactions?.hoverGlow ?? false;

  // "Product closeout" (Parte 8): composable analog/retro screen effects —
  // each independently toggled/configured, CSS/SVG-data-URI only. Scanlines
  // and noise are static overlay layers on top of content (Layer 4);
  // chromatic aberration is applied directly to the Content Layer's own
  // `filter` (drop-shadow-based RGB fringing, the standard lightweight CSS
  // technique — no cloning of children, no canvas); flicker reuses the
  // shared glow-pulse-style keyframe system (cardMotion.ts) exactly like
  // glow's own animation does.
  const retro = effects?.retro;
  const scanlines = retro?.scanlines;
  const noise = retro?.noise;
  const flicker = retro?.flicker;
  const chroma = retro?.chromaticAberration;
  const chromaOffset = 0.5 + (chroma?.intensity ?? 0.4) * 2.5;
  const chromaOpacity = 0.35 + (chroma?.intensity ?? 0.4) * 0.35;
  const contentFilter = chroma?.enabled
    ? `drop-shadow(${chromaOffset.toFixed(2)}px 0 0 rgba(255,0,80,${chromaOpacity.toFixed(2)})) drop-shadow(-${chromaOffset.toFixed(2)}px 0 0 rgba(0,220,255,${chromaOpacity.toFixed(2)}))`
    : undefined;

  useMotionKeyframes(glowPulseOn || !!flicker?.enabled);

  return (
    // Stage FASE 1: floating (outer, owns `animation`) and tilt (inner, owns
    // the static `transform`) are now two nested elements instead of one
    // sharing both — a CSS animation and an inline `transform` on the SAME
    // element compete for that property, and the animation always wins while
    // running, which is why tilt went dead whenever floating was also on
    // (confirmed bug, not just "to verify" — see CLAUDE.md). Nesting lets
    // each own a DIFFERENT element's `transform`/`animation`, so both
    // genuinely compose (floating's translateY, tilt's rotateX/rotateY) —
    // still one animation system, just no longer forced onto one element.
    <div style={{ ...wrapperAnimStyle, position: "absolute", inset: 0 }}>
      {/* Stage FASE 3: hover-scale — its own nested wrapper, owns `transform:
          scale(...)` via a CSS var + CSS `transition` (not a @keyframes
          animation, so it can't fight floating's `animation` even though
          both are on ancestors of the tilt div below). Absent/1 -> scale(1),
          a no-op, byte-identical to before this stage. */}
      <div style={{
        position: "absolute", inset: 0,
        transform: "scale(var(--hover-scale,1))",
        transition: "transform 0.2s ease",
        willChange: "transform",
      }}>
        <div style={{
          ...style,
          position: "absolute",
          inset: 0,
          borderRadius: rad,
          transform: "perspective(1000px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))",
          willChange: "transform",
        }}>

          {/* ── Layer 0a: Background fill (opacity-affected) ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: rad,
            // Stage FASE 1: backgroundColor always applied (not an either/or
            // with the image) — bgImageStyle only ever sets backgroundImage/
            // -size/-position/-repeat (longhand, never the `background`
            // shorthand that used to wipe this out), so color shows through
            // wherever the image doesn't fully cover (repeat-mode gaps,
            // transparent regions) instead of being silently discarded.
            backgroundColor: bgColor,
            ...(bg?.image ? bgImageStyle(bg.image, bg.imageMode) : {}),
            opacity:              bgOpacity,
            filter:               bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
            backdropFilter:       isGlass ? "blur(20px)" : undefined,
            WebkitBackdropFilter: isGlass ? "blur(20px)" : undefined,
          }} />
          {/* ── Layer 0b-glow: Glow only (own opacity/animation — Stage FASE 3:
               split out of the combined shadow so "border animation" can
               pulse ONLY this layer's opacity without also pulsing the plain
               drop-shadow or the selection ring) ── */}
          {glowBoxShadow && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: rad,
              boxShadow: glowBoxShadow,
              pointerEvents: "none",
              animation: glowPulseOn ? resolveGlowPulseAnimation(glow?.animation?.speed ?? 1) : undefined,
            }} />
          )}
          {/* ── Layer 0b: Plain shadow + selection ring (never affected by
               border opacity, never affected by glow's pulse) ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: rad,
            boxShadow,
            pointerEvents: "none",
          }} />
          {/* ── Layer 0c: Border (own independent opacity — Stage FASE 1: split
               out of 0b so lowering border opacity no longer also fades the
               shadow/glow/selection ring it used to share a layer with) ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: rad,
            border,
            opacity: bord?.opacity ?? 1,
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

          {/* ── Layer 3: Hover glow (Stage FASE 3 — own opacity, CSS-transitioned
               via the `--hover-glow` var useCardInteractions.ts sets on
               mouseenter/leave; independent of the static Glow effect above,
               though it reuses the same color when one's configured) ── */}
          {hoverGlowOn && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
              boxShadow: `0 0 24px ${glowColor}80, 0 0 48px ${glowColor}40`,
              opacity: "var(--hover-glow, 0)",
              transition: "opacity 0.25s ease",
            }} />
          )}

          {/* ── Content Layer ── */}
          <div style={{ position: "absolute", inset: 0, borderRadius: rad, filter: contentFilter }}>
            {children}
          </div>

          {/* ── Layer 4: Retro/CRT overlays (Parte 8 — on top of content,
               the classic "screen effect" look; each fully independent) ── */}
          {scanlines?.enabled && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
              backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 3px)",
              opacity: (scanlines.intensity ?? 0.5) * 0.35,
              mixBlendMode: "multiply",
            }} />
          )}
          {noise?.enabled && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none",
              backgroundImage: NOISE_DATA_URI,
              opacity: (noise.intensity ?? 0.5) * 0.5,
              mixBlendMode: "overlay",
            }} />
          )}
          {flicker?.enabled && (
            <div style={{ position: "absolute", inset: 0, borderRadius: rad, pointerEvents: "none", opacity: flicker.intensity ?? 0.5 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: rad,
                background: "#000", mixBlendMode: "multiply",
                animation: resolveFlickerAnimation(flicker.speed ?? 1),
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
