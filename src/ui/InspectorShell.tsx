"use client";
import React, { useRef, type CSSProperties } from "react";
import { T } from "./tokens";
import { EDITOR_ATTR } from "@/lib/editorGuards";
import { usePanelFocus } from "./MenuPanel";
import { IconButton } from "./IconButton";
import { Icon } from "./icons";

/** id of the inspector's visible h2 — F6 (CanvasBoard) and "Editar" move
 * focus here; the tabpanel is labelled by it. */
export const INSPECTOR_TITLE_ID = "mnemo-inspector-title";
/** id of the collapsed overlay's expand button (2.4.11). */
export const INSPECTOR_EXPAND_ID = "mnemo-inspector-expand";
/** Width of the collapsed overlay tab. */
export const INSPECTOR_COLLAPSED_W = T.ui.size.control + 2 * T.space[2];

interface InspectorShellProps {
  /** The active object's name — the visible h2. */
  title:     string;
  /** Visible context under the h2 ("Card de presentación"). */
  context?:  string;
  children:  React.ReactNode;
  onClose:   () => void;
  /** Where focus goes when the inspector closes ("Editar"); the canvas
   * when it is gone — never <body> (usePanelFocus). */
  returnFocusTo?: () => HTMLElement | null;
  /** Distance from the top of the viewport (the fixed topbar's height). */
  top:       number;
  width:     number;
  /** Narrow viewport: overlays the canvas (no view offset). */
  overlay?:  boolean;
  /** Overlay that covers the card while focus is on the canvas: collapsed
   * to a tab at the right edge (WCAG 2.4.11). */
  collapsed?: boolean;
  onExpand?: () => void;
  bodyRef?:  React.Ref<HTMLDivElement>;
  onBodyScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  id?:       string;
}

// Menu redesign Phase 2: the docked inspector. It EVOLVES MenuPanel instead
// of being a second panel system:
// - same editor root contract (data-mnemo-editor → keyboard guards, focus
//   return via the shared usePanelFocus, mousedown/click stopped so nothing
//   here starts a canvas drag or selects the card);
// - same surface (.mn-panel) with the --docked modifier (editor.css): left
//   hairline, no radius, no outer shadow.
// A landmark, not a dialog (non-modal, the canvas keeps working): <aside>
// with a STABLE name ("Inspector"); the visible h2 changes with the active
// object. Header (h2 + Cerrar) stays put; the body scrolls.
// Rendered through a portal to <body> by its owner — never inside the
// canvas wrapper, whose view-offset transform would re-anchor a fixed box.
export function InspectorShell({
  title, context, children, onClose, returnFocusTo, top, width, overlay, collapsed, onExpand, bodyRef, onBodyScroll, id,
}: InspectorShellProps) {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  usePanelFocus(rootRef, { focusOnMount: () => titleRef.current, returnFocusTo });

  const base: CSSProperties = {
    position:  "fixed",
    top,
    right:     0,
    bottom:    0,
    zIndex:    T.z.inspector,
    display:   "flex",
    flexDirection: "column",
    fontFamily: T.font.sans,
    color:     T.ui.text.primary,
    outline:   "none",
  };

  return (
    <aside
      ref={rootRef}
      id={id}
      {...{ [EDITOR_ATTR]: "" }}
      aria-label="Inspector"
      className={`mn-panel mn-panel--docked${overlay ? " mn-panel--overlay" : ""}`}
      data-collapsed={collapsed ? "" : undefined}
      tabIndex={-1}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        // Esc layering: a popover / draft input stops its own Esc first.
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      style={{ ...base, width: collapsed ? INSPECTOR_COLLAPSED_W : width }}
    >
      {collapsed ? (
        <button
          id={INSPECTOR_EXPAND_ID}
          type="button"
          className="mn-inspector__tab"
          aria-label={`Mostrar inspector: ${title}`}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onExpand?.(); }}
        >
          <Icon name="chevron-left" size={16} />
          <span aria-hidden="true" className="mn-inspector__tab-label">{title}</span>
        </button>
      ) : (
        <>
          <div className="mn-inspector__header" style={{
            display: "flex", alignItems: "center", gap: T.space[2],
            padding: `${T.space[3]}px ${T.ui.size.panelPad}px`,
            boxShadow: `inset 0 -1px 0 ${T.ui.line.group}`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              {context && (
                <span style={{ ...T.type.help, color: T.ui.text.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {context}
                </span>
              )}
              <h2 ref={titleRef} id={INSPECTOR_TITLE_ID} tabIndex={-1} className="mn-inspector__title" style={{
                ...T.type.title, margin: 0, color: T.ui.text.primary,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {title}
              </h2>
            </div>
            <IconButton icon="close" aria-label="Cerrar inspector" onClick={() => onClose()} />
          </div>
          <div
            ref={bodyRef}
            onScroll={onBodyScroll}
            className="mn-inspector__body"
            style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: T.ui.size.panelPad,
              scrollbarWidth: "thin" as CSSProperties["scrollbarWidth"],
            }}
          >
            {children}
          </div>
        </>
      )}
    </aside>
  );
}
