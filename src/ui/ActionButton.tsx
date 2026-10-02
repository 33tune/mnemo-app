"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ActionButtonProps {
  children:      React.ReactNode;
  variant?:      Variant;
  fullWidth?:    boolean;
  onClick?:      (e: React.MouseEvent) => void;
  onMouseDown?:  (e: React.MouseEvent) => void;
  disabled?:     boolean;
}

// Block 2: restyled to the editor system — 32px, radius 8, DM Sans 13 w500.
// All visuals (variants, :hover/:active, :focus-visible ring, disabled) live
// in editor.css (.mn-btn--*), so there is no per-button hover state in JS
// anymore. `danger` is neutral at rest and turns #FF5A52 only on hover —
// the editor chrome is monochrome; red only signals a destructive action
// the pointer is about to trigger. Same props as before.
export function ActionButton({ children, variant = "secondary", fullWidth, onClick, onMouseDown, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`mn-btn mn-btn--${variant}`}
      onMouseDown={onMouseDown ?? (e => e.stopPropagation())}
      onClick={onClick ?? (e => e.stopPropagation())}
      disabled={disabled}
      style={{ width: fullWidth ? "100%" : undefined }}
    >
      {children}
    </button>
  );
}
