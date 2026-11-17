"use client";
import React, { useRef } from "react";
import { useFieldLabelId } from "./MenuRow";
import { useTryOn } from "@/lib/cardPreview";

/**
 * Menu redesign (2026-11-17, "miniaturas en vez de palabras"): a choice of a
 * few looks (button shape, fill, where an effect goes…) as small drawings of
 * the result instead of words. The word stays as the tile's accessible name
 * and its tooltip. Hovering a tile tries it on the card (cardPreview.ts);
 * clicking applies it. APG radiogroup: arrows move and select.
 */
export interface Choice { id: string; label: string; draw: React.ReactNode }

export function ChoiceTiles({ options, value, onChange, label, columns }: {
  options: Choice[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name of the group (falls back to the row label). */
  label?: string;
  columns?: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tryOnProps = useTryOn();
  const labelledBy = useFieldLabelId();
  const idx = Math.max(0, options.findIndex(o => o.id === value));
  function onKeyDown(e: React.KeyboardEvent) {
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (idx + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (idx - 1 + options.length) % options.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = options.length - 1;
    if (n < 0) return;
    e.preventDefault(); e.stopPropagation();
    onChange(options[n].id);
    refs.current[n]?.focus();
  }
  return (
    <div role="radiogroup" {...(label ? { "aria-label": label } : { "aria-labelledby": labelledBy })} className="mn-choices"
      style={{ gridTemplateColumns: `repeat(${columns ?? Math.min(options.length, 4)}, minmax(0, 1fr))` }} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button key={o.id} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on}
            aria-label={o.label} title={o.label} tabIndex={on ? 0 : -1}
            className="mn-choice" data-on={on || undefined}
            onMouseDown={e => e.stopPropagation()}
            {...(on ? {} : tryOnProps(() => onChange(o.id)))}
            onClick={e => { e.stopPropagation(); onChange(o.id); }}>
            <svg viewBox="0 0 48 32" className="mn-choice__draw" aria-hidden>{o.draw}</svg>
          </button>
        );
      })}
    </div>
  );
}

// ── Drawings (48×32, currentColor only — the editor's ink) ─────────────────
const C = "currentColor";
/** A mini card frame most drawings sit on. */
export const miniCard = (inner?: React.ReactNode, strokeOnly = false) => (
  <g>
    <rect x="12" y="3" width="24" height="26" rx="4" fill={strokeOnly ? "none" : C} fillOpacity={strokeOnly ? undefined : 0.14} stroke={C} strokeOpacity={0.5} strokeWidth="1.2" />
    {inner}
  </g>
);
/** The card's photo + two text lines (where things go on the card). */
export const miniCardContent = (o = 0.55) => (
  <g opacity={o}>
    <circle cx="20" cy="11" r="3.4" fill={C} />
    <rect x="16" y="17" width="16" height="2.4" rx="1.2" fill={C} />
    <rect x="16" y="22" width="11" height="2" rx="1" fill={C} />
  </g>
);

