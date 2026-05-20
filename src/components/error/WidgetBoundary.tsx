"use client";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface Props {
  children: React.ReactNode;
  label?:   string;
}

/**
 * Lightweight isolation boundary for individual canvas widgets and floating panels.
 * On error: renders null (element silently disappears) and logs [mnemo-error].
 * Prevents a single broken element from crashing the whole canvas.
 */
export function WidgetBoundary({ children, label }: Props) {
  return (
    <ErrorBoundary label={label ?? "widget"}>
      {children}
    </ErrorBoundary>
  );
}
