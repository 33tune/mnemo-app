"use client";
import React, { useState } from "react";
import { T } from "./tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ActionButtonProps {
  children:      React.ReactNode;
  variant?:      Variant;
  fullWidth?:    boolean;
  onClick?:      (e: React.MouseEvent) => void;
  onMouseDown?:  (e: React.MouseEvent) => void;
  disabled?:     boolean;
}

const base: React.CSSProperties = {
  height:       32,
  padding:      "0 14px",
  borderRadius: T.radius.md,
  cursor:       "pointer",
  fontFamily:   T.font.sans,
  fontSize:     T.size.base,
  fontWeight:   400,
  userSelect:   "none",
  transition:   "all 0.12s ease",
  display:      "flex",
  alignItems:   "center",
  justifyContent: "center",
  gap:          6,
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary:   { background: T.text.primary,   color: T.surface.canvas, border: "none" },
  secondary: { background: "transparent",    color: T.text.primary,   border: `1px solid ${T.border.default}` },
  ghost:     { background: "transparent",    color: T.text.secondary, border: "none" },
  danger:    { background: "transparent",    color: T.accent.danger,  border: "none" },
};

const hoverStyles: Record<Variant, React.CSSProperties> = {
  primary:   { background: T.accent.default },
  secondary: { background: T.surface.raised, borderColor: T.border.strong },
  ghost:     { color: T.text.primary },
  danger:    { background: "rgba(255,68,68,0.08)" },
};

export function ActionButton({ children, variant = "secondary", fullWidth, onClick, onMouseDown, disabled }: ActionButtonProps) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseDown={onMouseDown ?? (e => e.stopPropagation())}
      onClick={onClick ?? (e => e.stopPropagation())}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={disabled}
      style={{
        ...base,
        ...variantStyles[variant],
        ...(hov && !disabled ? hoverStyles[variant] : {}),
        width:   fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.4 : 1,
        cursor:  disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
