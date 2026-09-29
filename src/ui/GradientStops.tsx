"use client";
import { T } from "./tokens";
import { ColorSwatch } from "./ColorSwatch";
import { ActionButton } from "./ActionButton";

interface GradientStopsProps {
  colors:   string[];
  onChange: (colors: string[]) => void;
  min?:     number;
  max?:     number;
}

const DEFAULT_MIN = 2;
const DEFAULT_MAX = 6;
const NEW_STOP_FALLBACK = "#8a8a96";

// Reusable N-color editor (Product closeout: multicolor gradient text) — one
// row per color (swatch + remove ×, same visual language as Contact Links'
// list-item row in ProfileContactLinksMenu.tsx), plus a trailing "+" button.
// Colors are evenly distributed across the gradient's angle by the caller —
// this component only edits the color list itself, no per-stop position
// control (kept simple; add one only if a real need shows up).
export function GradientStops({ colors, onChange, min = DEFAULT_MIN, max = DEFAULT_MAX }: GradientStopsProps) {
  function setColor(i: number, v: string) {
    const next = [...colors];
    next[i] = v;
    onChange(next);
  }
  function removeAt(i: number) {
    if (colors.length <= min) return;
    onChange(colors.filter((_, idx) => idx !== i));
  }
  function add() {
    if (colors.length >= max) return;
    onChange([...colors, NEW_STOP_FALLBACK]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {colors.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: T.font.mono, fontSize: T.size.xs, color: T.text.muted,
            minWidth: 14, textAlign: "right", fontVariantNumeric: "tabular-nums",
          }}>{i + 1}</span>
          <ColorSwatch value={c} onChange={v => setColor(i, v)} />
          <div style={{ flex: 1 }} />
          {colors.length > min && (
            <button
              title="Quitar color"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); removeAt(i); }}
              style={{ background: "transparent", border: "none", color: T.text.muted, fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
            >×</button>
          )}
        </div>
      ))}
      {colors.length < max && (
        <ActionButton onClick={add}>+ color</ActionButton>
      )}
    </div>
  );
}
