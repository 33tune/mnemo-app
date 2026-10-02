"use client";
import React from "react";
import { T } from "./tokens";
import { useFieldLabelId } from "./MenuRow";

interface TextInputProps {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  onKeyDown?:   (e: React.KeyboardEvent<HTMLInputElement>) => void;
  mono?:        boolean;
  type?:        string;
  maxLength?:   number;
  style?:       React.CSSProperties;
  /** Block 2: accessible name. Inside a labelled MenuRow the row label is
   * used (aria-labelledby); otherwise falls back to the placeholder. */
  label?:       string;
  id?:          string;
}

// Block 2: background/hairline/hover/focus ring come from editor.css
// (.mn-input) — the old `outline: none` + border-color-on-focus is replaced
// by the shared :focus-visible ring (always shown on text fields). Same
// props as before; `style` still overrides layout per call site.
export function TextInput({ value, onChange, placeholder, onKeyDown, mono, type = "text", maxLength, style, label, id }: TextInputProps) {
  const labelledBy = useFieldLabelId();
  return (
    <input
      id={id}
      type={type}
      className="mn-input"
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={label ?? (labelledBy ? undefined : placeholder)}
      aria-labelledby={label ? undefined : labelledBy}
      style={{
        display:       "block",
        width:         "100%",
        height:        T.comp.inputH,
        padding:       "0 10px",
        fontFamily:    mono ? T.font.mono : T.font.sans,
        fontSize:      mono ? T.size.xs : T.size.base,
        letterSpacing: mono ? "0.02em" : 0,
        boxSizing:     "border-box",
        ...style,
      }}
    />
  );
}
