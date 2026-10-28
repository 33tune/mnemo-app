"use client";
import { useRef, useCallback, useEffect } from "react";
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
      // The 3D transform exists only while the card is really tilted
      // (CardLayers reads --tilt-tf): a card at rest is flat. iPhone Safari
      // composites a 3D layer apart and lost what's behind a see-through
      // card right after the entry animation ended (2026-10-28).
      const atRest = settled && tx === 0 && ty === 0;
      el.style.setProperty("--tilt-tf", atRest
        ? "none"
        : `perspective(1000px) rotateX(${currentTilt.current.x.toFixed(3)}deg) rotateY(${currentTilt.current.y.toFixed(3)}deg)`);
      if (!settled) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [cardRef]);

  // Phones (2026-10-28): a tap fires mouseover/mousemove right after the
  // touch ends; ignoring mouse events shortly after a touch keeps a tapped
  // card from staying scaled / tilted (mouseleave never comes on a phone).
  const lastTouchAt = useRef(0);
  const touching = useRef(false);
  const fromTouch = () => Date.now() - lastTouchAt.current < 800;

  const pointAt = useCallback((clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el || (!tiltOn && !spotlightOn)) return;

    const r  = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // Block 1: clamped to the card's own box — defensive, so any stray
    // event from outside it (e.g. a portaled child's mousemove bubbling
    // through the React tree) can never push tilt/spotlight past the
    // values a real in-card position produces.
    const nx = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const ny = Math.min(1, Math.max(0, (clientY - r.top)  / r.height));

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

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!fromTouch()) pointAt(e.clientX, e.clientY);
  }, [pointAt]);

  // Fires once on cursor entry — independent of onMouseMove, so hover-glow/
  // hover-scale engage immediately even if the cursor lands and never moves
  // again, unlike tilt/spotlight which are genuinely mouse-position-driven.
  // CSS `transition` on the reading elements (CardLayers.tsx) does the
  // smoothing here — no rAF loop needed, since these targets are simple
  // two-state (on/off) values, not a continuously-moving position.
  const engage = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (hoverGlowOn) el.style.setProperty("--hover-glow", "1");
    if (hoverScaleOn) el.style.setProperty("--hover-scale", String(hoverScaleTarget));
  }, [cardRef, hoverGlowOn, hoverScaleOn, hoverScaleTarget]);

  const release = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    targetTilt.current = { x: 0, y: 0 };
    startLerpLoop();

    el.style.setProperty("--spot-x", "-200%");
    el.style.setProperty("--spot-y", "-200%");
    el.style.setProperty("--hover-glow", "0");
    el.style.setProperty("--hover-scale", "1");
  }, [cardRef, startLerpLoop]);

  const onMouseEnter = useCallback(() => { if (!fromTouch()) engage(); }, [engage]);
  const onMouseLeave = useCallback(() => { if (!fromTouch()) release(); }, [release]);

  // ── Phones: the finger does what the cursor does (2026-10-28) ───────────
  // Pressing = entering (hover scale / glow); dragging = moving (tilt,
  // spotlight); lifting = leaving. Only the effects the card has turned on.
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    lastTouchAt.current = Date.now();
    touching.current = true;
    engage();
    pointAt(t.clientX, t.clientY);
  }, [engage, pointAt]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    lastTouchAt.current = Date.now();
    pointAt(t.clientX, t.clientY);
  }, [pointAt]);
  const onTouchEnd = useCallback(() => {
    lastTouchAt.current = Date.now();
    touching.current = false;
    release();
  }, [release]);

  return { onMouseMove, onMouseEnter, onMouseLeave, onTouchStart, onTouchMove, onTouchEnd, tiltOn, maxTilt, targetTilt, touching, startLerpLoop };
}

/** iPhone (iOS 13+) shows the motion permission only from a tap. */
type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * Phones: the card's tilt follows the phone's own tilt (gyroscope), relative
 * to how it was held when the page opened — only while no finger is on the
 * card (the finger wins). Android just works; on an iPhone the first tap on
 * the page asks for the motion permission (Safari requires a tap).
 */
export function useGyroTilt(
  enabled: boolean,
  ix: Pick<ReturnType<typeof useCardInteractions>, "maxTilt" | "targetTilt" | "touching" | "startLerpLoop">,
) {
  const { maxTilt, targetTilt, touching, startLerpLoop } = ix;
  const maxRef = useRef(maxTilt);
  maxRef.current = maxTilt;
  useEffectOnce(enabled, () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    let base: { b: number; g: number } | null = null;
    const RANGE = 25; // degrees of phone tilt for the full card tilt
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onOrient = (ev: DeviceOrientationEvent) => {
      if (ev.beta == null || ev.gamma == null || touching.current) return;
      if (!base) base = { b: ev.beta, g: ev.gamma };
      // Slowly re-center, so a phone set down at a new angle settles flat.
      base.b += (ev.beta - base.b) * 0.01;
      base.g += (ev.gamma - base.g) * 0.01;
      // ±max/2, the same range the cursor reaches at the card's edges.
      targetTilt.current.x = clamp((ev.beta - base.b) / RANGE) * maxRef.current * -0.5;
      targetTilt.current.y = clamp((ev.gamma - base.g) / RANGE) * maxRef.current * 0.5;
      startLerpLoop();
    };
    const listen = () => window.addEventListener("deviceorientation", onOrient);
    const Perm = window.DeviceOrientationEvent as unknown as OrientationPermission;
    let ask: (() => void) | null = null;
    if (typeof Perm.requestPermission === "function") {
      ask = () => {
        document.removeEventListener("touchend", ask!);
        Perm.requestPermission!().then(s => { if (s === "granted") listen(); }).catch(() => {});
      };
      document.addEventListener("touchend", ask, { passive: true });
    } else {
      listen();
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      if (ask) document.removeEventListener("touchend", ask);
    };
  });
}

/** useEffect keyed only on `enabled` (the handlers read refs). */
function useEffectOnce(enabled: boolean, run: () => void | (() => void)) {
  useEffect(() => (enabled ? run() : undefined), [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
