"use client";
import React, { createContext, useContext, useId, useState } from "react";
import { uv } from "./tokens";
import { Icon } from "./icons";
import { Toggle } from "./Toggle";
import { SectionNumber } from "./MenuSection";

type Tone = 1 | 2 | 3 | 4;

/** One row open at a time (design screen 08: "se despliega una a la vez"). */
const ListContext = createContext<{ open: string | null; setOpen: (k: string | null) => void } | null>(null);

export function EffectList({ children, label }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ListContext.Provider value={{ open, setOpen }}>
      <div className="mn-fxlist" role="group" aria-label={label}>{children}</div>
    </ListContext.Provider>
  );
}

interface EffectRowProps {
  /** Unique within its EffectList. */
  id:        string;
  label:     string;
  /** Section tone of the decorative swatch (lit while the effect is on). */
  tone:      Tone;
  /** Short state in mono ("On", "Pausado", "1,5 px", "Exterior"). */
  state?:    string;
  /** The effect's switch. Absent = the row has none (e.g. Borde: there is no
   * real pause for it — CLAUDE.md), the panel holds the controls. */
  on?:       boolean;
  onToggle?: (on: boolean) => void;
  /** Lights the swatch when there is no switch (something is active). */
  active?:   boolean;
  children:  React.ReactNode;
}

// Editor v3 Phase F: an effect row (design screen 08) — swatch, name, state
// and switch; the row's name is a disclosure that unfolds its parameters
// inline, one row at a time. APG: the disclosure is a real <button
// aria-expanded>, and the switch sits NEXT to it, never inside it (so each
// control has one role and one name). The parameters mount only while open
// (nothing hidden stays focusable).
export function EffectRow({ id, label, tone, state, on, onToggle, active, children }: EffectRowProps) {
  const list = useContext(ListContext);
  const [localOpen, setLocalOpen] = useState(false);
  const open = list ? list.open === id : localOpen;
  const setOpen = (o: boolean) => (list ? list.setOpen(o ? id : null) : setLocalOpen(o));
  const panelId = useId();
  const lit = on ?? !!active;
  return (
    <div className="mn-fxrow" data-open={open || undefined}>
      <div className="mn-fxrow__head">
        <button type="button" className="mn-fxrow__btn" aria-expanded={open} aria-controls={open ? panelId : undefined}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setOpen(!open); }}>
          <span className="mn-fxrow__swatch" aria-hidden="true"
            style={{ background: lit ? uv(`tone-n${tone}`) : uv("surface-control-active") }} />
          <span className="mn-fxrow__name">{label}</span>
          {state && <span className="mn-fxrow__state">{state}</span>}
          <span className="mn-fxrow__chev" aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
        </button>
        {onToggle && <Toggle value={!!on} onChange={onToggle} label={label} />}
      </div>
      {open && (
        <div id={panelId} className="mn-fxrow__panel" role="group" aria-label={label}>
          <SectionNumber value={null}>{children}</SectionNumber>
        </div>
      )}
    </div>
  );
}
