"use client";
import React, { forwardRef } from "react";
import { Icon, type IconName } from "@/ui";
import { EDITOR_UI_ATTR, CANVAS_ATTR, CHROME_ATTR } from "@/lib/editorGuards";

interface Props {
  icon:          IconName;
  /** Accessible name ("Editar card de presentación", "Bloquear Music"...). */
  label:         string;
  /** `e.detail === 0` = keyboard activation (Enter/Space). */
  onActivate:    (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Absolute position inside the element's box. */
  style?:        React.CSSProperties;
  expanded?:     boolean;
  controls?:     string;
  pressed?:      boolean;
  /** Pointer-only gestures (rotate drag) — the click still activates. */
  onMouseDown?:  (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Esc on the button: close what it opened (if anything) — the button
   * then hands focus back to the canvas, keeping the selection (layered
   * Esc: panel → "Editar" → canvas → deselect). */
  onEscape?:     () => void;
  children?:     React.ReactNode;
  /** Stable id (Phase B: the inspector host returns focus to "Editar"). */
  id?:           string;
}

/**
 * Iteration 0: real <button> for the canvas chrome of a selected element
 * (the "Editar" opener, lock, rotate) — replaces 16-20px divs that were not
 * focusable/nameable. Wrapped in a [data-mnemo-ui] span so:
 * - editorGuards' positive canvas guard never lets Backspace/arrows act
 *   while one of these has focus (Esc → focus on "Editar" → Backspace does
 *   not delete the card);
 * - the canvas' mousedown-capture doesn't steal its focus.
 * mousedown is stopped (never starts a drag/selection); a <button> is not
 * natively draggable, so the draggable={false} rule doesn't apply.
 * `data-canvas-hot` (on the button) keeps it reachable through an
 * overlapping image (hitStack.ts / peekHotControlAt).
 */
export const CanvasChromeButton = forwardRef<HTMLButtonElement, Props>(function CanvasChromeButton(
  { icon, label, onActivate, style, expanded, controls, pressed, onMouseDown, onEscape, children, id },
  ref,
) {
  return (
    <span {...{ [EDITOR_UI_ATTR]: "" }} style={{ position: "absolute", zIndex: 20, display: "inline-flex", ...style }}>
      <button
        ref={ref}
        id={id}
        type="button"
        // Review r2 (Critic-4): the hot-control marker sits on the BUTTON —
        // hitStack's forwarded mousedown/click must reach its handlers.
        data-canvas-hot=""
        // Review r2 (Critic-2): pointer activation keeps focus on the canvas
        // (CanvasBoard's mousedown capture), keyboard keeps it here.
        {...{ [CHROME_ATTR]: "" }}
        className={children ? "mn-canvas-btn mn-canvas-btn--rect" : "mn-canvas-btn"}
        aria-label={label}
        title={label}
        aria-expanded={expanded}
        aria-controls={expanded ? controls : undefined}
        aria-pressed={pressed}
        onMouseDown={e => { e.stopPropagation(); onMouseDown?.(e); }}
        onClick={e => { e.stopPropagation(); onActivate(e); }}
        onKeyDown={e => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          onEscape?.();
          const canvas = e.currentTarget.closest(`[${CANVAS_ATTR}]`) as HTMLElement | null;
          canvas?.focus({ preventScroll: true });
        }}
      >
        {children ?? <Icon name={icon} size={14} />}
      </button>
    </span>
  );
});
