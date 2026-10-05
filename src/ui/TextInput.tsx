"use client";
import React from "react";
import { T } from "./tokens";
import { useFieldLabelId } from "./MenuRow";
import { useSectionHeadingId } from "./MenuSection";

interface TextInputProps {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  onKeyDown?:   (e: React.KeyboardEvent<HTMLInputElement>) => void;
  mono?:        boolean;
  type?:        string;
  maxLength?:   number;
  style?:       React.CSSProperties;
  /** Block 2: accessible name. Inside a labelled MenuRow the row label is
   * used (aria-labelledby); otherwise falls back to the placeholder. */
  label?:       string;
  id?:          string;
  /** Iteration 0: id of a VISIBLE label element (preferred over `label`,
   * which is invisible). */
  labelledBy?:  string;
  describedBy?: string;
}

// Block 2: background/hairline/hover/focus ring come from editor.css
// (.mn-input) — the old `outline: none` + border-color-on-focus is replaced
// by the shared :focus-visible ring (always shown on text fields). Same
// props as before; `style` still overrides layout per call site.
export function TextInput({ value, onChange, placeholder, onKeyDown, mono, type = "text", maxLength, style, label, id, labelledBy: labelledByProp, describedBy }: TextInputProps) {
  const rowLabel = useFieldLabelId();
  const sectionHeading = useSectionHeadingId();
  // Name: visible label id > explicit label > row label > section heading >
  // placeholder (last resort only — Iteration 0).
  const labelledBy = labelledByProp ?? (label ? undefined : rowLabel ?? sectionHeading);
  return (
    <input
      id={id}
      type={type}
      className="mn-input"
      value={value}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={labelledByProp ? undefined : label ?? (labelledBy ? undefined : placeholder)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      style={{
        display:       "block",
        width:         "100%",
        height:        T.comp.inputH,
        padding:       "0 10px",
        fontFamily:    mono ? T.font.mono : T.font.sans,
        fontSize:      mono ? T.size.xs : T.size.base,
        letterSpacing: mono ? "0.02em" : 0,
        boxSizing:     "border-box",
        ...style,
      }}
    />
  );
}

interface TextAreaProps {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  maxLength?:   number;
  rows?:        number;
  /** id of a visible label; defaults to the enclosing MenuSection heading. */
  labelledBy?:  string;
  style?:       React.CSSProperties;
}

/**
 * Iteration 0: multi-line sibling of TextInput — same .mn-input surface and
 * focus ring (the old Bio textarea had `outline:none` and no name). Named
 * by a VISIBLE label (the section heading by default); with `maxLength`, a
 * visible "12/120" counter is announced via aria-describedby (maxLength
 * used to cut input silently).
 */
export function TextArea({ value, onChange, placeholder, maxLength, rows = 2, labelledBy, style }: TextAreaProps) {
  const sectionHeading = useSectionHeadingId();
  const counterId = React.useId();
  const name = labelledBy ?? sectionHeading;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <textarea
        className="mn-input"
        value={value}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        aria-labelledby={name}
        aria-label={name ? undefined : placeholder}
        aria-describedby={maxLength ? counterId : undefined}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        style={{
          display: "block", width: "100%", padding: "6px 10px", boxSizing: "border-box",
          fontFamily: T.font.sans, fontSize: T.size.base, lineHeight: 1.5, resize: "none",
          ...style,
        }}
      />
      {maxLength != null && (
        <span id={counterId} style={{ ...T.type.value, color: T.ui.text.secondary, alignSelf: "flex-end" }}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
