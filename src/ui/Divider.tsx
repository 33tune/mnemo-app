"use client";
import React from "react";
import { T } from "./tokens";

// Block 2: hairline in the group line color; decorative (role=separator is
// for menus — here it only splits visual groups, so it stays out of the
// accessibility tree).
export function Divider({ margin = T.space[3] }: { margin?: number }) {
  return <div aria-hidden style={{ height: 1, background: T.ui.line.group, margin: `${margin}px 0`, flexShrink: 0 }} />;
}
