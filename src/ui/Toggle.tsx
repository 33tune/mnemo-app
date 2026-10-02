"use client";
import React from "react";
import { useFieldLabelId } from "./MenuRow";

interface ToggleProps {
  value:     boolean;
  onChange:  (v: boolean) => void;
  /** Accessible name. Optional: inside a labelled MenuRow the row's label
   * is used automatically (aria-labelledby). */
  label?:    string;
  disabled?: boolean;
}

// Block 2: a real switch — <button role="switch" aria-checked>, so Space/
// Enter toggle it natively and it is reachable by Tab. 36x22, off = 12%
// white track, on = near-white track with a dark knob; knob slides 180ms
// (editor.css .mn-switch — reduced motion: fade only). Same props as before,
// every existing call site keeps working.
export function Toggle({ value, onChange, label, disabled }: ToggleProps) {
  const labelledBy = useFieldLabelId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      aria-labelledby={label ? undefined : labelledBy}
      aria-disabled={disabled || undefined}
      className="mn-switch"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(!value); }}
    >
      <span className="mn-switch__knob" aria-hidden />
    </button>
  );
}
