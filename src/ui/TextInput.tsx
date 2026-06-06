"use client";
import React from "react";
import { T } from "./tokens";

interface TextInputProps {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  onKeyDown?:   (e: React.KeyboardEvent<HTMLInputElement>) => void;
  mono?:        boolean;
  type?:        string;
  maxLength?:   number;
  style?:       React.CSSProperties;
}

export function TextInput({ value, onChange, placeholder, onKeyDown, mono, type = "text", maxLength, style }: TextInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      type={type}
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{
        display:       "block",
        width:         "100%",
        height:        T.comp.inputH,
        background:    T.surface.input,
        border:        `1px solid ${focused ? T.border.strong : T.border.default}`,
        borderRadius:  T.radius.md,
        padding:       "0 10px",
        color:         T.text.primary,
        fontFamily:    mono ? T.font.mono : T.font.sans,
        fontSize:      mono ? T.size.xs : T.size.base,
        letterSpacing: mono ? "0.02em" : 0,
        outline:       "none",
        boxSizing:     "border-box",
        transition:    "border-color 0.1s",
        ...style,
      }}
    />
  );
}
