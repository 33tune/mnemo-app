"use client";
import React from "react";
import { T } from "./tokens";

interface Tab { id: string; label: string; }

interface TabsProps {
  tabs:     Tab[];
  active:   string;
  onChange: (id: string) => void;
  variant?: "pill" | "underline";
}

export function Tabs({ tabs, active, onChange, variant = "pill" }: TabsProps) {
  if (variant === "underline") {
    return (
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border.subtle}`, marginBottom: T.space[4] }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onChange(t.id); }}
            style={{
              flex:         1,
              height:       36,
              background:   "transparent",
              border:       "none",
              borderBottom: active === t.id ? `1px solid ${T.text.primary}` : "1px solid transparent",
              marginBottom: -1,
              cursor:       "pointer",
              fontFamily:   T.font.mono,
              fontSize:     T.size.label,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color:        active === t.id ? T.text.primary : T.text.muted,
              transition:   "color 0.1s, border-color 0.1s",
              userSelect:   "none",
            }}
          >{t.label}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 2, background: T.surface.raised, borderRadius: T.radius.md, padding: 2 }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onChange(t.id); }}
          style={{
            flex:          1,
            height:        26,
            background:    active === t.id ? T.surface.overlay : "transparent",
            border:        "none",
            borderRadius:  T.radius.sm,
            cursor:        "pointer",
            fontFamily:    T.font.mono,
            fontSize:      T.size.xs,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color:         active === t.id ? T.text.primary : T.text.muted,
            transition:    "background 0.12s, color 0.12s",
            userSelect:    "none",
          }}
        >{t.label}</button>
      ))}
    </div>
  );
}
