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
}

/** Iteration 0: id of the enclosing section's visible heading — the
 * fallback accessible name (aria-labelledby) for a text field that sits
 * directly in a section without its own row label (Descriptor, Ubicación,
 * Bio), instead of the placeholder. */
const SectionHeadingContext = createContext<string | undefined>(undefined);
export function useSectionHeadingId(): string | undefined {
  return useContext(SectionHeadingContext);
}

// Block 2: the header is a real heading and names the group it introduces.
// v3 (M3Section): eyebrow in mono 11, uppercase, tracking .12em (secondary
// ink, >= 4.5:1 in every theme). Optional `num` (in its `tone` color),
// `changed` ("N cambios" with the orange "modified" dot). Without the new
// props it renders the same structure as before, with the new typography.
export function MenuSection({ label, children, first, num, tone, changed }: MenuSectionProps) {
  const headingId = useId();
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
      {num || changed ? (
        <div style={{ display: "flex", alignItems: "center", gap: T.space[2], marginBottom: 2 }}>
          {heading}
          {!!changed && changed > 0 && (
            <span className="mn-section__changed" style={{ ...T.type.help, fontSize: 11, lineHeight: "14px", color: uv("text-secondary"), marginLeft: "auto", whiteSpace: "nowrap" }}>
              <span className="mn-section__dot" aria-hidden="true" />
              {changed === 1 ? "1 cambio" : `${changed} cambios`}
            </span>
          )}
        </div>
      ) : heading}
      <SectionHeadingContext.Provider value={headingId}>
        {children}
      </SectionHeadingContext.Provider>
    </div>
  );
}
