"use client";
import React from "react";
import { MenuRow } from "./MenuRow";
import { ColorSwatch } from "./ColorSwatch";
import { keepAlphaOf } from "@/lib/cardColors";

interface ColorRowProps {
  label:      string;
  value?:     string;
  onChange:   (color: string) => void;
  clearable?: boolean;
  onClear?:   () => void;
  /** Block 1: re-apply `value`'s alpha (when < 1) to the picked hue — the
   * native picker is opaque-only, see cardColors.ts's keepAlphaOf. */
  keepAlpha?: boolean;
}

// Thin composition of MenuRow + ColorSwatch — the `<MenuRow label="Color">
// <ColorSwatch .../></MenuRow>` pattern repeated across every menu (Fase 2:
// Personalization UI/UX) collapsed into one primitive so every "pick a color
// for X" row looks and behaves identically everywhere.
export function ColorRow({ label, value, onChange, clearable, onClear, keepAlpha }: ColorRowProps) {
  return (
    <MenuRow label={label}>
      <ColorSwatch value={value ?? "#ffffff"} onChange={keepAlpha ? v => onChange(keepAlphaOf(v, value)) : onChange}
        clearable={clearable} onClear={onClear} />
    </MenuRow>
  );
}
