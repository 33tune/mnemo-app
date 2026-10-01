"use client";
import React from "react";
import { T } from "./tokens";
import { toHexInputValue } from "@/lib/cardColors";

interface ColorSwatchProps {
  value:      string;
  onChange:   (color: string) => void;
  size?:      number;
  clearable?: boolean;
  onClear?:   () => void;
}

export function ColorSwatch({ value, onChange, size, clearable, onClear }: ColorSwatchProps) {
  const sz = size ?? T.comp.swatchSize;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{
        position:     "relative",
        width:        sz,
        height:       sz,
        borderRadius: T.radius.xs,
        overflow:     "hidden",
        border:       `1px solid ${T.border.default}`,
        cursor:       "pointer",
        flexShrink:   0,
      }}>
        <div style={{ position: "absolute", inset: 0, background: value || T.surface.raised }} />
        <input
          type="color"
          // Block 1: rgb()/rgba()/short-hex values (every derived role color,
          // most effective defaults) used to open the picker on a fixed
          // "#141416" — now it opens on the real hue (alpha dropped, the
          // native picker has none).
          value={toHexInputValue(value) ?? "#141416"}
          onChange={e => onChange(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        />
      </div>
      {clearable && value && onClear && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClear(); }}
          style={{
            background: "transparent", border: "none", padding: "0 3px",
            color: T.text.muted, fontSize: 14, cursor: "pointer", lineHeight: 1,
            fontFamily: T.font.sans,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.accent.danger; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.text.muted; }}
        >×</button>
      )}
    </div>
  );
}
