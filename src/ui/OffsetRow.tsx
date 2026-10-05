"use client";
import React, { useId } from "react";
import { T } from "./tokens";
import { labelStyle } from "./MenuRow";

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
// offsets. Block 2: same track/thumb/value styling as SliderRow (editor.css
// .mn-range), grouped under one labelled role="group", each axis with its
// own accessible name ("Offset X").
export function OffsetRow({ label = "Desplazamiento", x, y, min, max, step = 1, onChange }: OffsetRowProps) {
  const groupId = useId();
  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  return (
    <div role="group" aria-labelledby={groupId} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
      <span id={groupId} style={labelStyle}>{label}</span>
      <div style={{ display: "flex", gap: 12 }}>
        {([["X", x, (v: number) => onChange(v, y)], ["Y", y, (v: number) => onChange(x, v)]] as const).map(([axis, val, set]) => (
          <div key={axis} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span aria-hidden style={{ ...T.type.value, color: T.ui.text.secondary, flexShrink: 0 }}>{axis}</span>
            <input
              type="range" className="mn-range" min={min} max={max} step={step} value={val}
              aria-label={`${label} ${axis}`}
              aria-valuetext={`${Math.round(val)}`}
              onChange={e => set(Number(e.target.value))}
              onMouseDown={e => e.stopPropagation()}
              style={{ flex: 1, minWidth: 0, ["--mn-pct" as string]: `${pct(val)}%` } as React.CSSProperties}
            />
            <span style={{ ...T.type.value, color: T.ui.text.secondary, minWidth: 22, textAlign: "right" }}>{Math.round(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
