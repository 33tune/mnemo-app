"use client";
/**
 * Muro v2 (2026-11-26): a post's text with its animation (brillo, destello,
 * arcoíris, rebote, ola, temblor). One set of keyframes for the whole page;
 * nothing moves with "reduce motion". Rebote / ola animate each letter.
 */
import React from "react";
import type { PostFx } from "@/lib/wall";

const CSS = `
@keyframes mnw-glow{0%,100%{text-shadow:0 0 4px var(--c),0 0 10px var(--c)}50%{text-shadow:0 0 8px var(--c),0 0 22px var(--c)}}
@keyframes mnw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes mnw-rainbow{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
@keyframes mnw-bounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-.28em)}60%{transform:translateY(0)}}
@keyframes mnw-wave{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-.16em) rotate(-4deg)}75%{transform:translateY(.12em) rotate(4deg)}}
@keyframes mnw-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-1px,1px)}40%{transform:translate(1px,-1px)}60%{transform:translate(-1px,0)}80%{transform:translate(1px,1px)}}
.mnw-l{display:inline-block;white-space:pre}
.mnw-ta::placeholder{color:var(--ph);opacity:1}
@media (prefers-reduced-motion: reduce){[data-mnw-fx],[data-mnw-fx] .mnw-l{animation:none!important}}
`;
let injected = false;
export function useCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "mnemo-post-fx";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function PostText({ text, fx, color }: { text: string; fx?: PostFx; color: string }) {
  useCss();
  if (!fx) return <>{text}</>;
  const base = { "--c": color } as React.CSSProperties;
  if (fx === "bounce" || fx === "wave" || fx === "shake") {
    const letters = Array.from(text);
    // Long posts: the letters move in short groups so it stays readable and light.
    const step = fx === "shake" ? 0 : Math.max(0.03, Math.min(0.08, 2 / Math.max(1, letters.length)));
    const name = fx === "bounce" ? "mnw-bounce" : fx === "wave" ? "mnw-wave" : "mnw-shake";
    const dur = fx === "bounce" ? 1.2 : fx === "wave" ? 1.6 : 0.35;
    return (
      <span data-mnw-fx="" aria-label={text} style={base}>
        {letters.map((ch, i) => ch === "\n"
          ? <br key={i} />
          : <span key={i} aria-hidden className="mnw-l" style={{ animation: `${name} ${dur}s ease-in-out ${(i * step).toFixed(2)}s infinite` }}>{ch}</span>)}
      </span>
    );
  }
  if (fx === "glow") return <span data-mnw-fx="" style={{ ...base, animation: "mnw-glow 2.2s ease-in-out infinite" }}>{text}</span>;
  if (fx === "rainbow") return <span data-mnw-fx="" style={{ ...base, display: "inline", animation: "mnw-rainbow 4s linear infinite" }}>{text}</span>;
  // shimmer: a light band sweeps over the text, in its own color.
  return (
    <span data-mnw-fx="" style={{ ...base, backgroundImage: `linear-gradient(100deg, ${color} 40%, #ffffff 50%, ${color} 60%)`,
      backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent",
      animation: "mnw-shimmer 2.6s linear infinite" }}>{text}</span>
  );
}

/** The six animations as tiny previews for the picker (icons over words). */
export const FX_LABEL: Record<PostFx, string> = {
  glow: "Brillo", shimmer: "Destello", rainbow: "Arcoíris", bounce: "Rebote", wave: "Ola", shake: "Temblor",
};
