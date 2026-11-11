"use client";
/**
 * The layers of the card effects (2026-11-11): Holo, Reflejo, Canto
 * metálico, Aura, Polvo, glitter over the card / border, Sello, the border
 * light and the sweep. Thin views over cardFoil.ts / cardFx.ts: each layer is
 * painted once and moved by a transform (lightLayers.ts) or by a CSS
 * animation of transform / opacity — nothing repaints per frame.
 *
 * `data-light` = reads --la (the light is held); `data-lm` = moved with the
 * light; `data-fx-heavy` = dropped first when the device can't keep up.
 */
import React, { useMemo, type CSSProperties } from "react";
import type { CardEffects } from "@/types";
import {
  holoLayers, holoGroupStyle, glareLayers, glareGroupStyle, ringMask, holoRingWidth, holoScopeOf, type FoilLayer, type FoilBox,
} from "@/lib/cardFoil";
import { auraSpec, dustLayers, edgeSpec, sealSpec, sealClip, sparkleField, borderRunSpec, sweepColor } from "@/lib/cardFx";
import { lm } from "@/lib/lightLayers";
import { rgba } from "@/lib/fxPalette";

function Layers({ layers }: { layers: FoilLayer[] }) {
  return (
    <>
      {layers.map(l => l.img
        // eslint-disable-next-line @next/next/no-img-element
        ? <img key={l.key} alt="" src={l.img} draggable={false} data-lm={l.lm} style={l.style} />
        : <div key={l.key} data-lm={l.lm} data-fx-heavy={l.heavy ? "" : undefined} style={l.style} />)}
    </>
  );
}

/** The card's colors as a stable key (the layers are memoized on it). */
const keyOf = (c?: readonly string[]) => (c ?? []).join();

/** Holo: the foil over a box (the card, the photo), or only its border ring. */
export function HoloSheet({ fx, box, radius, lightCard = false, cardColors, ring = false }: {
  fx: CardEffects; box: FoilBox; radius: number | string; lightCard?: boolean; cardColors?: readonly string[]; ring?: boolean;
}) {
  const h = fx.holo;
  const layers = useMemo(
    () => holoLayers(fx, box, lightCard, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, lightCard, h?.style, h?.palette, keyOf(h?.colors), h?.scale, h?.angle, keyOf(cardColors)],
  );
  if (box.w <= 0 || box.h <= 0) return null;
  return (
    <div data-fx="holo" data-light="" aria-hidden style={{
      ...holoGroupStyle(fx, lightCard), borderRadius: radius,
      ...(ring ? ringMask(holoRingWidth(box.w, box.h)) : {}),
    }}>
      <Layers layers={layers} />
    </div>
  );
}
export const holoRing = (fx: CardEffects) => holoScopeOf(fx) === "border";

/** Reflejo: the glare over the whole card. */
export function GlareSheet({ fx, box, radius }: { fx: CardEffects; box: FoilBox; radius: number }) {
  const g = fx.glare;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layers = useMemo(() => glareLayers(fx, box), [box.w, box.h, g?.size, g?.shape, g?.color]);
  if (box.w <= 0 || box.h <= 0) return null;
  return (
    <div data-fx="glare" data-light="" aria-hidden style={{ ...glareGroupStyle(fx), borderRadius: radius }}>
      <Layers layers={layers} />
    </div>
  );
}

/**
 * A round window that follows the light; its content stays where it is on
 * the card (the window moves one way, the content the other). Shows
 * "what is under the light" without repainting anything: both are transforms.
 */
