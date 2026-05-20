"use client";
import { useState } from "react";
import { UI } from "@/styles/ui";

interface Props {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  /** Display font size in px */
  fontSize?:    number;
  fontWeight?:  number | "normal" | "bold";
  fontFamily?:  string;
  /** Text color for the display state */
  color?:       string;
  /** Smaller, dimmer variant for secondary text */
  dim?:         boolean;
  /** Stop mousedown bubbling (useful when inside draggable containers) */
  onMouseDown?: (e: React.MouseEvent) => void;
}

export function UIInputInline({
  value,
  onChange,
  placeholder = "—",
  fontSize    = 14,
  fontWeight  = 400,
  fontFamily  = UI.font,
  color,
  dim         = false,
  onMouseDown,
}: Props) {
  const [editing, setEditing] = useState(false);

  const resolvedColor = color ?? (dim ? UI.colors.textDim : UI.colors.text);

  const sharedStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily,
    color: resolvedColor,
    width: "100%",
    boxSizing: "border-box",
    padding: "0 0 3px",
    lineHeight: 1.3,
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
        onMouseDown={onMouseDown}
        style={{
          ...sharedStyle,
          background:   "transparent",
          border:       "none",
          borderBottom: `1px solid ${UI.colors.border}`,
          outline:      "none",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      onMouseDown={onMouseDown}
      title="click to edit"
      style={{
        ...sharedStyle,
        color:      value ? resolvedColor : UI.colors.textFaint,
        cursor:     "text",
        transition: "opacity 0.1s cubic-bezier(0.2,0.8,0.2,1)",
        userSelect: "none",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0.65"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
    >
      {value || placeholder}
    </div>
  );
}
