"use client";
import React, { createContext, useContext, useId } from "react";
import { T } from "./tokens";
import { Icon } from "./icons";

/** Block 2: per-field value provenance.
 * - "modified": the stored (raw) value exists — a 5px dot left of the
 *   label, which turns into a reset button on hover/focus (onReset).
 * - "inherited": the value shown is derived (from the card / a default) —
 *   the value reads in tertiary and a small "Card" chip says where it
 *   comes from. */
export type FieldState = "modified" | "inherited";

/** The id of the label of the row a control sits in — lets Toggle/
 * ColorSwatch/FontSelect get an accessible name (aria-labelledby) without
 * every one of their ~100 call sites passing one explicitly. */
const FieldLabelContext = createContext<string | undefined>(undefined);
export function useFieldLabelId(): string | undefined {
  return useContext(FieldLabelContext);
}
export const FieldLabelProvider = FieldLabelContext.Provider;

/** Review round (A11Y-13): id of the row's inherited chip, so the control
 * can point aria-describedby at it ("Card" = value comes from the card). */
const FieldDescContext = createContext<string | undefined>(undefined);
export function useFieldDescId(): string | undefined {
  return useContext(FieldDescContext);
}

/** Review round (A11Y-2): after an action removes the focused button
 * (reset dot, clear x, trash), move focus to the field's main control
 * instead of letting it drop to <body>. Runs after React re-renders. */
export function refocusFieldControl(from: HTMLElement | null) {
  const field = from?.closest(".mn-field");
  requestAnimationFrame(() => {
    const target = field?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, [role="switch"], .mn-well, [role="slider"], button:not(.mn-field__mark)',
    );
    target?.focus({ preventScroll: true });
  });
}

export interface FieldStateProps {
  state?:          FieldState;
  /** Clears the raw value (modified state only). */
  onReset?:        () => void;
  /** Chip text for the inherited state. */
  inheritedLabel?: string;
}

/** The modified-dot/reset button. Absolute in the panel's left padding
 * gutter so modified rows never shift their label. */
export function FieldResetMark({ label, onReset }: { label: string; onReset: () => void }) {
  return (
    <button
      type="button"
      className="mn-field__mark"
      aria-label={`Restablecer ${label}`}
      title="Restablecer"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); const el = e.currentTarget; onReset(); refocusFieldControl(el); }}
    >
      <Icon name="reset" size={12} />
    </button>
  );
}

export function InheritedChip({ children = "Card", id }: { children?: React.ReactNode; id?: string }) {
  return (
    <span className="mn-chip" title="Valor heredado" id={id}>
      {children}
      {/* Spoken via the control's aria-describedby. */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}> (heredado)</span>
    </span>
  );
}

/** Shared label typography (DM Sans 13/18). */
export const labelStyle: React.CSSProperties = {
  ...T.type.label,
  color:      T.ui.text.secondary,
  userSelect: "none",
};

interface MenuRowProps extends FieldStateProps {
  label?:   string;
  children: React.ReactNode;
}

export function MenuRow({ label, children, state, onReset, inheritedLabel }: MenuRowProps) {
  const labelId = useId();
  const chipId = useId();
  return (
    <div
      className="mn-field"
      data-state={state}
      data-inherited={state === "inherited" ? "" : undefined}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        minHeight:      T.ui.size.row,
        gap:            T.space[2],
      }}
    >
      {label && state === "modified" && onReset && <FieldResetMark label={label} onReset={onReset} />}
      {label && (
        <span id={labelId} style={{ ...labelStyle, flexShrink: 1, minWidth: 0 }}>
          {label}
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: T.space[2], marginLeft: label ? "auto" : 0, flexShrink: 0 }}>
        {state === "inherited" && <InheritedChip id={chipId}>{inheritedLabel}</InheritedChip>}
        <FieldLabelProvider value={label ? labelId : undefined}>
          <FieldDescContext.Provider value={state === "inherited" ? chipId : undefined}>
            {children}
          </FieldDescContext.Provider>
        </FieldLabelProvider>
      </div>
    </div>
  );
}
