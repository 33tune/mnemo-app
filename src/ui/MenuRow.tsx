"use client";
import React from "react";
import { T } from "./tokens";

interface MenuRowProps {
  label?:   string;
  children: React.ReactNode;
}

export function MenuRow({ label, children }: MenuRowProps) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      minHeight:      T.comp.rowHeight,
      gap:            T.space[2],
    }}>
      {label && (
        <span style={{
          fontFamily: T.font.sans,
          fontSize:   T.size.sm,
          color:      T.text.secondary,
          flexShrink: 0,
        }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: T.space[1], marginLeft: label ? "auto" : 0, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}
