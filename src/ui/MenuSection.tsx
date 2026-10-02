"use client";
import React, { useId } from "react";
import { T } from "./tokens";

interface MenuSectionProps {
  label:    string;
  children: React.ReactNode;
  first?:   boolean;
}

// Block 2: section header in the editor's "section" type (Space Mono 10,
// uppercase, 0.08em, >= 0.5 alpha — the old #46464F read at 2:1). The
// header is a real heading and names the group it introduces.
export function MenuSection({ label, children, first }: MenuSectionProps) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId}
      style={{ marginTop: first ? 0 : T.space[5], display: "flex", flexDirection: "column", gap: T.space[2] }}>
      <div id={headingId} role="heading" aria-level={3} style={{
        ...T.type.section,
        color:         T.ui.text.section,
        userSelect:    "none",
        marginBottom:  2,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