export function LightWindow({ w, h, radius, children }: { w: number; h: number; radius: number; children: React.ReactNode }) {
  const mask = "radial-gradient(circle closest-side, #000 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0) 100%)";
  return (
    <div data-lm={lm.follow(w, h)} style={{
      position: "absolute", left: -radius, top: -radius, width: radius * 2, height: radius * 2, overflow: "hidden", pointerEvents: "none",
      WebkitMaskImage: mask, maskImage: mask, willChange: "transform",
    }}>
      <div data-lm={lm.counter(w, h)} style={{ position: "absolute", left: radius, top: radius, width: w, height: h, willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

/** Canto metálico: a beveled rim that catches the light. */
export function EdgeRim({ fx, box, radius }: { fx: CardEffects; box: FoilBox; radius: number }) {
  const e = fx.edge;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => edgeSpec(fx, box), [box.w, box.h, e?.enabled, e?.metal, e?.color, e?.width]);
  if (!spec || box.w <= 0) return null;
  const inner = Math.max(0, radius - spec.width);
  return (
    <div data-fx="edge" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", ...ringMask(spec.width) }}>
        <Layers layers={spec.layers} />
      </div>
      {/* The bevel: a light line outside, a dark one where the rim meets the card. */}
      <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), inset 0 1px 1px 1px rgba(255,255,255,0.25)" }} />
      <div style={{ position: "absolute", inset: spec.width, borderRadius: inner, boxShadow: "0 0 0 1px rgba(0,0,0,0.45), inset 0 1px 2px rgba(0,0,0,0.35)" }} />
    </div>
  );
}

/** Aura: the halo behind the card. */
export function AuraHalo({ fx, box, radius, cardColors }: { fx: CardEffects; box: FoilBox; radius: number; cardColors?: readonly string[] }) {
  const a = fx.aura;
  const spec = useMemo(
    () => auraSpec(fx, box, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, a?.enabled, a?.palette, keyOf(a?.colors), a?.intensity, a?.size, a?.pulse, a?.spin, keyOf(cardColors)],
  );
  if (!spec || box.w <= 0) return null;
  // A halo AROUND the card: a hole the card's size (a little smaller, so its
  // square corners stay under the card's rounded ones) keeps the colors
  // from tinting a see-through card.
  const side = Number(spec.wrap.width), inset = Math.ceil(radius * 0.3) + 1;
  const hole = `${(side - box.h) / 2 + inset}px ${(side - box.w) / 2 + inset}px`;
  return (
    <div data-fx="aura" aria-hidden style={{ ...spec.wrap, ...ringMask(0), padding: hole }}>
      <div style={spec.pulse}><div style={spec.blobs} /></div>
    </div>
  );
}

/** Polvo de estrellas. */
export function DustField({ fx, box, radius, cardColors }: { fx: CardEffects; box: FoilBox; radius: number; cardColors?: readonly string[] }) {
  const d = fx.dust;
  const layers = useMemo(
    () => dustLayers(fx, box, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, d?.enabled, d?.palette, keyOf(d?.colors), d?.amount, d?.size, d?.speed, keyOf(cardColors)],
  );
  if (!layers.length || box.w <= 0) return null;
  return (
    <div data-fx="dust" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", pointerEvents: "none" }}>
      {layers.map((l, i) => (
        <div key={i} data-fx-heavy={i === 2 ? "" : undefined} style={l.style}><div style={l.inner} /></div>
      ))}
    </div>
  );
}

/** Glitter over the whole card or along its border (the texts' own glitter
 * is CardGlitter.tsx). */
export function SparkleField({ fx, box, radius, scope, cardColors }: {
  fx: CardEffects; box: FoilBox; radius: number; scope: "card" | "border"; cardColors?: readonly string[];
}) {
  const g = fx.glitter;
  const field = useMemo(
    () => sparkleField(fx, box, scope, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, scope, g?.color, g?.palette, keyOf(g?.colors), g?.amount, g?.size, keyOf(cardColors)],
  );
  if (box.w <= 0) return null;
  const sheet = (image: string): CSSProperties => ({ position: "absolute", inset: 0, backgroundImage: image, backgroundRepeat: "no-repeat" });
  return (
    <div data-fx="glitter" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", pointerEvents: "none" }}>
      {field.layers.map((l, i) => (
        <div key={i} data-fx-heavy={i >= 2 ? "" : undefined} style={{ ...sheet(l.image), animation: l.animation, willChange: "opacity" }} />
      ))}
      <LightWindow w={box.w} h={box.h} radius={Math.round(Math.hypot(box.w, box.h) * 0.26)}>
        <div style={sheet(field.lit)} />
      </LightWindow>
    </div>
  );
}

/** Sello holográfico. */
export function SealBadge({ fx, box, cardColors }: { fx: CardEffects; box: FoilBox; cardColors?: readonly string[] }) {
  const s = fx.seal;
  const spec = useMemo(
    () => sealSpec(fx, box, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, s?.enabled, s?.text, s?.corner, s?.size, s?.palette, keyOf(s?.colors), keyOf(cardColors)],
  );
  const clip = useMemo(() => sealClip(), []);
  if (!spec || box.w <= 0) return null;
  const n = Array.from(spec.text).length;
  return (
    <div data-fx="seal" aria-hidden style={spec.wrap}>
      <div style={{ position: "absolute", inset: 0, clipPath: clip, WebkitClipPath: clip, overflow: "hidden", background: "#cfd6e4" }}>
        <div data-lm={spec.foilLm} style={spec.foil} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 55%, rgba(0,0,0,0.18) 100%)" }} />
        <div data-lm={spec.sheenLm} style={{ ...spec.sheen, mixBlendMode: "overlay" }} />
        <div style={{ position: "absolute", inset: "13%", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 0 0 1px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.12)" }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Syne', 'DM Sans', system-ui, sans-serif", fontWeight: 800, lineHeight: 1,
          fontSize: spec.size * (n === 1 ? 0.44 : n === 2 ? 0.32 : 0.24), letterSpacing: n > 1 ? "0.02em" : 0,
          color: "rgba(20,24,40,0.72)", textShadow: "0 1px 0 rgba(255,255,255,0.7)",
        }}>{spec.text}</div>
      </div>
    </div>
  );
}

/** Luz que recorre el borde. */
export function BorderRun({ fx, box, radius, cardColors }: { fx: CardEffects; box: FoilBox; radius: number; cardColors?: readonly string[] }) {
  const b = fx.motion?.borderRun;
  const spec = useMemo(
    () => borderRunSpec(fx, box, cardColors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, b?.enabled, b?.speed, b?.width, b?.palette, keyOf(b?.colors), keyOf(cardColors)],
  );
  if (!spec || box.w <= 0) return null;
  return (
    <div data-fx="border-run" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", pointerEvents: "none", ...ringMask(spec.width) }}>
      <div style={spec.style} />
    </div>
  );
}

/** A band of light crossing the card (the entrance's "Destello" and the
 * looping "Destello que cruza"). */
export function Sweep({ animation, radius, color = "#ffffff" }: { animation: string; radius: number; color?: string }) {
  return (
    <div aria-hidden data-fx="sweep" style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: "-20%", bottom: "-20%", left: 0, width: "70%", willChange: "transform",
        background: `linear-gradient(105deg, ${rgba(color, 0)} 20%, ${rgba(color, 0.55)} 50%, ${rgba(color, 0)} 80%)`,
        mixBlendMode: "overlay", animation,
      }} />
    </div>
  );
}
export const sweepTint = sweepColor;
