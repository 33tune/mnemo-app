"use client";
import React, { useCallback, useId, useRef, useState } from "react";
import { T } from "./tokens";
import { IconButton } from "./IconButton";
import { ColorPopover, wellHex, wellAlpha } from "./ColorPopover";
import { useFieldLabelId, useFieldDescId } from "./MenuRow";

interface ColorSwatchProps {
  value:      string;
  onChange:   (color: string) => void;
  size?:      number;
  clearable?: boolean;
  onClear?:   () => void;
  /** Block 2: alpha bar + rgba() output. Off by default — many renderer
   * paths (withOpacity, luminance, per-letter gradient interpolation) only
   * understand hex, so alpha is opt-in per call site (ColorRow's
   * keepAlpha sites turn it on). */
  alpha?:     boolean;
  /** Accessible name; inside a labelled MenuRow the row label is used. */
  label?:     string;
  /** Hex readout next to the well (default on). */
  showHex?:   boolean;
}

// Block 2: "ColorWell" — 24px circle with a dark ring + light hairline so
// any color (black on the dark panel, white, translucent over the checker)
// reads; hex in Space Mono 11 beside it. Click opens ColorPopover (custom
// SV/hue/alpha picker, replaces the native <input type=color>, which had
// no alpha and no keyboard model). Same props as before + optional ones.
export function ColorSwatch({ value, onChange, size, clearable, onClear, alpha = false, label, showHex = true }: ColorSwatchProps) {
  const sz = size ?? T.ui.size.swatch;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelledBy = useFieldLabelId();
  const describedBy = useFieldDescId();
  // The popover is named after the row ("Color: Background") when the well
  // itself has no explicit label (A11Y-11). Read at open time, client only.
  const rowLabel = open && !label && labelledBy && typeof document !== "undefined"
    ? document.getElementById(labelledBy)?.textContent ?? undefined
    : undefined;
  // Review round (UX-3): no value = nothing stored and nothing known to
  // show (e.g. a block inheriting the card) — no fake "#FFFFFF".
  const empty = !value;
  const close = useCallback(() => setOpen(false), []);
  const hex = wellHex(value);
  const a = wellAlpha(value);
  // Iteration 0: the value is part of the NAME via aria-labelledby (label +
  // hex) — aria-description (ARIA 1.3) was unevenly supported. A hidden
  // element can still be referenced by aria-labelledby.
  const valueId = useId();
  const valueText = empty ? "sin color propio" : `${hex}${a < 1 ? ` ${Math.round(a * 100)}%` : ""}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: T.space[2] }}>
      {showHex && (
        <span className="mn-hex" aria-hidden>
          {empty ? "—" : <>{hex}{a < 1 ? ` ${Math.round(a * 100)}%` : ""}</>}
        </span>
      )}
      <button
        ref={btnRef}
        type="button"
        className="mn-well"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${empty ? "sin color propio" : hex}` : undefined}
        aria-labelledby={label ? undefined : labelledBy ? `${labelledBy} ${valueId}` : valueId}
        aria-describedby={describedBy}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ width: sz, height: sz }}
      >
        <span aria-hidden className="mn-well__fill" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: value || "transparent" }} />
      </button>
      <span id={valueId} style={{ display: "none" }}>{valueText}</span>
      {clearable && value && onClear && (
        <IconButton icon="close" aria-label="Quitar color" size={24} iconSize={14}
          onClick={() => { onClear(); requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true })); }} />
      )}
      {open && (
        <ColorPopover anchor={btnRef.current} value={value} alpha={alpha} label={label ?? rowLabel} onChange={onChange} onClose={close} />
      )}
    </div>
  );
}
