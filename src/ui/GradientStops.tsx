"use client";
import React, { useState } from "react";
import { T } from "./tokens";
import { ColorSwatch } from "./ColorSwatch";
import { IconButton } from "./IconButton";
import { labelStyle } from "./MenuRow";
import { wellHex } from "./ColorPopover";

interface GradientStopsProps {
  colors:   string[];
  onChange: (colors: string[]) => void;
  min?:     number;
  max?:     number;
}

const DEFAULT_MIN = 2;
const DEFAULT_MAX = 6;
const NEW_STOP_FALLBACK = "#8a8a96";

// Reusable N-color editor (Product closeout: multicolor gradient text).
// Block 2 "GradientBar": a 20px bar rendering the real gradient (stops
// evenly distributed, same as the renderer — no per-stop position control),
// with one 14px handle per stop. Click (or ArrowLeft/Right on a focused
// handle) selects a stop; the row below edits the selected stop's color
// with the ColorWell, removes it, or adds a new one. Colors stay opaque hex
// on purpose: the per-letter animation interpolates them with a hex-only
// mixer (cardColors.ts interpolateMulticolor).
export function GradientStops({ colors, onChange, min = DEFAULT_MIN, max = DEFAULT_MAX }: GradientStopsProps) {
  const [sel, setSel] = useState(0);
  const selected = Math.min(sel, colors.length - 1);
  const n = colors.length;
  const posOf = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);

  function setColor(i: number, v: string) {
    const next = [...colors];
    next[i] = v;
    onChange(next);
  }
  const barRef = React.useRef<HTMLDivElement>(null);
  function removeSelected(fromTrash = false) {
    if (n <= min) return;
    const nextSel = Math.max(0, selected - 1);
    onChange(colors.filter((_, idx) => idx !== selected));
    setSel(nextSel);
    // A11Y-2: the removed handle (keyboard Delete) or a trash button that
    // just became disabled can't keep focus — hand it to the new selection.
    if (!fromTrash || n - 1 <= min) {
      requestAnimationFrame(() => (barRef.current?.children[nextSel] as HTMLElement | undefined)?.focus({ preventScroll: true }));
    }
  }
  function add() {
    if (n >= max) return;
    onChange([...colors, NEW_STOP_FALLBACK]);
    setSel(n);
  }
  function onHandleKey(e: React.KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = Math.min(n - 1, i + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, i - 1);
    else if ((e.key === "Delete" || e.key === "Backspace") && n > min) {
      e.preventDefault(); e.stopPropagation(); removeSelected(); return;
    }
    if (next < 0) return;
    e.preventDefault(); e.stopPropagation();
    setSel(next);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <div role="group" aria-label="Editor de gradiente" style={{ display: "flex", flexDirection: "column", gap: T.space[2] }}>
      <div style={{ padding: "0 7px" }}>
        <div ref={barRef} className="mn-gbar" role="radiogroup" aria-label="Colores del gradiente" style={{
          position: "relative", height: 20, borderRadius: 6,
          background: n > 1 ? `linear-gradient(to right, ${colors.join(", ")})` : colors[0],
          boxShadow: `inset 0 0 0 0.5px ${T.ui.line.control}`,
        }}>
          {colors.map((c, i) => (
            <button
              key={i}
              type="button"
              className="mn-gstop"
              role="radio"
              aria-label={`Color ${i + 1} de ${n}, ${wellHex(c)}`}
              aria-checked={i === selected}
              tabIndex={i === selected ? 0 : -1}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setSel(i); }}
              onKeyDown={e => onHandleKey(e, i)}
              style={{ left: `${posOf(i)}%`, background: c }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: T.space[2], minHeight: T.ui.size.row }}>
        <span style={{ ...labelStyle, flex: 1 }}>Color {selected + 1}</span>
        <ColorSwatch value={colors[selected]} onChange={v => setColor(selected, v)} label={`Color ${selected + 1}`} />
        <IconButton icon="trash" tone="danger" aria-label={`Quitar color ${selected + 1}`} disabled={n <= min} onClick={() => removeSelected(true)} />
        <IconButton icon="plus" aria-label="Agregar color" disabled={n >= max} onClick={add} />
      </div>
    </div>
  );
}
