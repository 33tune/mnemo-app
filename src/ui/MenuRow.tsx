"use client";
import React, { createContext, useContext, useId } from "react";
import { T } from "./tokens";
import { Icon } from "./icons";
import { pickRefocusTarget } from "@/lib/focusRecovery";

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
 * instead of letting it drop to <body>. Runs after React re-renders.
 *
 * Iteration 0: extended with the full fallback chain for removals that
 * take the whole field/row away ("quitar" photo/logo/background/MP3, a
 * deleted link, a deleted module): next list item ([data-mn-item]) →
 * previous item → enclosing group → panel root → canvas. Never <body>.
 * The decision is pure (focusRecovery.ts, tested). */
const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), select, textarea, [role="switch"], .mn-well, [role="slider"], button:not(.mn-field__mark):not([disabled]), [tabindex="0"]';
export function refocusFieldControl(from: HTMLElement | null) {
  const field = from?.closest<HTMLElement>(".mn-field") ?? null;
  const item = from?.closest<HTMLElement>("[data-mn-item]") ?? null;
  const next = item?.nextElementSibling as HTMLElement | null;
  const prev = item?.previousElementSibling as HTMLElement | null;
  const group = (item ?? from)?.parentElement?.closest<HTMLElement>('[role="group"]') ?? null;
  const panel = from?.closest<HTMLElement>("[data-mnemo-editor], [data-mnemo-ui]") ?? null;
  requestAnimationFrame(() => {
    const first = (el: HTMLElement | null) => el?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
    const target = pickRefocusTarget([
      field && { connected: field.isConnected, target: first(field) },
      next && { connected: next.isConnected, target: first(next) },
      prev && { connected: prev.isConnected, target: first(prev) },
      group && { connected: group.isConnected, target: first(group) },
      panel && { connected: panel.isConnected, target: panel.tabIndex >= -1 && panel.hasAttribute("tabindex") ? panel : first(panel) },
      { connected: true, target: document.querySelector<HTMLElement>("[data-mnemo-canvas]") },
    ]);
    target?.focus({ preventScroll: true });
  });
}

export interface FieldStateProps {
  state?:          FieldState;
  /** Clears the raw value (modified state only). */
  onReset?:        () => void;
  /** Chip text for the inherited state. */
  inheritedLabel?: string;
  /** Phase 2 r2: id of a visible note that describes this control (added
   * to its aria-describedby, after the inherited chip). */
  hintId?: string;
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

export function MenuRow({ label, children, state, onReset, inheritedLabel, hintId }: MenuRowProps) {
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
          <FieldDescContext.Provider value={[state === "inherited" ? chipId : undefined, hintId].filter(Boolean).join(" ") || undefined}>
            {children}
          </FieldDescContext.Provider>
        </FieldLabelProvider>
      </div>
    </div>
  );
}
