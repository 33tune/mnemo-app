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
  /** Liquid glass: 19px for the big content field (Nombre). */
  big?:         boolean;
  /** Liquid glass: the field writes in the role's own font (DS). */
  fontFamily?:  string;
}

// Block 2: background/hairline/hover/focus ring come from editor.css
// (.mn-input) — the old `outline: none` + border-color-on-focus is replaced
// by the shared :focus-visible ring (always shown on text fields). Same
// props as before; `style` still overrides layout per call site.
export function TextInput({ value, onChange, placeholder, onKeyDown, mono, type = "text", maxLength, style, label, id, labelledBy: labelledByProp, describedBy, big, fontFamily }: TextInputProps) {
  const rowLabel = useFieldLabelId();
  const sectionHeading = useSectionHeadingId();
  // Name: visible label id > explicit label > row label > section heading >
  // placeholder (last resort only — Iteration 0).
  const labelledBy = labelledByProp ?? (label ? undefined : rowLabel ?? sectionHeading);
  const counterId = React.useId();
  // Liquid glass (DS text row): a counter INSIDE the field, bottom-right.
  const counter = maxLength != null && !mono;
  const input = (
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
      aria-describedby={[describedBy, counter ? counterId : undefined].filter(Boolean).join(" ") || undefined}
      style={{
        display:       "block",
        width:         "100%",
        // Liquid glass (DS .lg-input): 44px, padding 14, Geist 15 (19 for a
        // "big" field like Nombre; the user's own font when given).
        height:        T.ui.size.control,
        padding:       counter ? "0 52px 0 14px" : "0 14px",
        fontFamily:    mono ? T.uiFont.mono : fontFamily ?? T.uiFont.sans,
        fontSize:      mono ? 13 : big ? 19 : 15,
        fontWeight:    450,
        letterSpacing: mono ? "0.02em" : -0.075,
        boxSizing:     "border-box",
        ...style,
      }}
    />
  );
  if (!counter) return input;
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {input}
      <span id={counterId} className="mn-counter">{value.length}/{maxLength}</span>
    </div>
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
  /** Liquid glass: the field writes in the role's own font (DS). */
  fontFamily?:  string;
}

/**
 * Iteration 0: multi-line sibling of TextInput — same .mn-input surface and
 * focus ring (the old Bio textarea had `outline:none` and no name). Named
 * by a VISIBLE label (the section heading by default); with `maxLength`, a
 * visible "12/120" counter is announced via aria-describedby (maxLength
 * used to cut input silently).
 */
export function TextArea({ value, onChange, placeholder, maxLength, rows = 3, labelledBy, style, fontFamily }: TextAreaProps) {
  const sectionHeading = useSectionHeadingId();
  const counterId = React.useId();
  const name = labelledBy ?? sectionHeading;
  return (
    <div style={{ position: "relative" }}>
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
          display: "block", width: "100%", minHeight: T.ui.size.control, padding: maxLength != null ? "12px 52px 12px 14px" : "12px 14px", boxSizing: "border-box",
          fontFamily: fontFamily ?? T.uiFont.sans, fontSize: 15, lineHeight: 1.35, resize: "none",
          ...style,
        }}
      />
      {maxLength != null && <span id={counterId} className="mn-counter">{value.length}/{maxLength}</span>}
    </div>
  );
}
