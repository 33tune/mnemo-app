"use client";
import React from "react";
import { MenuRow, type FieldStateProps } from "./MenuRow";
import { ColorSwatch } from "./ColorSwatch";

interface ColorRowProps extends FieldStateProps {
  label:      string;
  value?:     string;
  onChange:   (color: string) => void;
  clearable?: boolean;
  onClear?:   () => void;
  /** Block 1 introduced this for translucent colors (spotlight, default
   * border, card bg) under an opaque-only native picker. Block 2: it now
   * marks the color as ALPHA-CAPABLE — the picker shows an alpha bar and
   * emits rgba(), and picking a hue (SV area, hue bar, 6-digit hex) keeps
   * the current alpha untouched; only the alpha bar/field changes it.
   * Without it the picker stays opaque (hex out), as before. */
  keepAlpha?: boolean;
  /** Explicit override of the alpha capability (defaults to keepAlpha). */
  alpha?:     boolean;
}

// Thin composition of MenuRow + ColorSwatch — the `<MenuRow label="Color">
// <ColorSwatch .../></MenuRow>` pattern repeated across every menu (Fase 2:
// Personalization UI/UX) collapsed into one primitive so every "pick a color
// for X" row looks and behaves identically everywhere. Block 2: carries the
// field state (modified -> reset dot, inherited -> "Card" chip).
export function ColorRow({ label, value, onChange, clearable, onClear, keepAlpha, alpha, state, onReset, inheritedLabel }: ColorRowProps) {
  return (
    <MenuRow label={label} state={state} onReset={onReset} inheritedLabel={inheritedLabel}>
      {/* The modified dot (-> reset) IS the clear affordance once a call
          site wires field state — no second "x" next to the well. */}
      <ColorSwatch value={value ?? ""} onChange={onChange} alpha={alpha ?? !!keepAlpha}
        clearable={clearable && !(state === "modified" && onReset)} onClear={onClear} />
    </MenuRow>
  );
}
