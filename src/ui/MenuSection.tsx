"use client";
import React, { createContext, useContext, useId, useState } from "react";
import { T, uv } from "./tokens";
import { Icon, type IconName } from "./icons";
import { Toggle } from "./Toggle";
import { refocusFieldControl } from "./MenuRow";

interface MenuSectionProps {
  label:    string;
  children: React.ReactNode;
  first?:   boolean;
  /** v3 section numbers — kept for the call sites; the DS cards are not
   * numbered. */
  num?:     string;
  tone?:    1 | 2 | 3 | 4;
  /** Count of modified values -> the accent "modified" dot (and, with
   * `onReset`, "Restablecer card"). */
  changed?: number;
  /** Count of effects that are ON -> the card's glyph lights up. */
  active?:  number;
  /** Liquid glass: the card's glyph (32px well left of the title). */
  icon?:    IconName;
  /** Liquid glass: the live summary under the title ("Syne · 28 px · 800"). */
  summary?: string;
  /** Liquid glass: a color dot before the summary (the card's color). */
  swatch?:  string;
  /** Liquid glass: "Restablecer card" — clears every raw value of the card. */
  onReset?: () => void;
  /** Liquid glass: a switch in the header (e.g. Estilo del bloque); OFF
   * shows `offNote` instead of the controls. */
  toggle?:  { value: boolean; onChange: (v: boolean) => void; label?: string };
  offNote?: string;
  /** Liquid glass: a pinned card (content) — no header, always open, a
   * plain label over its controls. */
  pinned?:  boolean;
  /** Open when it first mounts outside an accordion. */
  defaultOpen?: boolean;
}

/** Iteration 0: id of the enclosing section's visible heading — the
 * fallback accessible name (aria-labelledby) for a text field that sits
 * directly in a section without its own row label. */
const SectionHeadingContext = createContext<string | undefined>(undefined);
export function useSectionHeadingId(): string | undefined {
  return useContext(SectionHeadingContext);
}

/** Editor v3 Phase F section numbers — kept as a no-op provider so call
 * sites compile; Liquid glass cards are not numbered. */
export interface SectionNumberValue { num: string; tone: 1 | 2 | 3 | 4 }
export function SectionNumber({ children }: { value: SectionNumberValue | null; children: React.ReactNode }) {
  return <>{children}</>;
}

/** Liquid glass (L2): one card open at a time per object (DS accordion). */
interface AccordionValue { open: string | null; setOpen: (k: string | null) => void }
const AccordionContext = createContext<AccordionValue | null>(null);
export function Accordion({ open, onOpenChange, children }: { open: string | null; onOpenChange: (k: string | null) => void; children: React.ReactNode }) {
  return <AccordionContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</AccordionContext.Provider>;
}
/** Nested sections inside a card render as a labelled group, not a card. */
const InCardContext = createContext(false);

// Liquid glass (DS dock cards, L2): every section of an object is a CARD in
// an accordion — closed it is a 56px well (glyph, title, live summary, the
// modified dot, "Restablecer card", an optional switch, the chevron); open
// it drops the fill for a hairline and shows its controls. A pinned card
// (content) has no header. APG accordion: heading > <button aria-expanded>;
// the switch and the reset button sit NEXT to the button, never inside it.
export function MenuSection({ label, children, changed, active, icon, summary, swatch, onReset, toggle, offNote, pinned, defaultOpen = true }: MenuSectionProps) {
  const headingId = useId();
  const bodyId = useId();
  const inCard = useContext(InCardContext);
  const acc = useContext(AccordionContext);
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const key = label;
  const open = pinned || inCard ? true : acc ? acc.open === key : localOpen;
  const setOpen = (o: boolean) => (acc ? acc.setOpen(o ? key : null) : setLocalOpen(o));
  const modified = !!changed && changed > 0;
  const lit = modified || (!!active && active > 0);
  const on = toggle ? toggle.value : true;

  // A nested section (inside a card / tile): a plain labelled group.
  if (inCard || pinned) {
    return (
      <div role="group" aria-labelledby={headingId} className={pinned ? "mn-card mn-card--pinned" : "mn-subsection"}>
        <div id={headingId} role="heading" aria-level={pinned ? 3 : 4} className="mn-label">{label}</div>
        <SectionHeadingContext.Provider value={headingId}>
          <InCardContext.Provider value={true}>
            <div className="mn-card__rows">{children}</div>
          </InCardContext.Provider>
        </SectionHeadingContext.Provider>
      </div>
    );
  }

  return (
    <section className="mn-card" data-open={open || undefined} aria-labelledby={headingId}>
      <div className="mn-card__head" onClick={() => setOpen(!open)}>
        <div role="heading" aria-level={3} style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <button type="button" className="mn-card__btn" aria-expanded={open} aria-controls={open ? bodyId : undefined}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setOpen(!open); }}>
            <span className="mn-card__icon" data-lit={lit || undefined} aria-hidden><Icon name={icon ?? "sliders"} size={16} /></span>
            <span className="mn-card__text">
              <span className="mn-card__title">
                <span id={headingId}>{label}</span>
                {modified && <span className="mn-card__dot" title="Tiene cambios" aria-hidden />}
                {modified && <span className="mn-sr-only">, con cambios</span>}
              </span>
              {(summary || (toggle && !on)) && (
                <span className="mn-card__summary">
                  {swatch && on && <span className="mn-card__swatch" aria-hidden style={{ background: swatch }} />}
                  <span key={toggle && !on ? "off" : summary} className="mn-card__summary-text">{toggle && !on ? (offNote ?? "Hereda de la tarjeta") : summary}</span>
                </span>
              )}
            </span>
          </button>
        </div>
        {modified && onReset && (
          <button type="button" className="mn-iconbtn mn-reset" aria-label={`Restablecer ${label}`} title="Restablecer card"
            style={{ width: 32, height: 32 }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); const el = e.currentTarget; onReset(); refocusFieldControl(el); }}>
            <Icon name="reset" size={14} />
          </button>
        )}
        {toggle && (
          <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex" }}>
            <Toggle value={toggle.value} label={toggle.label ?? label} onChange={v => { toggle.onChange(v); if (v) setOpen(true); }} />
          </span>
        )}
        <span className="mn-card__chev" aria-hidden><Icon name="chevron-down" size={14} /></span>
      </div>
      {open && (
        <div id={bodyId} className="mn-card__body" role="group" aria-labelledby={headingId}>
          {toggle && !on ? <div className="mn-card__note">{offNote ?? "Hereda el estilo de la tarjeta"}</div> : (
            <SectionHeadingContext.Provider value={headingId}>
              <InCardContext.Provider value={true}>
                <div className="mn-card__rows" style={{ gap: T.space[2] + 2 }}>{children}</div>
              </InCardContext.Provider>
            </SectionHeadingContext.Provider>
          )}
        </div>
      )}
    </section>
  );
}

/** DS .lg-label — a small group label (13/600, ink2). */
export function GroupLabel({ children }: { children: React.ReactNode }) {
  return <span className="mn-label" style={{ color: uv("text-secondary") }}>{children}</span>;
}
