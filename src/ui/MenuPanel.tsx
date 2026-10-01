"use client";
import React, { useEffect, useRef, type CSSProperties } from "react";
import { T } from "./tokens";
import { EDITOR_ATTR } from "@/lib/editorGuards";

interface MenuPanelProps {
  children:    React.ReactNode;
  pos?:        { left: number; top: number };
  width?:      number;
  onKeyDown?:  (e: React.KeyboardEvent) => void;
  style?:      CSSProperties;
}

// Block 1 (editor safety):
// - `data-mnemo-editor` marks this as an editor root — CanvasBoard's global
//   shortcuts (Delete/Backspace/Ctrl+Z/...) skip any event from inside it
//   (see editorGuards.ts).
// - tabIndex={-1} (+ autofocus when floating, below): clicking a non-focusable spot in the panel (a label, the
//   padding) focuses the panel itself instead of leaving focus on <body>,
//   so the guard above still sees "inside the editor" for the next key.
// - mousedown/click stay stopped (drag/selection never start from the
//   panel). mousemove/mouseover are deliberately NOT stopped: CanvasBoard's
//   wrapper onMouseMove drives in-progress canvas drags, which must keep
//   working while the cursor crosses the panel, and a card that portals this
//   panel from inside its own JSX needs to SEE the panel's mouseover to know
//   the pointer left its DOM (React never fires onMouseLeave for that move —
//   the panel is a fiber descendant). Cards filter by DOM containment
//   instead — see isEventFromNode (editorGuards.ts) and ProfileCard.tsx.
export function MenuPanel({ children, pos, width, onKeyDown, style }: MenuPanelProps) {
  // Floating panels (`pos`) take focus on mount — the gear that opens them
  // is a non-focusable div, so focus would otherwise stay on <body>: Escape
  // (onKeyDown below) wouldn't reach the panel until the user clicked
  // inside it. preventScroll: the panel is position:fixed anyway.
  const rootRef = useRef<HTMLDivElement>(null);
  const floating = !!pos;
  useEffect(() => {
    if (floating) rootRef.current?.focus({ preventScroll: true });
  }, [floating]);
  return (
    <div
      ref={rootRef}
      {...{ [EDITOR_ATTR]: "" }}
      tabIndex={-1}
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
        outline:       "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
