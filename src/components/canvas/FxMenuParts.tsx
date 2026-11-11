"use client";
/**
 * Shared pieces of Tarjeta › Efectos (2026-11-11): the palette picker every
 * colored effect uses, and the grid of holo finishes with a live thumbnail
 * of each (the same layers the card draws — cardFoil › holoLayers).
 * Presentation only: the writes live in ProfileEffectsMenu.tsx.
 */
import React, { useId } from "react";
import type { CardEffects, FxPaletteId } from "@/types";
import { GradientStops, GroupLabel, useCardPalette } from "@/ui";
import { FX_PALETTES, FX_PALETTE_OPTIONS, FX_CUSTOM_DEFAULT, cleanColors, loopColors } from "@/lib/fxPalette";
import { HOLO_STYLES, type HoloStyle } from "@/lib/cardFoil";
import { HoloSheet } from "./CardFx";

export type PaletteValue = { palette?: FxPaletteId; colors?: string[] };

const swatch = (colors: readonly string[]) => {
  const c = loopColors(colors.length ? colors : FX_CUSTOM_DEFAULT);
  return `linear-gradient(135deg, ${c.slice(0, -1).map((x, i, a) => `${x} ${Math.round((i / Math.max(1, a.length - 1)) * 100)}%`).join(", ")})`;
};

/**
 * "Colores": the effect's own look (`auto`), a ready palette, the card's own
 * colors or 2–4 chosen ones. Picking the automatic one removes both keys.
 */
export function PaletteField({ value, onChange, auto, autoLabel = "Automático", label = "Colores" }: {
  value: PaletteValue | undefined; onChange: (v: PaletteValue) => void; auto: readonly string[]; autoLabel?: string; label?: string;
}) {
  const id = useId();
  const cardColors = useCardPalette();
  const current = value?.palette;
  const custom = cleanColors(value?.colors);
  const customColors = custom.length >= 2 ? custom : [...FX_CUSTOM_DEFAULT];
  const options: { id: FxPaletteId | "auto"; label: string; colors: readonly string[] }[] = [
    { id: "auto", label: autoLabel, colors: auto },
    ...FX_PALETTE_OPTIONS.map(o => ({
      id: o.id, label: o.label,
      colors: o.id === "card" ? cardColors : o.id === "custom" ? customColors : FX_PALETTES[o.id],
    })),
  ];
  const pick = (pid: FxPaletteId | "auto") => {
    if (pid === "auto") onChange({ palette: undefined, colors: undefined });
    else if (pid === "custom") onChange({ palette: "custom", colors: customColors });
    else onChange({ palette: pid, colors: value?.colors });
  };
  const active = current ?? "auto";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <GroupLabel>{label}</GroupLabel>
      <div className="mn-swatches" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={active === o.id} aria-label={o.label} title={o.label}
            className="mn-swatch" data-on={active === o.id || undefined} data-auto={o.id === "auto" || undefined}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); pick(o.id); }}>
            <span className="mn-swatch__fill" style={{ backgroundImage: swatch(o.colors) }} />
            <span className="mn-swatch__name">{o.label}</span>
          </button>
        ))}
      </div>
      {current === "custom" ? (
        <div id={id}>
          <GradientStops colors={customColors} min={2} max={4} onChange={c => onChange({ palette: "custom", colors: c })} />
        </div>
      ) : null}
    </div>
  );
}

/** The holo finishes as a grid of live thumbnails. */
export function FinishGrid({ value, onChange, fx }: { value: HoloStyle; onChange: (s: HoloStyle) => void; fx: CardEffects }) {
  const cardColors = useCardPalette();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <GroupLabel>Acabado</GroupLabel>
      <div className="mn-finishes" role="radiogroup" aria-label="Acabado">
        {HOLO_STYLES.map(s => (
          <button key={s.id} type="button" role="radio" aria-checked={value === s.id} className="mn-finish" data-on={value === s.id || undefined}
            onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onChange(s.id); }}>
            <span className="mn-finish__pv" aria-hidden>
              <HoloSheet fx={{ holo: { ...fx.holo, enabled: true, style: s.id, intensity: 1, scope: "card", scale: 0.6 } }}
                box={{ w: 92, h: 52 }} radius={9} cardColors={cardColors} />
            </span>
            <span className="mn-finish__name">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
