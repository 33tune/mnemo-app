"use client";
import { useRef, useCallback } from "react";
import type { CardEffects } from "@/types";

export function useCardInteractions(
  effects: CardEffects | undefined,
  cardRef: React.RefObject<HTMLElement | null>,
  isProfileCard = false,
) {
  const rafRef = useRef<number | null>(null);

  const tiltOn      = effects?.interactions?.tilt3d    ?? false;
  const spotlightOn = effects?.interactions?.spotlight ?? false;
  const magneticOn  = effects?.interactions?.magnetic  ?? false;
  const maxTilt     = effects?.interactions?.tiltIntensity ?? (isProfileCard ? 8 : 4);
  const magStrength = effects?.interactions?.magneticStrength ?? 0.3;

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el || (!tiltOn && !spotlightOn && !magneticOn)) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;   // 0–1
      const ny = (e.clientY - r.top)  / r.height;  // 0–1

      if (tiltOn) {
        const rx = (ny - 0.5) * maxTilt * -1;
        const ry = (nx - 0.5) * maxTilt;
        cardRef.current.style.setProperty("--tilt-x", `${rx}deg`);
        cardRef.current.style.setProperty("--tilt-y", `${ry}deg`);
      }
      if (spotlightOn) {
        cardRef.current.style.setProperty("--spot-x", `${nx * 100}%`);
        cardRef.current.style.setProperty("--spot-y", `${ny * 100}%`);
      }
      if (magneticOn) {
        const dx = (nx - 0.5) * 2; // -1 to 1
        const dy = (ny - 0.5) * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pull = Math.max(0, 1 - dist) * magStrength * 20;
        cardRef.current.style.setProperty("--mag-x", `${dx * pull}px`);
        cardRef.current.style.setProperty("--mag-y", `${dy * pull}px`);
      }
    });
  }, [tiltOn, spotlightOn, magneticOn, maxTilt, magStrength, cardRef]);

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    // Move spotlight off-card when mouse leaves
    el.style.setProperty("--spot-x", "-200%");
    el.style.setProperty("--spot-y", "-200%");
    el.style.setProperty("--mag-x", "0px");
    el.style.setProperty("--mag-y", "0px");
  }, [cardRef]);

  const interactionStyle: React.CSSProperties = {
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };

  return { onMouseMove, onMouseLeave, interactionStyle };
}
