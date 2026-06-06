"use client";
import React from "react";
import { T } from "./tokens";

interface ToggleProps {
  value:    boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(!value); }}
      onMouseDown={e => e.stopPropagation()}
      style={{
        width:      T.comp.toggleW,
        height:     T.comp.toggleH,
        borderRadius: T.radius.full,
        background: value ? T.accent.default : T.surface.raised,
        border:     `1px solid ${value ? T.border.strong : T.border.subtle}`,
        position:   "relative",
        cursor:     "pointer",
        flexShrink: 0,
        transition: "background 0.15s ease, border-color 0.15s ease",
        userSelect: "none",
      }}
    >
      <div style={{
        position:   "absolute",
        top:        2,
        left:       value ? T.comp.toggleW - T.comp.toggleH + 2 : 2,
        width:      T.comp.toggleH - 4,
        height:     T.comp.toggleH - 4,
        borderRadius: "50%",
        background: value ? T.surface.base : T.text.muted,
        transition: "left 0.15s ease, background 0.15s ease",
        boxShadow:  "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </div>
  );
}
