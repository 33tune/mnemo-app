"use client";
import React from "react";
import { T } from "./tokens";

interface FontOption {
  key:   string;
  label: string;
}

interface FontSelectProps {
  value:    string;
  onChange: (v: string) => void;
  fonts:    FontOption[];
}

// Styled replacement for the raw <select> ProfileTypographyMenu used to
// build inline (Fase 2: Personalization UI/UX) — kept generic (fonts passed
// in, no @/lib/fontList dependency here) so @/ui stays decoupled from
// app-level data.
export function FontSelect({ value, onChange, fonts }: FontSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      style={{
        background: "transparent", border: `1px solid ${T.border.default}`,
        borderRadius: T.radius.sm, padding: "4px 8px", outline: "none",
        color: T.text.secondary, fontSize: T.size.sm, fontFamily: T.font.sans,
        cursor: "pointer", width: "100%",
      }}
    >
      {fonts.map(f => (
        <option key={f.key} value={f.key} style={{ background: T.surface.base }}>{f.label}</option>
      ))}
    </select>
  );
}
