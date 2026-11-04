"use client";
/**
 * Relieve en los textos (2026-11-04, v3): the SVG lighting filter behind the
 * embossed texts (cardFoil.ts › withEmboss). Each letter's own shape is the
 * height map (its blurred alpha); a distant light coming from the card's light
 * point lights it — diffuse shading (the faces toward the light brighter, the
 * others darker), a specular sheen, and a soft shadow cast away from the
 * light — so the letters read as raised from the card and the relief moves
 * with the cursor, the finger, the gyroscope and the tilt.
 * The light is read from this element's --lx / --ly ([data-light]) and only
 * written to the filter when it changes.
 */
import { useEffect, useRef } from "react";
import type { CardEffects } from "@/types";
import { embossFilterId, embossLight, embossParams, LIGHT_REST } from "@/lib/cardFoil";

export default function EmbossFilter({ cardId, fx }: { cardId: string; fx: CardEffects }) {
  const host = useRef<HTMLDivElement>(null);
  const diff = useRef<SVGFEDistantLightElement>(null);
  const spec = useRef<SVGFEDistantLightElement>(null);
  const off = useRef<SVGFEOffsetElement>(null);
  const p = embossParams(fx);

  useEffect(() => {
    let raf = 0, lx0 = NaN, ly0 = NaN, last = 0;
    // The lighting filter re-runs on every text each time the light moves:
    // on a phone (gyroscope, finger) at most ~15 times a second and only for
    // a visible change, so it never eats the frame.
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const minGap = coarse ? 66 : 0, minStep = coarse ? 0.012 : 0.003;
    const read = (n: string, d: number) => { const v = parseFloat(host.current?.style.getPropertyValue(n) ?? ""); return isFinite(v) ? v : d; };
    const tick = (now = 0) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || now - last < minGap) return;
      const lx = read("--lx", LIGHT_REST.x), ly = read("--ly", LIGHT_REST.y);
      if (Math.abs(lx - lx0) < minStep && Math.abs(ly - ly0) < minStep) return;
      lx0 = lx; ly0 = ly; last = now;
      const { azimuth, elevation } = embossLight(lx, ly);
      for (const el of [diff.current, spec.current]) {
        el?.setAttribute("azimuth", azimuth.toFixed(1));
        el?.setAttribute("elevation", elevation.toFixed(1));
      }
      // The shadow falls away from the light.
      const k = p.shadow;
      off.current?.setAttribute("dx", (-(lx - 0.5) * 2 * k).toFixed(2));
      off.current?.setAttribute("dy", (-(ly - 0.5) * 2 * k + k * 0.5).toFixed(2));
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [p.shadow]);

  const id = embossFilterId(cardId);
  return (
    <div ref={host} data-light="" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="-15%" y="-40%" width="130%" height="180%" colorInterpolationFilters="sRGB">
          {/* Height map: the letter's blurred shape (raised in the middle). */}
          <feGaussianBlur in="SourceAlpha" stdDeviation={p.blur.toFixed(2)} result="h" />
          {/* Diffuse light: multiplies the text's own colors (same material). */}
          <feDiffuseLighting in="h" surfaceScale={p.surface.toFixed(2)} diffuseConstant="1.15" lightingColor="#ffffff" result="d">
            <feDistantLight ref={diff} azimuth="225" elevation="45" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="0.7" k2="0.48" k3="0" k4="0" result="lit" />
          {/* Specular sheen, only inside the letters. */}
          <feSpecularLighting in="h" surfaceScale={p.surface.toFixed(2)} specularConstant="1" specularExponent="24" lightingColor="#ffffff" result="s">
            <feDistantLight ref={spec} azimuth="225" elevation="45" />
          </feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="sIn" />
          <feComposite in="lit" in2="sIn" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" result="shine" />
          <feComposite in="shine" in2="SourceAlpha" operator="in" result="face" />
          {/* A soft cast shadow, away from the light. */}
          <feOffset ref={off} in="SourceAlpha" dx="1" dy="1.5" result="o" />
          <feGaussianBlur in="o" stdDeviation={(p.blur * 0.9).toFixed(2)} result="ob" />
          <feComponentTransfer in="ob" result="sh"><feFuncA type="linear" slope="0.45" /></feComponentTransfer>
          <feMerge>
            <feMergeNode in="sh" />
            <feMergeNode in="face" />
          </feMerge>
        </filter>
      </svg>
    </div>
  );
}
