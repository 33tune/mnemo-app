"use client";
import React from "react";
import { useFieldLabelId, useFieldDescId } from "./MenuRow";
import { Icon, type IconName } from "./icons";

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
  // Editor v3 Phase I: the row's hint (MenuRow hintId) describes the switch.
  const describedBy = useFieldDescId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      aria-labelledby={label ? undefined : labelledBy}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      className="mn-switch"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(!value); }}
    >
      <span className="mn-switch__knob" aria-hidden />
    </button>
  );
}

interface SwitchRowProps {
  label:     string;
  value:     boolean;
  onChange:  (v: boolean) => void;
  icon?:     IconName;
  /** Tooltip / description (e.g. "Solo se ve mientras editás"). */
  hint?:     string;
  disabled?: boolean;
}

/** Liquid glass (DS isSwitch row): glyph, label (14/500), the switch at the
 * end — a 44px row; the switch is named by the label. */
export function SwitchRow({ label, value, onChange, icon, hint, disabled }: SwitchRowProps) {
  return (
    <div className="mn-switchrow" title={hint}>
      {icon && <Icon name={icon} size={17} />}
      <span className="mn-switchrow__label">{label}</span>
      <Toggle value={value} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}
