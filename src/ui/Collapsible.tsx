"use client";
import React, { useId, useState } from "react";
import { T } from "./tokens";
import { Icon } from "./icons";
import { SectionNumber } from "./MenuSection";

interface CollapsibleProps {
  label:        string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
  /** Editor v3 Phase F: something inside differs from its default — the
   * orange "modified" dot before the chevron (design "Espaciado ›"). */
  modified?:    boolean;
  /** Editor v3 Phase G: a short summary before the chevron (design screen
   * 07: "Fuente  Predeterminada ›"). Part of the button's name. */
  hint?:        string;
}

// Block 2: disclosure with aria-expanded/aria-controls; the body animates
// open/closed via grid-template-rows 0fr -> 1fr (220ms, editor.css
// .mn-collapse__body; reduced motion: instant). The body stays mounted so
// it can animate, and is `inert` while closed — not focusable, not read by
// screen readers. Open state is still local and not remembered (Block 3
// owns persistence).
export function Collapsible({ label, children, defaultOpen = false, modified, hint }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const btnId = useId();
  // Liquid glass (DS "more" row): "› Avanzado · 2 cambios" — the chevron
  // first (rotates 90° open), the label 13/600, the summary in ink3; the
  // body unfolds inline (inert while closed).
  return (
    <div style={{ marginTop: T.space[1] }}>
      <button
        type="button"
        aria-expanded={open}
        id={btnId}
        aria-controls={bodyId}
        className="mn-collapse__btn"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%", height: 36,
          padding: "0 4px", background: "transparent", border: "none", cursor: "pointer", userSelect: "none", textAlign: "left",
        }}
      >
        <span className="mn-collapse__chev" style={{ display: "inline-flex" }}>
          <Icon name="chevron-right" size={13} />
        </span>
        <span style={{ fontFamily: T.uiFont.sans, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: "inherit", minWidth: 0 }}>
          {label}
          {modified && <span className="mn-sr-only"> (con cambios)</span>}
        </span>
        {(hint || modified) && (
          <span className="mn-collapse__hint">
            <span className="mn-sr-only">, </span>{hint ?? "· con cambios"}
          </span>
        )}
        {modified && hint && <span className="mn-section__dot" aria-hidden="true" />}
      </button>
      <div id={bodyId} role="group" aria-labelledby={btnId} className="mn-collapse__body" data-open={open} inert={!open}>
        <div className="mn-collapse__inner">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6 }}>
            <SectionNumber value={null}>{children}</SectionNumber>
          </div>
        </div>
      </div>
    </div>
  );
}
