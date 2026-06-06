"use client";
import React from "react";
import { T } from "./tokens";

export function Divider({ margin = T.space[3] }: { margin?: number }) {
  return <div style={{ height: 1, background: T.border.subtle, margin: `${margin}px 0`, flexShrink: 0 }} />;
}
