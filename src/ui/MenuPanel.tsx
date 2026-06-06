"use client";
import React, { type CSSProperties } from "react";
import { T } from "./tokens";

interface MenuPanelProps {
  children:    React.ReactNode;
  pos?:        { left: number; top: number };
  width?:      number;
  onKeyDown?:  (e: React.KeyboardEvent) => void;
  style?:      CSSProperties;
}

export function MenuPanel({ children, pos, width, onKeyDown, style }: MenuPanelProps) {
  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={onKeyDown}
      style={{
        position:      pos ? "fixed" : "relative",
        ...(pos ?? {}),
        width:         width ?? T.comp.panelWidth,
        background:    T.surface.base,
        border:        `1px solid ${T.border.default}`,
        borderRadius:  T.radius.lg,
        padding:       T.space[4],
        boxShadow:     T.shadow.panel,
        display:       "flex",
        flexDirection: "column",
        gap:           0,
        zIndex:        pos ? 999999 : undefined,
        maxHeight:     pos ? `calc(100vh - ${pos.top + 8}px)` : undefined,
        overflowY:     "auto",
        scrollbarWidth: "thin" as CSSProperties["scrollbarWidth"],
        fontFamily:    T.font.sans,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
