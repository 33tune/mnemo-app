"use client";
import React, { createContext, useContext, useId } from "react";
import { FieldResetButton, FieldDescProvider, InheritedChip, type FieldStateProps } from "./MenuRow";
import { ColorSwatch } from "./ColorSwatch";
import { wellHex, wellAlpha } from "./ColorPopover";
import { parseColor, formatColor } from "@/lib/colorModel";

/** Liquid glass (L1): the colors the card already uses ("Tu tarjeta"),
 * provided by the inspector (cardPalette.ts). Empty = no ribbon. */
const PaletteContext = createContext<readonly string[]>([]);
export const CardPaletteProvider = PaletteContext.Provider;
export function useCardPalette(): readonly string[] { return useContext(PaletteContext); }

interface ColorRowProps extends FieldStateProps {
  label:      string;
  value?:     string;
  onChange:   (color: string) => void;
  clearable?: boolean;
  onClear?:   () => void;
  /** Block 1/2: the color is ALPHA-CAPABLE — the picker shows an alpha bar
   * and emits rgba(); picking a hue keeps the current alpha. */
  keepAlpha?: boolean;
  /** Explicit override of the alpha capability (defaults to keepAlpha). */
  alpha?:     boolean;
}

// Liquid glass (DS color row): the current color as a 36px tile (opens the
// full picker), the label with the "inherited" chip, the hex in mono, the
// reset button when modified; under it "Tu tarjeta" + a radiogroup of the
// card's own colors. Same props as before (every call site unchanged).
export function ColorRow({ label, value, onChange, clearable, onClear, keepAlpha, alpha, state, onReset, inheritedLabel, hintId }: ColorRowProps) {
  const palette = useCardPalette();
  const labelId = useId();
  const chipId = useId();
  const withAlpha = alpha ?? !!keepAlpha;
  const empty = !value;
  const hex = wellHex(value);
  const a = wellAlpha(value);
  const current = empty ? "" : hex.toLowerCase();
  // A ribbon color keeps the row's own alpha (alpha-capable rows only).
  const pick = (c: string) => {
    const rgb = parseColor(c);
    if (!rgb) return;
    onChange(withAlpha && a < 1 ? formatColor({ ...rgb, a }, true) : formatColor({ ...rgb, a: 1 }, false));
  };
  return (
    <div className="mn-field mn-colorrow" data-state={state} data-inherited={state === "inherited" ? "" : undefined}>
      <div className="mn-colorrow__top">
        <FieldDescProvider value={[state === "inherited" ? chipId : undefined, hintId].filter(Boolean).join(" ") || undefined}>
          <ColorSwatch variant="tile" value={value ?? ""} onChange={onChange} alpha={withAlpha} label={label} showHex={false}
            clearable={clearable && !(state === "modified" && onReset)} onClear={onClear} />
        </FieldDescProvider>
        <span className="mn-colorrow__text">
          <span className="mn-colorrow__label">
            <span id={labelId}>{label}</span>
            {state === "inherited" && <InheritedChip id={chipId}>{inheritedLabel}</InheritedChip>}
          </span>
          <span className="mn-colorrow__hex" aria-hidden>
            {empty ? "—" : <>{hex}{a < 1 ? ` · ${Math.round(a * 100)}%` : ""}</>}
          </span>
        </span>
        {state === "modified" && onReset && <FieldResetButton label={label} onReset={onReset} />}
      </div>
      {palette.length > 0 && (
        <div className="mn-colorrow__ribbon">
          <span className="mn-colorrow__ribbon-label" aria-hidden>Tu tarjeta</span>
          <div className="mn-colors" role="radiogroup" aria-label={`${label}: colores de tu tarjeta`}>
            {palette.map(c => (
              <button key={c} type="button" role="radio" className="mn-color" aria-checked={c.toLowerCase() === current}
                aria-label={c} style={{ background: c }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); pick(c); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
