"use client";
import React from "react";
import { Icon, type IconName } from "./icons";

interface IconButtonProps {
  icon:        IconName;
  /** Required: an icon-only button has no other accessible name. */
  "aria-label": string;
  onClick?:    (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?:       number;
  iconSize?:   number;
  tone?:       "default" | "danger";
  disabled?:   boolean;
  title?:      string;
  className?:  string;
  style?:      React.CSSProperties;
  pressed?:    boolean;
}

// Block 2: 28px square icon-only button. Hover/active/focus come from
// editor.css (.mn-iconbtn) — no hover state in JS. mousedown is stopped
// like every other editor control so a click never starts a canvas drag.
export function IconButton({ icon, onClick, size = 28, iconSize = 16, tone = "default", disabled, title, className, style, pressed, ...rest }: IconButtonProps) {
  const label = rest["aria-label"];
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      disabled={disabled}
      data-tone={tone}
      className={className ? `mn-iconbtn ${className}` : "mn-iconbtn"}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onClick?.(e); }}
      style={{ width: size, height: size, ...style }}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
