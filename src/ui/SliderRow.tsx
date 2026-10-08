"use client";
import React, { useId, useRef, useState } from "react";
import { T } from "./tokens";
import { FieldResetMark, InheritedChip, labelStyle, type FieldStateProps } from "./MenuRow";
import { inferDisplayScale, formatEditValue, commitSliderDraft, resolveSliderDoubleClick } from "@/lib/uiNumeric";

interface SliderRowProps extends FieldStateProps {
  label:    string;
  value:    number;
  min:      number;
  max:      number;
  step?:    number;
  unit?:    string;
  fmt?:     (v: number) => string;
  onChange: (v: number) => void;
  /** Double-click on the track resets to this value (when provided). */
  defaultValue?: number;
  /** Review round (UX-5): explicit stored<->displayed mapping for the
   * click-to-edit field when `fmt` is not a clean multiple of the value
   * (e.g. hover scale shown as `(v - 1) * 100`%). Displayed =
   * (value + displayOffset) * displayScale. Without these the scale is
   * inferred from `fmt` (uiNumeric.inferDisplayScale), as before. */
  displayScale?:  number;
  displayOffset?: number;
  disabled?: boolean;
}

// Block 2: same props as before (every ~109 call site unchanged), now:
// - <label htmlFor> + aria-valuetext (the formatted value, e.g. "45%"),
// - custom 4px track / 16px thumb (editor.css .mn-range; the filled part
//   comes from --mn-pct, set inline — sliders are never animated),
// - the value is a click-to-edit field in the DISPLAYED unit (typing 50 on
//   an opacity shown as "%"  means 0.5 — see uiNumeric.ts): Enter or blur
//   commits (clamped/snapped to min/max/step), Esc cancels,
// - double-click resets to `defaultValue` when one is given,
// - optional field state (modified dot -> reset / inherited chip).
export function SliderRow({
  label, value, min, max, step = 1, unit = "", fmt, onChange, defaultValue, disabled,
  state, onReset, inheritedLabel, displayScale, displayOffset = 0,
}: SliderRowProps) {
  const id = useId();
  const chipId = useId();
  const display = fmt ? fmt(value) : `${Math.round(value)}${unit}`;
  const [draft, setDraft] = useState<string | null>(null);
  // Review round (UX-6): the text the field opened with — committing it
  // unchanged (blur/Enter without typing) must not snap/emit anything.
  const initialDraft = useRef<string | null>(null);
  const valueBtnRef = useRef<HTMLButtonElement>(null);
  const refocusValue = useRef(false);
  const scale = displayScale ?? inferDisplayScale(fmt, min, max);
  const offset = displayScale !== undefined ? displayOffset : 0;
  const pct = max === min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  function startEdit() {
    if (disabled) return;
    const text = formatEditValue(value + offset, step, scale);
    initialDraft.current = text;
    setDraft(text);
  }
  function commit() {
    if (draft === null) return;
    // Iteration 0: shared, tested commit (uiNumeric.commitSliderDraft).
    const next = commitSliderDraft(draft, initialDraft.current, { min, max, step, scale, offset }, value);
    setDraft(null);
    if (next !== null) onChange(next);
  }
  // Iteration 0: double-click = the same reset as the modified dot (delete
  // the raw key) when there is one; else the plain defaultValue.
  const dbl = resolveSliderDoubleClick({ state, hasReset: !!onReset, defaultValue });
  const onTrackDoubleClick = dbl === "reset" ? () => onReset?.() : dbl === "default" ? () => onChange(defaultValue as number) : undefined;
  // A11Y-2: Enter/Esc unmount the input — give focus back to the value
  // button that replaces it (after the re-render).
  function endEditByKey() {
    refocusValue.current = true;
    requestAnimationFrame(() => {
      if (refocusValue.current) valueBtnRef.current?.focus({ preventScroll: true });
      refocusValue.current = false;
    });
  }

  return (
    <div
      className="mn-field"
      data-state={state}
      data-inherited={state === "inherited" ? "" : undefined}
      style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}
    >
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: T.space[2], minHeight: 20 }}>
        {state === "modified" && onReset && <FieldResetMark label={label} onReset={onReset} />}
        <label htmlFor={id} style={{ ...labelStyle, minWidth: 0 }}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: T.space[2], flexShrink: 0 }}>
          {state === "inherited" && <InheritedChip id={chipId}>{inheritedLabel}</InheritedChip>}
          {draft !== null ? (
            <input
              className="mn-value-input"
              autoFocus
              inputMode="decimal"
              aria-label={`${label}, valor`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onFocus={e => e.currentTarget.select()}
              onBlur={commit}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); commit(); endEditByKey(); }
                else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDraft(null); endEditByKey(); }
              }}
            />
          ) : (
            <button
              ref={valueBtnRef}
              type="button"
              className="mn-value"
              aria-label={`${label}: ${display}. Editar valor`}
              title="Editar valor"
              disabled={disabled}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); startEdit(); }}
              // VIS-11: Mono only for numbers — a word value ("círculo") reads in Sans.
              style={{ minWidth: 34, textAlign: "right", ...(/\d/.test(display) ? {} : { fontFamily: T.uiFont.sans, fontSize: 12 }) }}
            >
              {display}
            </button>
          )}
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="mn-range"
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display}
        aria-describedby={state === "inherited" ? chipId : undefined}
        onChange={e => onChange(Number(e.target.value))}
        onMouseDown={e => e.stopPropagation()}
        onDoubleClick={onTrackDoubleClick}
        style={{ ["--mn-pct" as string]: `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
