"use client";
import React, { useId } from "react";
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
  );
}
