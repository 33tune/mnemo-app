"use client";
import { useRef, useCallback } from "react";
import type { CardEffects } from "@/types";

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
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;

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

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    targetTilt.current = { x: 0, y: 0 };
    startLerpLoop();

    el.style.setProperty("--spot-x", "-200%");
    el.style.setProperty("--spot-y", "-200%");
  }, [cardRef, startLerpLoop]);

  return { onMouseMove, onMouseLeave };
}
