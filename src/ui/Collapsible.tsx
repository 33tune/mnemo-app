"use client";
import React, { useId, useState } from "react";
import { T } from "./tokens";
import { Icon } from "./icons";

interface CollapsibleProps {
  label:        string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
}

// Block 2: disclosure with aria-expanded/aria-controls; the body animates
// open/closed via grid-template-rows 0fr -> 1fr (220ms, editor.css
// .mn-collapse__body; reduced motion: instant). The body stays mounted so
// it can animate, and is `inert` while closed — not focusable, not read by
// screen readers. Open state is still local and not remembered (Block 3
// owns persistence).
export function Collapsible({ label, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const btnId = useId();
  return (
    <div style={{ marginTop: T.space[4] }}>
      <button
        type="button"
        aria-expanded={open}
        id={btnId}
        aria-controls={bodyId}
        className="mn-collapse__btn"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            T.space[1],
          width:          "100%",
          minHeight:      T.ui.size.row,
          padding:        0,
          background:     "transparent",
          border:         "none",
          // Top hairline + focus ring: editor.css (.mn-collapse__btn).
          borderRadius:   0,
          cursor:         "pointer",
          userSelect:     "none",
          textAlign:      "left",
        }}
      >
        {/* v3: a disclosure ROW ("Espaciado ›") - label first, chevron at
            the end (rotates 90° open). r2: DS "control" role (550) so a
            disclosure never reads like a field label (450). */}
        <span style={{ ...T.type.control, color: "inherit", minWidth: 0 }}>{label}</span>
        <span className="mn-collapse__chev" style={{ display: "inline-flex", marginLeft: "auto" }}>
          <Icon name="chevron-right" size={14} />
        </span>
      </button>
      <div id={bodyId} role="group" aria-labelledby={btnId} className="mn-collapse__body" data-open={open} inert={!open}>
        <div className="mn-collapse__inner">
          <div style={{ display: "flex", flexDirection: "column", gap: T.space[2], paddingTop: T.space[2] }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
