"use client";
import React from "react";
import { T } from "./tokens";

interface SliderRowProps {
  label:    string;
  value:    number;
  min:      number;
  max:      number;
  step?:    number;
  unit?:    string;
  fmt?:     (v: number) => string;
  onChange: (v: number) => void;
}

export function SliderRow({ label, value, min, max, step = 1, unit = "", fmt, onChange }: SliderRowProps) {
  const display = fmt ? fmt(value) : `${Math.round(value)}${unit}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: T.font.sans, fontSize: T.size.sm, color: T.text.secondary }}>
          {label}
        </span>
        <span style={{
          fontFamily:         T.font.mono,
          fontSize:           T.size.xs,
          color:              T.text.muted,
          minWidth:           34,
          textAlign:          "right",
          fontVariantNumeric: "tabular-nums",
        }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: "100%", cursor: "pointer", accentColor: T.text.primary }}
      />
    </div>
  );
}
