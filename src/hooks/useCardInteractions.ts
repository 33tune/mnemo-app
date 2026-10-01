"use client";
import { useRef, useCallback } from "react";
import type { CardEffects } from "@/types";

// Stage FASE 3 (Text & Motion Effects): hoverGlow/hoverScale extend this
// SAME hook (not a second mouse-event system) — same ref, same CSS-var
// mechanism tilt/spotlight already use. CardLayers.tsx reads `--hover-glow`
// (0-1, drives a dedicated glow layer's opacity, CSS-transitioned) and
// `--hover-scale` (a plain scale factor, also CSS-transitioned) on their own
// nested wrapper elements — see that file's header for why nesting, not
// sharing a property, is what keeps every motion effect independent (the
// same principle that fixed the tilt/floating coupling in FASE 1).
export function useCardInteractions(
  effects: CardEffects | undefined,
  cardRef: React.RefObject<HTMLElement | null>,
  isProfileCard = false,
) {
  const rafRef     = useRef<number | null>(null);
  const targetTilt = useRef({ x: 0, y: 0 });
  const currentTilt = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);

  const tiltOn      = effects?.interactions?.tilt3d    ?? false;
  const spotlightOn = effects?.interactions?.spotlight ?? false;
  const maxTilt     = effects?.interactions?.tiltIntensity ?? (isProfileCard ? 10 : 5);
  const hoverGlowOn  = effects?.interactions?.hoverGlow ?? false;
  // Presence (not a separate boolean) is what enables hover-scale — same
  // "absence = off" contract as card.music/blockStyle overrides elsewhere.
  // 1 or unset both mean "no scale", since scale(1) is a no-op anyway.
  const hoverScaleTarget = effects?.interactions?.hoverScale;
  const hoverScaleOn = hoverScaleTarget != null && hoverScaleTarget !== 1;

  const startLerpLoop = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const LERP = 0.1;

    function animate() {
      const el = cardRef.current;
      if (!el) { isAnimating.current = false; return; }

      const cx = currentTilt.current.x;
      const cy = currentTilt.current.y;
      const tx = targetTilt.current.x;
      const ty = targetTilt.current.y;

      currentTilt.current.x = cx + (tx - cx) * LERP;
      currentTilt.current.y = cy + (ty - cy) * LERP;

      el.style.setProperty("--tilt-x", `${currentTilt.current.x.toFixed(3)}deg`);
      el.style.setProperty("--tilt-y", `${currentTilt.current.y.toFixed(3)}deg`);

      const settled = Math.abs(currentTilt.current.x - tx) < 0.01 && Math.abs(currentTilt.current.y - ty) < 0.01;
      if (!settled) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [cardRef]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el || (!tiltOn && !spotlightOn)) return;

    const r  = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // Block 1: clamped to the card's own box — defensive, so any stray
    // event from outside it (e.g. a portaled child's mousemove bubbling
    // through the React tree) can never push tilt/spotlight past the
    // values a real in-card position produces.
    const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - r.top)  / r.height));

    if (tiltOn) {
      targetTilt.current.x = (ny - 0.5) * maxTilt * -1;
      targetTilt.current.y = (nx - 0.5) * maxTilt;
      startLerpLoop();
    }
    if (spotlightOn) {
      el.style.setProperty("--spot-x", `${nx * 100}%`);
      el.style.setProperty("--spot-y", `${ny * 100}%`);
    }
  }, [tiltOn, spotlightOn, maxTilt, cardRef, startLerpLoop]);

  // Fires once on cursor entry — independent of onMouseMove, so hover-glow/
  // hover-scale engage immediately even if the cursor lands and never moves
  // again, unlike tilt/spotlight which are genuinely mouse-position-driven.
  // CSS `transition` on the reading elements (CardLayers.tsx) does the
  // smoothing here — no rAF loop needed, since these targets are simple
  // two-state (on/off) values, not a continuously-moving position.
  const onMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (hoverGlowOn) el.style.setProperty("--hover-glow", "1");
    if (hoverScaleOn) el.style.setProperty("--hover-scale", String(hoverScaleTarget));
  }, [cardRef, hoverGlowOn, hoverScaleOn, hoverScaleTarget]);

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    targetTilt.current = { x: 0, y: 0 };
    startLerpLoop();

    el.style.setProperty("--spot-x", "-200%");
    el.style.setProperty("--spot-y", "-200%");
    el.style.setProperty("--hover-glow", "0");
    el.style.setProperty("--hover-scale", "1");
  }, [cardRef, startLerpLoop]);

  return { onMouseMove, onMouseEnter, onMouseLeave };
}
