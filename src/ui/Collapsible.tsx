"use client";
import React, { useState } from "react";
import { T } from "./tokens";

interface CollapsibleProps {
  label:        string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ label, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: T.space[4] }}>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          width:          "100%",
          padding:        `${T.space[2]}px 0`,
          background:     "transparent",
          border:         "none",
          borderTop:      `1px solid ${T.border.subtle}`,
          cursor:         "pointer",
          userSelect:     "none",
        }}
      >
        <span style={{
          fontFamily:    T.font.mono,
          fontSize:      T.size.label,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         open ? T.text.secondary : T.text.muted,
          transition:    "color 0.12s",
        }}>
          {label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", flexShrink: 0 }}>
          <path d="M1 3L5 7L9 3" stroke={T.text.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: T.space[2], paddingTop: T.space[3] }}>
          {children}
        </div>
      )}
    </div>
  );
}
