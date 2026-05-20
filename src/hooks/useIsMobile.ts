"use client";
import { useState, useEffect } from "react";

/**
 * Returns true on touch-only devices (phone/tablet) where canvas editing
 * via mouse drag/resize/rotate is not supported.
 *
 * Uses `(hover: none) and (pointer: coarse)` — this targets pure touch screens
 * and does NOT flag hybrid devices like Surface or iPad with a mouse.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler, { passive: true });
    return () => mq.removeEventListener("change", handler);
  }, []);

  return mobile;
}
