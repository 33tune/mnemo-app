"use client";
import React from "react";
import { T } from "./tokens";
import { useFieldLabelId } from "./MenuRow";

interface FontOption {
  key:    string;
  label:  string;
  /** CSS font-family value, used to preview the typeface in its own
   * <option> (UX audit finding: options always rendered in the browser's
   * default UI font, no way to preview before picking) — falls back to
   * the default select font when omitted. */
  style?: string;
}

interface FontSelectProps {
  value:    string;
  onChange: (v: string) => void;
  fonts:    FontOption[];
  /** Accessible name; inside a labelled MenuRow the row label is used. */
  label?:   string;
}

// Styled replacement for the raw <select> ProfileTypographyMenu used to
// build inline (Fase 2: Personalization UI/UX) — kept generic (fonts passed
// in, no @/lib/fontList dependency here) so @/ui stays decoupled from
// app-level data.
// Block 2: still a native <select> (keyboard + screen reader support for
// free), styled as an editor control (.mn-input .mn-select: 28px, radius 8,
// hairline, custom chevron, focus ring). The closed select also renders the
// CURRENT font in its own typeface — cheap, and it previews the choice.
export function FontSelect({ value, onChange, fonts, label }: FontSelectProps) {
  const labelledBy = useFieldLabelId();
  const current = fonts.find(f => f.key === value);
  return (
    <select
      value={value}
      className="mn-input mn-select"
      aria-label={label ?? (labelledBy ? undefined : "Fuente")}
      aria-labelledby={label ? undefined : labelledBy}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      style={{
        // v3 field look (same 40px / 12px as TextInput); the closed select
        // renders the current family in itself.
        height: 40, padding: "0 12px", boxSizing: "border-box",
        ...T.type.label, lineHeight: "normal",
        fontFamily: current?.style ?? T.uiFont.sans,
        width: "100%",
      }}
    >
      {fonts.map(f => (
        <option key={f.key} value={f.key} style={{ fontFamily: f.style ?? T.uiFont.sans }}>{f.label}</option>
      ))}
    </select>
  );
}
