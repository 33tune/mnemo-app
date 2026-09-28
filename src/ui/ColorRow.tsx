"use client";
import React from "react";
import { MenuRow } from "./MenuRow";
import { ColorSwatch } from "./ColorSwatch";

interface ColorRowProps {
  label:      string;
  value?:     string;
  onChange:   (color: string) => void;
  clearable?: boolean;
  onClear?:   () => void;
}

// Thin composition of MenuRow + ColorSwatch — the `<MenuRow label="Color">
// <ColorSwatch .../></MenuRow>` pattern repeated across every menu (Fase 2:
// Personalization UI/UX) collapsed into one primitive so every "pick a color
// for X" row looks and behaves identically everywhere.
export function ColorRow({ label, value, onChange, clearable, onClear }: ColorRowProps) {
  return (
    <MenuRow label={label}>
      <ColorSwatch value={value ?? "#ffffff"} onChange={onChange} clearable={clearable} onClear={onClear} />
    </MenuRow>
  );
}
