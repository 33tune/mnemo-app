"use client";
import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";

const LAYER_PARALLAX = [0.008, 0.018, 0.032];

export function useParallax() {
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const parallaxTarget  = useRef({ x: 0, y: 0 });
  const parallaxCurrent = useRef({ x: 0, y: 0 });
  const rafRef          = useRef<number>(0);

  useEffect(() => {
    const loop = () => {
      const dx = parallaxTarget.current.x - parallaxCurrent.current.x;
      const dy = parallaxTarget.current.y - parallaxCurrent.current.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        parallaxCurrent.current.x += dx * 0.06;
        parallaxCurrent.current.y += dy * 0.06;
        setParallaxOffset({ x: parallaxCurrent.current.x, y: parallaxCurrent.current.y });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function handleMouseMoveParallax(e: React.MouseEvent) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    parallaxTarget.current = {
      x: (e.clientX - cx) * 1,
      y: (e.clientY - cy) * 1,
    };
  }

  function getParallaxStyle(layer: 0 | 1 | 2, depth: number): CSSProperties {
    const m = LAYER_PARALLAX[layer] * (0.5 + depth * 0.5);
    return {
      transform: `translate(${parallaxOffset.x * m}px, ${parallaxOffset.y * m}px)`,
      willChange: "transform",
      transition: "none",
    };
  }

  return { parallaxOffset, handleMouseMoveParallax, getParallaxStyle };
}
