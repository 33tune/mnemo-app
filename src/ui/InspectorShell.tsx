"use client";
import React, { useRef, type CSSProperties } from "react";
import { T, uv } from "./tokens";
import { EDITOR_ATTR } from "@/lib/editorGuards";
import { usePanelFocus } from "./MenuPanel";
import { IconButton } from "./IconButton";
import { Icon } from "./icons";

/** id of the inspector's visible h2 — F6 (CanvasBoard) and "Editar" move
 * focus here; the tabpanel is labelled by it. */
export const INSPECTOR_TITLE_ID = "mnemo-inspector-title";
/** id of the collapsed overlay's expand button (2.4.11). */
export const INSPECTOR_EXPAND_ID = "mnemo-inspector-expand";
/** Width of the collapsed docked tab. */
export const INSPECTOR_COLLAPSED_W = T.ui.size.control + 2 * T.space[2];
/** Phase B: touch target inside the bottom sheet (design: 44px). */
export const SHEET_TARGET = 44;
/** Height of the collapsed bottom sheet (one 44px bar + its padding). */
export const INSPECTOR_SHEET_COLLAPSED_H = SHEET_TARGET + 2 * T.space[2];
/** Max width of the sheet's content column. */
export const SHEET_CONTENT_MAX = 560;

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
  /** Phase B: "dock" (right edge) or "sheet" (narrow viewport: bottom
   * sheet below the selected element, 44px targets). */
  mode?:     "dock" | "sheet";
  /** Sheet height (mode "sheet"). */
  height?:   number;
  /** An inspector that would cover the element while focus is on the
   * canvas collapses (WCAG 2.4.11): to a tab at the right edge (dock) or to
   * a bar at the bottom (sheet). */
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
  title, context, children, onClose, returnFocusTo, top, width, mode = "dock", height = 0, collapsed, onExpand, bodyRef, onBodyScroll, id,
}: InspectorShellProps) {
  const sheet = mode === "sheet";
  // Review B-UX-5: a full-width sheet on a ~900px window would stretch the
  // controls; its content stays a centered column of at most 560px.
  const sideGutter = sheet
    ? `max(${T.ui.size.panelPad}px, calc((100% - ${SHEET_CONTENT_MAX}px) / 2))`
    : `${T.ui.size.panelPad}px`;
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  usePanelFocus(rootRef, { focusOnMount: () => titleRef.current, returnFocusTo });

  // Dock: right edge, under the topbar. Sheet: full-width, from the bottom.
  const box: CSSProperties = sheet
    ? { left: 0, right: 0, bottom: 0, height: collapsed ? INSPECTOR_SHEET_COLLAPSED_H : height }
    : { top, right: 0, bottom: 0, width: collapsed ? INSPECTOR_COLLAPSED_W : width };
  const base: CSSProperties = {
    position:  "fixed",
    ...box,
    zIndex:    T.z.inspector,
    display:   "flex",
    flexDirection: "column",
    fontFamily: T.uiFont.sans,
    color:     uv("text-primary"),
    outline:   "none",
  };

  return (
    <aside
      ref={rootRef}
      id={id}
      {...{ [EDITOR_ATTR]: "" }}
      aria-label="Inspector"
      className={`mn-panel ${sheet ? "mn-panel--sheet" : "mn-panel--docked"}`}
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
      data-mode={mode}
      style={base}
    >
      {collapsed ? (
        <button
          id={INSPECTOR_EXPAND_ID}
          type="button"
          className={sheet ? "mn-inspector__bar" : "mn-inspector__tab"}
          aria-label={`Mostrar inspector: ${title}`}
          // Review B-A11y-4: the collapsed state is exposed (4.1.2).
          aria-expanded={false}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onExpand?.(); }}
        >
          <Icon name={sheet ? "chevron-up" : "chevron-left"} size={16} />
          <span aria-hidden="true" className={sheet ? "mn-inspector__bar-label" : "mn-inspector__tab-label"}>{title}</span>
        </button>
      ) : (
        <>
          {sheet && <span aria-hidden="true" className="mn-inspector__grab" />}
          <div className="mn-inspector__header" style={{
            display: "flex", alignItems: "center", gap: T.space[2],
            padding: `${T.space[3]}px ${sideGutter}`,
            boxShadow: `inset 0 -1px 0 ${uv("line-group")}`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              {context && (
                <span style={{ ...T.type.help, color: uv("text-secondary"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {context}
                </span>
              )}
              <h2 ref={titleRef} id={INSPECTOR_TITLE_ID} tabIndex={-1} className="mn-inspector__title" style={{
                ...T.type.title, margin: 0, color: uv("text-primary"),
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {title}
              </h2>
            </div>
            <IconButton icon="close" aria-label="Cerrar inspector" size={sheet ? SHEET_TARGET : undefined} onClick={() => onClose()} />
          </div>
          <div
            ref={bodyRef}
            onScroll={onBodyScroll}
            className="mn-inspector__body"
            style={{
              flex: 1, minHeight: 0, overflowY: "auto",
              padding: `${T.ui.size.panelPad}px ${sideGutter}`,
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