export const Draw = {
  /** Button shapes: radius in px of an 8px-tall button. */
  buttonShape: (r: number) => <rect x="5" y="9" width="38" height="14" rx={r} fill={C} />,
  buttonFill: (k: "solid" | "outline" | "glass") => k === "solid"
    ? <rect x="6" y="11" width="36" height="10" rx="5" fill={C} />
    : k === "outline"
      ? <rect x="6.75" y="11.75" width="34.5" height="8.5" rx="4.25" fill="none" stroke={C} strokeWidth="1.5" />
      : <g><rect x="6" y="11" width="36" height="10" rx="5" fill={C} fillOpacity={0.28} /><rect x="6.75" y="11.75" width="34.5" height="8.5" rx="4.25" fill="none" stroke={C} strokeOpacity={0.8} strokeWidth="1.2" /></g>,
  buttonWidth: (k: "full" | "fit") => (
    <g fill={C}>{k === "full"
      ? <><rect x="4" y="6" width="40" height="6" rx="3" /><rect x="4" y="14" width="40" height="6" rx="3" /><rect x="4" y="22" width="40" height="6" rx="3" /></>
      : <><rect x="12" y="6" width="24" height="6" rx="3" /><rect x="12" y="14" width="24" height="6" rx="3" /><rect x="12" y="22" width="24" height="6" rx="3" /></>}</g>
  ),
  /** Where an effect goes on the card. */
  zone: (k: "card" | "background" | "photo" | "border" | "text") => miniCard(
    <g>
      {k === "card" && <rect x="12" y="3" width="24" height="26" rx="4" fill={C} fillOpacity={0.65} />}
      {k === "background" && <rect x="12" y="3" width="24" height="26" rx="4" fill={C} fillOpacity={0.45} />}
      {k === "border" && <rect x="13" y="4" width="22" height="24" rx="3.4" fill="none" stroke={C} strokeWidth="2.4" />}
      {k === "photo" ? <><g opacity={0.35}><rect x="16" y="17" width="16" height="2.4" rx="1.2" fill={C} /><rect x="16" y="22" width="11" height="2" rx="1" fill={C} /></g><circle cx="20" cy="11" r="4.2" fill={C} /></>
        : k === "text" ? <><circle cx="20" cy="11" r="3.4" fill={C} opacity={0.35} /><rect x="16" y="17" width="16" height="2.6" rx="1.3" fill={C} /><rect x="16" y="22" width="11" height="2.2" rx="1.1" fill={C} /></>
          : miniCardContent(k === "background" ? 0.25 : 0.4)}
    </g>, k !== "card"),
  glare: (k: "spot" | "streak" | "both") => miniCard(<g>
    {(k === "spot" || k === "both") && <circle cx="21" cy="11" r="5" fill={C} opacity={0.75} />}
    {(k === "streak" || k === "both") && <path d="M22 29 L30 3 L35 3 L27 29 Z" fill={C} opacity={0.6} />}
  </g>),
  gem: (k: "round" | "heart" | "star") => k === "round"
    ? <g fill={C}><circle cx="14" cy="16" r="4" /><circle cx="24" cy="16" r="4" /><circle cx="34" cy="16" r="4" /></g>
    : k === "heart"
      ? <g fill={C}>{[14, 24, 34].map(x => <path key={x} d={`M${x} 20 l-4 -4 a2.3 2.3 0 0 1 4 -2.6 a2.3 2.3 0 0 1 4 2.6 z`} />)}</g>
      : <g fill={C}>{[14, 24, 34].map(x => <path key={x} d={`M${x} 11 l1.3 3.4 3.6 .2 -2.8 2.3 1 3.5 -3.1 -2 -3.1 2 1 -3.5 -2.8 -2.3 3.6 -.2 z`} />)}</g>,
  layer: (k: "front" | "back") => (
    <g>
      {k === "back" && <g fill={C}>{[[8, 6], [40, 9], [6, 24], [42, 26], [24, 2]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" />)}</g>}
      {miniCard(miniCardContent(0.4))}
      {k === "front" && <g fill={C}>{[[16, 8], [30, 12], [22, 20], [33, 25], [14, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" />)}</g>}
    </g>
  ),
  glowWhere: (k: "outer" | "inner" | "both") => (
    <g>
      <defs><filter id={`mn-gw-${k}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
      {(k === "outer" || k === "both") && <rect x="12" y="3" width="24" height="26" rx="4" fill="none" stroke={C} strokeWidth="5" opacity={0.55} filter={`url(#mn-gw-${k})`} />}
      <rect x="12" y="3" width="24" height="26" rx="4" fill={C} fillOpacity={0.12} stroke={C} strokeOpacity={0.6} strokeWidth="1.2" />
      {(k === "inner" || k === "both") && <rect x="14.5" y="5.5" width="19" height="21" rx="2.5" fill="none" stroke={C} strokeWidth="3" opacity={0.55} filter={`url(#mn-gw-${k})`} />}
    </g>
  ),
  photoShape: (r: number) => <rect x="12" y="4" width="24" height="24" rx={r} fill={C} fillOpacity={0.85} />,
};
