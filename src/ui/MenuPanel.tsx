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
  /** Block 2: accessible name of the dialog (role="dialog"). Each widget
   * passes its own ("Editor de ProfileCard", "Editor de Music", ...). */
  label?:      string;
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
//
// Block 2 (visual system + a11y):
// - L1 surface ("vidrio ahumado, cuerpo sólido"): near-opaque body, NO
//   backdrop blur, 0.5px hairline (1px on 1x screens), inset highlight,
//   two-layer shadow — all in editor.css (.mn-panel), so the hairline
//   fallback and prefers-reduced-transparency can be expressed.
// - role="dialog" + aria-label. Non-modal (aria-modal stays off): the
//   canvas behind keeps working while the panel is open.
// - Focus return: the element focused when the panel mounted gets focus
//   back on unmount, if focus is still inside the panel (or was dropped to
//   <body> by the panel's removal) and that element is still in the DOM.
//   Most openers today are non-focusable gear divs, so this mostly matters
//   for keyboard users who opened a menu from a real button.
export function MenuPanel({ children, pos, width, onKeyDown, style, label }: MenuPanelProps) {
  // Floating panels (`pos`) take focus on mount — the gear that opens them
  // is a non-focusable div, so focus would otherwise stay on <body>: Escape
  // (onKeyDown below) wouldn't reach the panel until the user clicked
  // inside it. preventScroll: the panel is position:fixed anyway.
  const rootRef = useRef<HTMLDivElement>(null);
  const floating = !!pos;
  useEffect(() => {
    const opener = typeof document !== "undefined" ? document.activeElement as HTMLElement | null : null;
    const root = rootRef.current;
    if (floating) root?.focus({ preventScroll: true });
    return () => {
      if (!opener || opener === document.body || !opener.isConnected) return;
      if (root?.contains(opener)) return;
      const active = document.activeElement;
      const focusLost = !active || active === document.body || (root?.contains(active) ?? false);
      if (focusLost) opener.focus?.({ preventScroll: true });
    };
  }, [floating]);
  return (
    <div
      ref={rootRef}
      {...{ [EDITOR_ATTR]: "" }}
      role="dialog"
      aria-label={label ?? "Editor"}
      className="mn-panel"
      tabIndex={-1}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={onKeyDown}
      style={{
        position:      pos ? "fixed" : "relative",
        ...(pos ?? {}),
        width:         width ?? T.comp.panelWidth,
        // Surface (background/hairline/radius/shadow) comes from editor.css
        // (.mn-panel) — NOT inline, so prefers-reduced-transparency can
        // override it. Box model unchanged from before (content-box), so the
        // widgets' portal positioning math keeps matching.
        padding:       T.ui.size.panelPad,
        display:       "flex",
        flexDirection: "column",
        gap:           0,
        zIndex:        pos ? T.z.menu : undefined,
        maxHeight:     pos ? `calc(100vh - ${pos.top + 8}px)` : undefined,
        overflowY:     "auto",
        scrollbarWidth: "thin" as CSSProperties["scrollbarWidth"],
        fontFamily:    T.font.sans,
        color:         T.ui.text.primary,
        outline:       "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
