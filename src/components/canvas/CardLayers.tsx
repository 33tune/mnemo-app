"use client";
import React, { useEffect, useMemo, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import { bgImageStyle } from "@/lib/bgStyle";
import { withOpacity } from "@/lib/cardColors";
import StrassRing, { useStrassColors } from "./StrassRing";
import { HoloSheet, GlareSheet, EdgeRim, AuraHalo, DustField, SparkleField, SealBadge, BorderRun, Sweep } from "./CardFx";
import { useMotionKeyframes, resolveGlowPulseAnimation, resolveFlickerAnimation } from "@/lib/cardMotion";
import { holoOn, glareOn, useFoilKeyframes, entranceShineAnimation, holoScopeOf } from "@/lib/cardFoil";
import { useFxKeyframes, fxKeyframesOn, motionAnimations, sweepKeyframes, sweepColor } from "@/lib/cardFx";

// "Product closeout" (Parte 8): static SVG feTurbulence grain texture, same
// technique GuestbookWidget.tsx/MobilePublicCanvas.tsx already use for their
// static grain overlay — reused verbatim here as the VHS/analog noise layer,
// now toggleable/parametrized instead of baked into those two components.
const NOISE_DATA_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Shared epoch so all floating cards stay in phase with each other.
const FLOAT_EPOCH = typeof window !== "undefined" ? Date.now() : 0;

function useCardAnimations(cardId: string, effects: CardEffects | undefined) {
  // Animation lifecycle fix ("Product closeout" maintenance): the dependency
  // here MUST be the primitive values this effect actually reads (floating
  // flag + floatHeight), not the `effects.animations` object itself.
  // `effects` (and therefore `effects.animations`) is rebuilt as a brand-new
  // object on every render of the caller (ProfileCard.tsx's `effectiveEffects`
  // and every card widget's own local equivalent both construct it fresh
  // inline) — depending on that reference meant this effect re-ran on every
  // single render while floating was on, tearing down and recreating the
  // `<style>` tag (and therefore restarting the float animation) far more
  // often than floatHeight itself ever actually changed. Floating's actual
  // lifecycle is now stable across re-renders; it only re-injects when the
  // toggle or height genuinely changes.
  const floatOn = effects?.animations?.floating ?? false;
  const floatH  = effects?.animations?.floatHeight ?? 8;
  // "Destello que cruza" (2026-11-11) bakes its interval the same way.
  const sweepCss = sweepKeyframes(cardId, effects)?.css ?? "";
  useEffect(() => {
    if (!floatOn && !sweepCss) return;
    const id = `mnemo-anim-${cardId}`;
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = (floatOn ? `@keyframes mnemo-float-${cardId}{0%,100%{transform:translateY(0)}50%{transform:translateY(-${floatH}px)}}` : "") + sweepCss;
    return () => { el?.remove(); };
  }, [cardId, floatOn, floatH, sweepCss]);
}

interface CardLayersProps {
  cardId:       string;
  effects?:     CardEffects;
  isSel?:       boolean;
  children:     React.ReactNode;
  borderRadius: number;
  style?:       CSSProperties;
  className?:   string;
  /** Card stickers (ProfileCard): behind the card · in front of its
   * background (the blocks' own z-index still paints them over these, as it
   * always did) · above everything (`over`, its own top stacking layer). */
  back?:        React.ReactNode;
  front?:       React.ReactNode;
  over?:        React.ReactNode;
  /** Public view: play the one-time entrance light sweep (effects.entrance.shine). */
  entering?:    boolean;
  /** Delay of the card's entrance (ms), so the sweep follows it. */
  enterDelayMs?: number;
  /** The card's background is light (the foil tints instead of adding light). */
  lightCard?:   boolean;
  /** The card's size in px (the foil pattern, the border ring, the stones). */
  cardW?:       number;
  cardH?:       number;
  /** The card's own colors (the "Mi card" palette of the effects). */
  cardColors?:  readonly string[];
}

export default function CardLayers({
  cardId, effects, isSel, children, borderRadius, style, back, front, over, entering, enterDelayMs = 0, lightCard = false, cardW = 0, cardH = 0, cardColors,
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

  // Wrapper animation — negative delay syncs all cards to the same global
  // phase. Animation lifecycle fix: `phase` used to be computed inline from
  // `Date.now()` on every render, which produced a DIFFERENT `animation`
  // shorthand string each time (a few ms apart) even when nothing about the
  // animation actually changed — React's style diffing then reassigned
  // `style.animation` on every re-render, which restarts a CSS animation's
  // timeline. `useMemo` computes the phase once per (cardId, speed) pair, so
  // the string — and therefore the running animation — stays untouched
  // across ordinary re-renders (e.g. the parallax-driven ones that fire up
  // to 60x/sec while the mouse is moving).
  const floatSpeed = anim?.floating ? (anim.floatSpeed ?? 3) : 0;
  const floatPhase = useMemo(
    () => (floatSpeed > 0 ? (Date.now() - FLOAT_EPOCH) % (floatSpeed * 1000) : 0),
    [cardId, floatSpeed],
  );
  const wrapperAnimStyle: CSSProperties = {};
  // Card animations (2026-11-11, cardFx.ts): Respirar / Balanceo use the
  // separate `scale` / `rotate` properties, so they add up with Flotar's
  // `transform` on this same element; Latido goes on the hover-scale wrapper.
  const motion = motionAnimations(effects);
  const outerAnims = [
    ...(anim?.floating ? [`mnemo-float-${cardId} ${floatSpeed}s ease-in-out -${floatPhase}ms infinite`] : []),
    ...motion.outer,
  ];
  if (outerAnims.length) wrapperAnimStyle.animation = outerAnims.join(", ");

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
  const chromaFilter = chroma?.enabled
    ? `drop-shadow(${chromaOffset.toFixed(2)}px 0 0 rgba(255,0,80,${chromaOpacity.toFixed(2)})) drop-shadow(-${chromaOffset.toFixed(2)}px 0 0 rgba(0,220,255,${chromaOpacity.toFixed(2)}))`
    : undefined;
  const contentFilter = chromaFilter;

  useMotionKeyframes(glowPulseOn || !!flicker?.enabled);

  // Holo / Reflejo and the rest of the light effects (cardFoil.ts,
  // cardFx.ts): layers painted once, moved with the light by transforms
  // (useCardInteractions › applyLight).
  const holo = effects && holoOn(effects) ? effects : undefined;
  const glare = effects && glareOn(effects) ? effects : undefined;
  const shine = entering ? entranceShineAnimation(effects, enterDelayMs) : undefined;
  const sweep = sweepKeyframes(cardId, effects);
  useFoilKeyframes(!!holo || !!shine);
  useFxKeyframes(fxKeyframesOn(effects) || !!holo);
  // Where the foil goes: the whole card, under the content ("bg"), only the
  // border ring — "photo" is drawn by ProfileCard inside the photo itself.
  const scope = holoScopeOf(effects);
  const box = cardW > 0 && cardH > 0 ? { w: cardW, h: cardH } : undefined;
  const holoLayer = holo && box && scope !== "photo"
    ? <HoloSheet fx={holo} box={box} radius={rad} lightCard={lightCard} cardColors={cardColors} ring={scope === "border"} />
    : null;
  const holoOverAll = holo && scope !== "bg";
  const strass = effects?.strass?.enabled && box ? effects.strass : undefined;
  const strassPalette = useStrassColors(effects, cardColors);
  const fx = box ? effects : undefined;
  const glitterScope = fx?.glitter?.enabled ? fx.glitter.scope : undefined;
  const dustBack = fx?.dust?.enabled && fx.dust.layer === "back";

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
    <div style={{ ...wrapperAnimStyle, ...(motion.vars as CSSProperties), position: "absolute", inset: 0 }}>
      {/* Stage FASE 3: hover-scale — its own nested wrapper, owns `transform:
          scale(...)` via a CSS var + CSS `transition` (not a @keyframes
          animation, so it can't fight floating's `animation` even though
          both are on ancestors of the tilt div below). Absent/1 -> scale(1),
          a no-op, byte-identical to before this stage. */}
      <div data-press-layer="" style={{
        position: "absolute", inset: 0,
        transform: "scale(var(--hover-scale,1))",
        transition: "transform 0.2s ease",
        ...(motion.inner.length ? { animation: motion.inner.join(", ") } : {}),
      }}>
        <div data-tilt-layer="" style={{
          ...style,
          position: "absolute",
          inset: 0,
          borderRadius: rad,
          // Flat unless tilted right now (useCardInteractions writes this
          // layer's transform while tilting): no permanent 3D layer — iPhone
          // Safari dropped the see-through background of a card under one.
          transform: "var(--tilt-tf, none)",
        }}>
          {/* Aura: the halo behind everything, stickers included. */}
          {fx?.aura?.enabled && box ? <AuraHalo fx={fx} box={box} cardColors={cardColors} /> : null}
          {/* Card stickers behind the card (2026-10-27): inside the tilt /
              hover-scale / floating wrappers, so they move with the card. */}
          {back}

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

          {/* Holográfico on the background only (scope "bg"). */}
          {holo && !holoOverAll ? holoLayer : null}
          {dustBack && fx && box ? <DustField fx={fx} box={box} radius={rad} cardColors={cardColors} /> : null}

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
          {/* No isolation here on purpose: existing cards were designed with
              "front" stickers (and the retro overlays) under the blocks that
              have their own z-index. "Encima de todo" stickers use `over`. */}
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
              // No blend mode (2026-11-11): black multiplied = black painted,
              // pixel for pixel, and a blend made the browser re-mix the
              // whole card under it.
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
                background: "#000",
                animation: resolveFlickerAnimation(flicker.speed ?? 1),
              }} />
            </div>
          )}
          {/* Card stickers in front of the card's background. */}
          {front}
          {/* Over the card, bottom to top: the foil, the particles, what
              lives on the border, the seal, the glare and the sweeps — all
              under the "encima de todo" stickers. */}
          {holoOverAll ? holoLayer : null}
          {fx?.dust?.enabled && !dustBack && box ? <DustField fx={fx} box={box} radius={rad} cardColors={cardColors} /> : null}
          {fx && box && (glitterScope === "card" || glitterScope === "border")
            ? <SparkleField fx={fx} box={box} radius={rad} scope={glitterScope} cardColors={cardColors} /> : null}
          {fx?.edge?.enabled && box ? <EdgeRim fx={fx} box={box} radius={rad} /> : null}
          {strass && box ? <StrassRing w={box.w} h={box.h} radius={rad} cfg={strass} colors={strassPalette} /> : null}
          {fx?.motion?.borderRun?.enabled && box ? <BorderRun fx={fx} box={box} radius={rad} cardColors={cardColors} /> : null}
          {fx?.seal?.enabled && box ? <SealBadge fx={fx} box={box} cardColors={cardColors} /> : null}
          {glare && box ? <GlareSheet fx={glare} box={box} radius={rad} /> : null}
          {shine ? <Sweep animation={shine} radius={rad} /> : null}
          {sweep && !shine ? <Sweep animation={sweep.animation} radius={rad} color={sweepColor(effects)} /> : null}
          {/* Onda: the ripples of a tap are added here (useCardInteractions › press). */}
          {effects?.motion?.ripple?.enabled ? <div data-ripple-host="" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: rad, overflow: "hidden", pointerEvents: "none" }} /> : null}
          {/* "Encima de todo" stickers: their own layer above every block. */}
          {over ? <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none" }}>{over}</div> : null}
        </div>
      </div>
    </div>
  );
}
