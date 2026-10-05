"use client";
import React, { useId, useRef, useState } from "react";
import { T } from "./tokens";
import { FieldResetMark, labelStyle, type FieldStateProps } from "./MenuRow";
import { numberFieldCommit, formatEditValue, inferDisplayScale, wasClamped } from "@/lib/uiNumeric";

export interface NumberFieldProps extends FieldStateProps {
  /** Visible label WITH unit ("Ancho (px)"). */
  label:    string;
  value:    number;
  min:      number;
  max:      number;
  step?:    number;
  unit?:    string;
  fmt?:     (v: number) => string;
  displayScale?:  number;
  displayOffset?: number;
  /** `phase` is reserved for Iteration 1 (preview vs commit); today every
   * call is a commit. */
  onChange: (v: number, phase?: "commit") => void;
  /** Review r2 (A11y-4): e.g. a locked element — the reason is shown by the
   * caller next to the fields. */
  disabled?: boolean;
}

/**
 * Iteration 0: precise numeric entry (Medidas: Ancho/Alto/X/Y/Rotación).
 * Not a second numeric editor — it reuses SliderRow's tested commit
 * (uiNumeric.commitSliderDraft: unchanged text never writes, clamp/snap to
 * min/max/step), its `.mn-value-input` look and its props. Enter/blur
 * commits; Esc reverts an edited draft (a second Esc reaches the panel).
 * The range is in aria-describedby; a clamped value is shown and announced.
 */
export function NumberField({
  label, value, min, max, step = 1, unit = "", fmt, displayScale, displayOffset = 0, onChange, state, onReset, disabled,
}: NumberFieldProps) {
  const id = useId();
  const rangeId = useId();
  const statusId = useId();
  const scale = displayScale ?? inferDisplayScale(fmt, min, max);
  const offset = displayScale !== undefined ? displayOffset : 0;
  const shown = formatEditValue(value + offset, step, scale);
  const [draft, setDraft] = useState<string | null>(null);
  const initial = useRef<string | null>(null);
  const [notice, setNotice] = useState("");

  function commit() {
    if (draft === null) return;
    const spec = { min, max, step, scale, offset };
    // Review r2: the baseline moves to the committed text, so typing the
    // previous value back (without leaving the field) applies again.
    const { value: next, baseline } = numberFieldCommit(draft, initial.current, spec, value);
    initial.current = baseline;
    if (next !== null) {
      setNotice(wasClamped(draft, next, spec) ? `Ajustado a ${formatEditValue(next + offset, step, scale)}${unit ? ` ${unit}` : ""}` : "");
      onChange(next, "commit");
    } else setNotice("");
    setDraft(null);
  }

  const lo = formatEditValue(min + offset, step, scale);
  const hi = formatEditValue(max + offset, step, scale);
  return (
    <div className="mn-field" data-state={state}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: T.ui.size.row, gap: T.space[2], position: "relative" }}>
      {state === "modified" && onReset && <FieldResetMark label={label} onReset={onReset} />}
      <label htmlFor={id} style={{ ...labelStyle, minWidth: 0 }}>{label}</label>
      <input
        id={id}
        className="mn-value-input mn-value-input--field"
        inputMode="decimal"
        disabled={disabled}
        value={draft ?? shown}
        aria-describedby={`${rangeId} ${statusId}`}
        onFocus={e => { initial.current = shown; setDraft(shown); e.currentTarget.select(); }}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape" && draft !== null && draft.trim() !== initial.current) {
            e.preventDefault(); e.stopPropagation();
            setDraft(initial.current);
            const el = e.currentTarget;
            requestAnimationFrame(() => el.select());
          }
        }}
        style={{ width: 72, textAlign: "right" }}
      />
      <span id={rangeId} style={{ display: "none" }}>{`Entre ${lo} y ${hi}${unit ? ` ${unit}` : ""}`}</span>
      <span id={statusId} role="status" className="mn-sr-only">{notice}</span>
    </div>
  );
}
