"use client";
import { useRef, useCallback, useEffect } from "react";
import type { CardEffects } from "@/types";
import { lightEffectsOn, lightIdleOn, LIGHT_REST } from "@/lib/cardFoil";

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
  // Holográfico / Reflejo (2026-11-04, cardFoil.ts): the light point on the
  // card (0–1), eased in the same loop as the tilt; --lx / --ly / --la.
  const targetLight  = useRef<{ x: number; y: number }>({ ...LIGHT_REST });
  const currentLight = useRef<{ x: number; y: number }>({ ...LIGHT_REST });

  const tiltOn      = effects?.interactions?.tilt3d    ?? false;
  const spotlightOn = effects?.interactions?.spotlight ?? false;
  const maxTilt     = effects?.interactions?.tiltIntensity ?? (isProfileCard ? 10 : 5);
  const hoverGlowOn  = effects?.interactions?.hoverGlow ?? false;
  // Presence (not a separate boolean) is what enables hover-scale — same
  // "absence = off" contract as card.music/blockStyle overrides elsewhere.
  // 1 or unset both mean "no scale", since scale(1) is a no-op anyway.
  const hoverScaleTarget = effects?.interactions?.hoverScale;
  const hoverScaleOn = hoverScaleTarget != null && hoverScaleTarget !== 1;
  const lightOn = lightEffectsOn(effects);
  const tiltOnRef = useRef(tiltOn);
  tiltOnRef.current = tiltOn;
  const lightOnRef = useRef(lightOn);
  lightOnRef.current = lightOn;
  const idleOn = lightIdleOn(effects);
  /** Someone holds the light (cursor over the card, finger, gyroscope). */
  const heldRef = useRef(false);

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

      const cl = currentLight.current, tl = targetLight.current;
      cl.x += (tl.x - cl.x) * LERP * 1.4;
      cl.y += (tl.y - cl.y) * LERP * 1.4;
      // FPS (2026-11-04): only the layers that use the light get the vars
      // ([data-light]); set on the card itself they restyled every element
      // of the card on every frame.
      setLightVars(el, cl.x.toFixed(4), cl.y.toFixed(4));
      const lightSettled = Math.abs(cl.x - tl.x) < 0.001 && Math.abs(cl.y - tl.y) < 0.001;

      const tiltSettled = Math.abs(currentTilt.current.x - tx) < 0.01 && Math.abs(currentTilt.current.y - ty) < 0.01;
      const settled = lightSettled && tiltSettled;
      // The 3D transform exists only while the card is really tilted
      // (CardLayers reads --tilt-tf): a card at rest is flat. iPhone Safari
      // composites a 3D layer apart and lost what's behind a see-through
      // card right after the entry animation ended (2026-10-28).
      // Only the tilt decides: a moving light (holo / strass drift) must
      // never keep the card in 3D.
      const atRest = tiltSettled && tx === 0 && ty === 0;
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

  // "Moverse solo" (holo idle, Fantasma, Strass): while nobody holds the
  // light it drifts slowly around its rest point, so the foil and the
  // stones keep catching light. Stops with reduced motion and in hidden tabs.
  useEffect(() => {
    if (!idleOn || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, last = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (heldRef.current || document.hidden || now - last < 33) return; // ~30 fps is plenty for a drift
      last = now;
      const t = (now - t0) / 1000;
      targetLight.current = {
        x: 0.5 + Math.sin(t * 0.55) * 0.34,
        y: 0.42 + Math.sin(t * 0.37 + 1.2) * 0.26,
      };
      startLerpLoop();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idleOn, startLerpLoop]);

  // Phones (2026-10-28): a tap fires mouseover/mousemove right after the
  // touch ends; ignoring mouse events shortly after a touch keeps a tapped
  // card from staying scaled / tilted (mouseleave never comes on a phone).
  const lastTouchAt = useRef(0);
  const touching = useRef(false);
  const fromTouch = () => Date.now() - lastTouchAt.current < 800;

  const pointAt = useCallback((clientX: number, clientY: number) => {
    const el = cardRef.current;
    if (!el || (!tiltOn && !spotlightOn && !lightOn)) return;

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
    if (lightOn) {
      targetLight.current = { x: nx, y: ny };
      startLerpLoop();
    }
    if (spotlightOn) {
      el.style.setProperty("--spot-x", `${nx * 100}%`);
      el.style.setProperty("--spot-y", `${ny * 100}%`);
    }
  }, [tiltOn, spotlightOn, lightOn, maxTilt, cardRef, startLerpLoop]);

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
    if (lightOn) { setLightHeld(el, "1"); heldRef.current = true; }
  }, [cardRef, hoverGlowOn, hoverScaleOn, hoverScaleTarget, lightOn]);

  const release = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    targetTilt.current = { x: 0, y: 0 };
    targetLight.current = { ...LIGHT_REST };
    heldRef.current = false;
    startLerpLoop();
    setLightHeld(el, "0");

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

  return {
    onMouseMove, onMouseEnter, onMouseLeave, onTouchStart, onTouchMove, onTouchEnd, tiltOn, lightOn, maxTilt, targetTilt,
    targetLight, tiltOnRef, lightOnRef, heldRef, cardRef, touching, startLerpLoop,
  };
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
  ix: Pick<ReturnType<typeof useCardInteractions>,
    "maxTilt" | "targetTilt" | "targetLight" | "tiltOnRef" | "lightOnRef" | "heldRef" | "cardRef" | "touching" | "startLerpLoop">,
) {
  const { maxTilt, targetTilt, targetLight, tiltOnRef, lightOnRef, heldRef, cardRef, touching, startLerpLoop } = ix;
  const maxRef = useRef(maxTilt);
  maxRef.current = maxTilt;
  useEffectOnce(enabled, () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    let base: { b: number; g: number } | null = null;
    // Degrees of phone tilt for the full card tilt. 2026-11-04: was 25 with
    // half the range and a fast re-center — on a phone the 3D barely showed.
    const RANGE = 14;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onOrient = (ev: DeviceOrientationEvent) => {
      if (ev.beta == null || ev.gamma == null || touching.current) return;
      if (!base) base = { b: ev.beta, g: ev.gamma };
      // Slowly re-center, so a phone set down at a new angle settles flat.
      base.b += (ev.beta - base.b) * 0.004;
      base.g += (ev.gamma - base.g) * 0.004;
      const dy = clamp((ev.beta - base.b) / RANGE), dx = clamp((ev.gamma - base.g) / RANGE);
      // ±0.8·max: a bit past what the cursor reaches at the card's edges
      // (±max/2), since a phone is turned less than a cursor travels.
      if (tiltOnRef.current) {
        targetTilt.current.x = dy * maxRef.current * -0.8;
        targetTilt.current.y = dx * maxRef.current * 0.8;
      }
      // Holográfico / Reflejo: the light slides across the card as it turns.
      if (lightOnRef.current && Math.abs(dx) + Math.abs(dy) > 0.04) {
        targetLight.current = { x: 0.5 + dx * 0.5, y: 0.5 + dy * 0.5 };
        heldRef.current = true;
        if (cardRef.current) setLightHeld(cardRef.current, "1");
      }
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

/** The light vars go only on the layers that read them (see the loop). */
const LIGHT_SEL = "[data-light]";
function setLightVars(card: HTMLElement, x: string, y: string) {
  const els = card.querySelectorAll<HTMLElement>(LIGHT_SEL);
  for (let i = 0; i < els.length; i++) { els[i].style.setProperty("--lx", x); els[i].style.setProperty("--ly", y); }
}
function setLightHeld(card: HTMLElement, v: string) {
  const els = card.querySelectorAll<HTMLElement>(LIGHT_SEL);
  for (let i = 0; i < els.length; i++) els[i].style.setProperty("--la", v);
}
