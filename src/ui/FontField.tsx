"use client";
import React, { useId } from "react";
import { T } from "./tokens";
import { Icon } from "./icons";
import { FieldResetMark } from "./MenuRow";

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
}

// Editor v3 Phase F: the font field of design screen 02 — the current
// family written IN that family (18px) with a mono detail line and a
// chevron, on a filled field. The control itself is still the native
// <select> (keyboard, screen readers and the OS picker for free), laid
// transparently over the whole field; :focus-within draws the ring.
export function FontField({ value, onChange, fonts, label, detail, modified, onReset }: FontFieldProps) {
  const detailId = useId();
  const current = fonts.find(f => f.key === value);
  return (
    <div className="mn-field mn-fontfield" data-state={modified ? "modified" : undefined}>
      {modified && onReset && <FieldResetMark label={label} onReset={onReset} />}
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
  );
}
