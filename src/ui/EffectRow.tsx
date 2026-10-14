"use client";
import React, { createContext, useContext, useId, useState } from "react";
import { Icon, type IconName } from "./icons";
import { SectionNumber } from "./MenuSection";

type Tone = 1 | 2 | 3 | 4;

/** One tile open at a time (DS ControlTiles: "one open per grid"). */
const ListContext = createContext<{ open: string | null; setOpen: (k: string | null) => void } | null>(null);
/** Position of a tile in its grid — the inline detail panel goes under the
 * pair (row) the open tile belongs to. */
const IndexContext = createContext<number>(0);

// Liquid glass (L1): EffectList = the DS tile grid (2 columns, gap 8). Each
// EffectRow is a tile; its parameters unfold FULL WIDTH under the tile's row
// (`order` keeps tile pairs and their detail panel together without
// changing the DOM order the screen reader follows: tile, then its panel).
export function EffectList({ children, label }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const items = React.Children.toArray(children).filter(React.isValidElement);
  return (
    <ListContext.Provider value={{ open, setOpen }}>
      <div className="mn-tiles" role="group" aria-label={label}>
        {items.map((child, i) => <IndexContext.Provider key={child.key ?? i} value={i}>{child}</IndexContext.Provider>)}
      </div>
    </ListContext.Provider>
  );
}

/** The tile's preview glyph (DS `pv`): a live sample of the effect drawn in
 * currentColor / the accent — never the user's colors. */
export type TilePreview =
  | "t-shadow" | "t-glow" | "t-stroke" | "t-blur" | "t-shim" | "t-let" | "t-grad"
  | "c-border" | "c-shadow" | "c-glow" | "c-pulse" | "c-grad" | "c-glass" | "c-blur" | "c-float" | "c-tilt"
  | "c-spot" | "c-scan" | "c-noise" | "c-flick" | "c-chroma";

interface EffectRowProps {
  /** Unique within its EffectList. */
  id:        string;
  label:     string;
  /** v3 section tone — kept for the call sites; the DS lights tiles with the
   * ONE accent. */
  tone?:     Tone;
  /** State line under the name when ON ("1,5 px", "Exterior"). */
  state?:    string;
  /** State line when OFF (default "Apagado"; e.g. "Sombra base sutil"). */
  offState?: string;
  /** OFF but with stored values ("Pausado · se guardan"). */
  paused?:   boolean;
  /** The effect's switch. Absent = the tile has none (e.g. Borde: there is
   * no real pause for it — CLAUDE.md): tapping it opens its parameters. */
  on?:       boolean;
  onToggle?: (on: boolean) => void;
  /** Lights the tile when there is no switch (something is active). */
  active?:   boolean;
  icon?:     IconName;
  preview?:  TilePreview;
  children?: React.ReactNode;
}

// DS ControlTiles: tap = on/off (light sweeps from the touch point, the icon
// pops); the chevron = "Ajustes de X" (aria-expanded) opens the parameters
// inline. Turning a tile ON opens its parameters. APG: the tile is a real
// role="switch" (Space/Enter), the chevron a separate button next to it
// inside the tile — one role, one name each.
export function EffectRow({ id, label, state, offState, paused, on, onToggle, active, icon, preview, children }: EffectRowProps) {
  const list = useContext(ListContext);
  const index = useContext(IndexContext);
  const [localOpen, setLocalOpen] = useState(false);
  const open = list ? list.open === id : localOpen;
  const setOpen = (o: boolean) => (list ? list.setOpen(o ? id : null) : setLocalOpen(o));
  const panelId = useId();
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null);
  const toggleable = !!onToggle;
  const lit = on ?? !!active;
  const hasDetail = React.Children.toArray(children).some(Boolean);
  const stateText = lit ? (state ?? "Activado") : paused ? "Pausado" : (offState ?? state ?? "Apagado");
  const row = Math.floor(index / 2);

  function tap(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = "clientX" in e && e.clientX ? e.clientX - r.left : r.width / 2;
    const my = "clientY" in e && e.clientY ? e.clientY - r.top : r.height / 2;
    setRipple({ x: mx, y: my, k: Date.now() });
    if (!toggleable) { if (hasDetail) setOpen(!open); return; }
    const next = !on;
    onToggle?.(next);
    if (next && hasDetail) setOpen(true);
    if (!next && open) setOpen(false);
  }

  return (
    <>
      <div
        className="mn-tile"
        role={toggleable ? "switch" : "button"}
        aria-checked={toggleable ? !!on : undefined}
        aria-expanded={!toggleable && hasDetail ? open : undefined}
        aria-controls={!toggleable && open ? panelId : undefined}
        aria-label={`${label}: ${stateText}`}
        tabIndex={0}
        data-on={lit || undefined}
        data-open={open || undefined}
        style={{ order: row * 3 + (index % 2) }}
        onMouseDown={e => e.stopPropagation()}
        onClick={tap}
        onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap(e); } }}
      >
        {ripple && <span key={ripple.k} className="mn-tile__ripple" aria-hidden style={{ left: ripple.x, top: ripple.y }} />}
        <span key={String(lit)} className="mn-tile__ico" aria-hidden>
          {preview ? <span className="mn-tile__pv" data-pv={preview}>{preview.startsWith("t-") ? "Aa" : null}</span>
            : <Icon name={icon ?? "sparkles"} size={17} />}
        </span>
        <span>
          <span className="mn-tile__name">{label}</span>
          <span className="mn-tile__state" data-paused={!lit && paused ? "" : undefined}>{!lit && paused ? "Pausado · se guardan" : stateText}</span>
        </span>
        {hasDetail && toggleable && (
          <button type="button" className="mn-tile__more" aria-label={`Ajustes de ${label}`} aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setOpen(!open); }}>
            <Icon name="chevron-down" size={14} />
          </button>
        )}
        {hasDetail && !toggleable && <span className="mn-tile__more" aria-hidden><Icon name="chevron-down" size={14} /></span>}
      </div>
      {open && hasDetail && (
        <div id={panelId} className="mn-tile__detail" role="group" aria-label={`Ajustes de ${label}`} style={{ order: row * 3 + 2 }}>
          <div className="mn-tile__detail-head">
            <span>Ajustes de {label}</span>
            {!lit && toggleable && <span className="mn-tile__detail-state">Apagado · se guardan</span>}
          </div>
          <SectionNumber value={null}>{children}</SectionNumber>
        </div>
      )}
    </>
  );
}
