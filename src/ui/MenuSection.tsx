"use client";
import React, { createContext, useContext, useId } from "react";
import { T, uv } from "./tokens";

interface MenuSectionProps {
  label:    string;
  children: React.ReactNode;
  first?:   boolean;
  /** v3 (M3Section): section number shown before the title ("01"). */
  num?:     string;
  /** v3: tone of the number, 1–4 -> the theme's n1..n4. */
  tone?:    1 | 2 | 3 | 4;
  /** v3: count of modified values -> orange dot + "N cambios". */
  changed?: number;
  /** Editor v3 Phase F: count of effects that are ON -> "N activos" (a state,
   * not a change: no orange dot — effect sections use this). */
  active?:  number;
}

/** Iteration 0: id of the enclosing section's visible heading — the
 * fallback accessible name (aria-labelledby) for a text field that sits
 * directly in a section without its own row label (Descriptor, Ubicación,
 * Bio), instead of the placeholder. */
const SectionHeadingContext = createContext<string | undefined>(undefined);
export function useSectionHeadingId(): string | undefined {
  return useContext(SectionHeadingContext);
}

/** Editor v3 Phase F: the number + tone an object's section gets from its
 * place in the inspector (ProfileConfigMenu numbers the sections it
 * mounts). Only the OUTERMOST MenuSection consumes it: every MenuSection
 * (and Collapsible) resets it for its children, so nested groups are never
 * numbered. An explicit `num` prop always wins. */
export interface SectionNumberValue { num: string; tone: 1 | 2 | 3 | 4 }
const SectionNumberContext = createContext<SectionNumberValue | null>(null);
export function SectionNumber({ value, children }: { value: SectionNumberValue | null; children: React.ReactNode }) {
  return <SectionNumberContext.Provider value={value}>{children}</SectionNumberContext.Provider>;
}

// Block 2: the header is a real heading and names the group it introduces.
// v3 (M3Section): eyebrow in mono 11, uppercase, tracking .12em (secondary
// ink, >= 4.5:1 in every theme). Optional `num` (in its `tone` color),
// `changed` ("N cambios" with the orange "modified" dot). Without the new
// props it renders the same structure as before, with the new typography.
export function MenuSection({ label, children, first, num: numProp, tone: toneProp, changed, active }: MenuSectionProps) {
  const headingId = useId();
  const inherited = useContext(SectionNumberContext);
  const num = numProp ?? inherited?.num;
  const tone = numProp ? toneProp : (inherited?.tone ?? toneProp);
  const heading = (
    <div id={headingId} role="heading" aria-level={3} style={{
      ...T.type.section,
      color:         uv("text-section"),
      userSelect:    "none",
      marginBottom:  num || changed ? 0 : 2,
      minWidth:      0,
    }}>
      {num && <span aria-hidden="true" style={{ color: uv(`tone-n${tone ?? 1}`), marginRight: 8 }}>{num}</span>}
      {label}
    </div>
  );
  return (
    <div role="group" aria-labelledby={headingId}
      style={{ marginTop: first ? 0 : T.space[5], display: "flex", flexDirection: "column", gap: T.space[2] }}>
      {num || changed || active ? (
        <div style={{ display: "flex", alignItems: "center", gap: T.space[2], marginBottom: 2 }}>
          {heading}
          {!!changed && changed > 0 && (
            <span className="mn-section__changed" style={{ ...T.type.help, fontSize: 11, lineHeight: "14px", color: uv("text-secondary"), marginLeft: "auto", whiteSpace: "nowrap" }}>
              <span className="mn-section__dot" aria-hidden="true" />
              {changed === 1 ? "1 cambio" : `${changed} cambios`}
            </span>
          )}
          {!changed && !!active && active > 0 && (
            <span style={{ ...T.type.help, fontSize: 11, lineHeight: "14px", color: uv("text-secondary"), marginLeft: "auto", whiteSpace: "nowrap" }}>
              {active === 1 ? "1 activo" : `${active} activos`}
            </span>
          )}
        </div>
      ) : heading}
      <SectionHeadingContext.Provider value={headingId}>
        <SectionNumberContext.Provider value={null}>
          {children}
        </SectionNumberContext.Provider>
      </SectionHeadingContext.Provider>
    </div>
  );
}
