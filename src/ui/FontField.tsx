"use client";
import React, { useEffect, useId, useRef } from "react";
import { useTryOn } from "@/lib/cardPreview";
import { T } from "./tokens";
import { Icon } from "./icons";
import { FieldResetButton } from "./MenuRow";

interface FontOption { key: string; label: string; style?: string }

interface FontFieldProps {
  value:     string;
  onChange:  (v: string) => void;
  fonts:     FontOption[];
  /** Accessible name ("Fuente: Nombre"). */
  label:     string;
  /** Mono line under the name ("Predeterminada · 3 pesos"). */
  detail?:   string;
  /** The font is the user's own choice: modified dot + reset. */
  modified?: boolean;
  onReset?:  () => void;
  /** Liquid glass: the sample in the "Aa" tile (the role's own text). */
  sample?:   string;
}

// Editor v3 Phase F: the font field of design screen 02 — the current
// family written IN that family (18px) with a mono detail line and a
// chevron, on a filled field. The control itself is still the native
// <select> (keyboard, screen readers and the OS picker for free), laid
// transparently over the whole field; :focus-within draws the ring.
export function FontField({ value, onChange, fonts, label, detail, modified, onReset, sample }: FontFieldProps) {
  const detailId = useId();
  const current = fonts.find(f => f.key === value);
  return (
    // Liquid glass (DS FontSelect trigger): a 56px well — the sample "Aa" on
    // the neutral `on` tile in the font itself, the family name (17px) in
    // itself with the detail under it, a chevron; the reset button outside.
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
    <div className="mn-field" data-state={modified ? "modified" : undefined} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
    <div className="mn-fontfield" style={{ flex: 1, minWidth: 0 }}>
      <span className="mn-fontfield__aa" aria-hidden="true" style={{ fontFamily: current?.style ?? T.uiFont.sans }}>Aa</span>
      <span className="mn-fontfield__face" aria-hidden="true">
        <span className="mn-fontfield__name" style={{ fontFamily: current?.style ?? T.uiFont.sans }}>{current?.label ?? value}</span>
        {detail && <span className="mn-fontfield__detail">{detail}</span>}
      </span>
      <span className="mn-fontfield__chev" aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
      <select
        value={value}
        aria-label={label}
        aria-describedby={detail ? detailId : undefined}
        className="mn-fontfield__select"
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
      >
        {fonts.map(f => (
          <option key={f.key} value={f.key} style={{ fontFamily: f.style ?? T.uiFont.sans }}>{f.label}</option>
        ))}
      </select>
      {detail && <span id={detailId} className="mn-sr-only">{detail}</span>}
    </div>
    {modified && onReset && <div style={{ paddingTop: 12 }}><FieldResetButton label={label} onReset={onReset} /></div>}
    </div>
    <FontStrip value={value} onChange={onChange} fonts={fonts} label={`${label} (vista de cada fuente)`} sample={sample} />
    </div>
  );
}

/** Menu redesign (2026-11-17, "fuentes que se ven"): every font as a tile with
 * the real text (the name, the button label…) written in it, in a row you
 * swipe; hover tries it on the card, a tap picks it. The current one stays in
 * view. Under the field above (which keeps the native select). */
export function FontStrip({ value, onChange, fonts, label, sample }: { value: string; onChange: (v: string) => void; fonts: FontOption[]; label: string; sample?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const tryOnProps = useTryOn();
  const text = (sample ?? "").trim().slice(0, 14) || "Aa";
  useEffect(() => {
    const row = rowRef.current; const on = row?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (row && on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
  }, [value]);
  const idx = Math.max(0, fonts.findIndex(f => f.key === value));
  function onKeyDown(e: React.KeyboardEvent) {
    const n = e.key === "ArrowRight" ? idx + 1 : e.key === "ArrowLeft" ? idx - 1 : -1;
    if (n < 0 || n >= fonts.length) return;
    e.preventDefault(); e.stopPropagation(); onChange(fonts[n].key);
    requestAnimationFrame(() => rowRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
  }
  return (
    <div ref={rowRef} className="mn-fontstrip" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {fonts.map(f => {
        const on = f.key === value;
        return (
          <button key={f.key} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} title={f.label} aria-label={f.label}
            className="mn-fontstrip__item" data-on={on || undefined}
            onMouseDown={e => e.stopPropagation()}
            {...(on ? {} : tryOnProps(() => onChange(f.key)))}
            onClick={e => { e.stopPropagation(); onChange(f.key); }}
            style={{ fontFamily: f.style ?? T.uiFont.sans }}>
            {text}
          </button>
        );
      })}
    </div>
  );
}
