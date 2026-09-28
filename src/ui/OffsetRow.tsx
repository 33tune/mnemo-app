"use client";
import React from "react";
import { T } from "./tokens";

interface OffsetRowProps {
  label?:   string;
  x:        number;
  y:        number;
  min:      number;
  max:      number;
  step?:    number;
  onChange: (x: number, y: number) => void;
}

// Paired X/Y control (Fase 2: Personalization UI/UX) — used for shadow/glow
// offsets. Same visual language as SliderRow (label above, tabular-nums
// value, native range input) but two side by side sharing one row.
export function OffsetRow({ label = "Offset", x, y, min, max, step = 1, onChange }: OffsetRowProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontFamily: T.font.sans, fontSize: T.size.sm, color: T.text.secondary }}>{label}</span>
      <div style={{ display: "flex", gap: 10 }}>
        {([["X", x, (v: number) => onChange(v, y)], ["Y", y, (v: number) => onChange(x, v)]] as const).map(([axis, val, set]) => (
          <div key={axis} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: T.font.mono, fontSize: T.size.label, color: T.text.muted, flexShrink: 0 }}>{axis}</span>
            <input
              type="range" min={min} max={max} step={step} value={val}
              onChange={e => set(Number(e.target.value))}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, cursor: "pointer", accentColor: T.text.primary }}
            />
            <span style={{
              fontFamily: T.font.mono, fontSize: T.size.xs, color: T.text.muted,
              minWidth: 20, textAlign: "right", fontVariantNumeric: "tabular-nums",
            }}>{Math.round(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
