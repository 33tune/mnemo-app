"use client";
import React from "react";
import { T } from "./tokens";

interface MenuSectionProps {
  label:    string;
  children: React.ReactNode;
  first?:   boolean;
}

export function MenuSection({ label, children, first }: MenuSectionProps) {
  return (
    <div style={{ marginTop: first ? 0 : T.space[5], display: "flex", flexDirection: "column", gap: T.space[2] }}>
      <div style={{
        fontFamily:    T.font.mono,
        fontSize:      T.size.label,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color:         T.text.muted,
        userSelect:    "none",
        marginBottom:  2,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
