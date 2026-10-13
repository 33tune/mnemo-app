import React from "react";

// Block 2: the editor's own SVG icon set — 16px grid, 1.5 stroke, round
// caps/joins, currentColor. Replaces the unicode glyph "icons" (x, check,
// pencil, triangles) the menus used to draw with text. No emojis, no
// unicode glyphs: every icon is a path here.
const PATHS = {
  close:          <path d="M4 4l8 8M12 4l-8 8" />,
  plus:           <path d="M8 3.5v9M3.5 8h9" />,
  minus:          <path d="M3.5 8h9" />,
  check:          <path d="M3.5 8.5l3 3 6-7" />,
  pencil:         <><path d="M10.5 3.5l2 2L6 12H4v-2z" /><path d="M9 5l2 2" /></>,
  "chevron-down": <path d="M4 6l4 4 4-4" />,
  "chevron-right":<path d="M6 4l4 4-4 4" />,
  "chevron-up":   <path d="M4 10l4-4 4 4" />,
  "chevron-left": <path d="M10 4l-4 4 4 4" />,
  reset:          <><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3L3.5 5" /><path d="M3.5 2.5v2.5H6" /></>,
  eye:            <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>,
  "eye-off":      <><path d="M6.6 3.7A6.4 6.4 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a11 11 0 0 1-1.7 2.2M4.3 4.9C2.6 6.1 1.5 8 1.5 8S4 12.5 8 12.5c1.1 0 2.1-.3 3-.8" /><path d="M2 2l12 12" /></>,
  trash:          <><path d="M2.5 4.5h11" /><path d="M6 4.5V3h4v1.5" /><path d="M4 4.5l.7 8.5h6.6l.7-8.5" /></>,
  upload:         <><path d="M8 10V3" /><path d="M5 5.5L8 2.5l3 3" /><path d="M3 10.5v2h10v-2" /></>,
  link:           <><path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.7.7" /><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.7-.7" /></>,
  more:           <><circle cx="3.5" cy="8" r="0.75" /><circle cx="8" cy="8" r="0.75" /><circle cx="12.5" cy="8" r="0.75" /></>,
  lock:           <><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
  unlock:         <><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 4.8-1" /></>,
  rotate:         <><path d="M12.5 8a4.5 4.5 0 1 1-1.3-3.2" /><path d="M12.5 2.5v3h-3" /></>,
  // Editor v3 Phase D: rail + editor topbar.
  pointer:        <path d="M4 2.5l8.5 5.5-3.8.9L11 13l-1.6.8-2.2-4.1L4.5 12z" />,
  layers:         <><path d="M8 2.5l5.5 3L8 8.5l-5.5-3z" /><path d="M2.5 8.5L8 11.5l5.5-3" /><path d="M2.5 11.2L8 14.2l5.5-3" /></>,
  undo:           <><path d="M5.5 4L2.5 7l3 3" /><path d="M2.5 7h7.5a3 3 0 0 1 0 6H7" /></>,
  redo:           <><path d="M10.5 4l3 3-3 3" /><path d="M13.5 7H6a3 3 0 0 0 0 6h3" /></>,
  room:           <><path d="M2.5 7.5L8 3l5.5 4.5" /><path d="M4 6.5v7h8v-7" /><path d="M6.5 13.5v-3.5h3v3.5" /></>,
  // Editor v3 Phase E: drag handle of a Layers row.
  grip:           <><circle cx="6" cy="4" r="0.75" /><circle cx="10" cy="4" r="0.75" /><circle cx="6" cy="8" r="0.75" /><circle cx="10" cy="8" r="0.75" /><circle cx="6" cy="12" r="0.75" /><circle cx="10" cy="12" r="0.75" /></>,
  // Editor v3 Phase F: text alignment (segmented control).
  "align-left":   <><path d="M2.5 4h11" /><path d="M2.5 8h7" /><path d="M2.5 12h9" /></>,
  "align-center": <><path d="M2.5 4h11" /><path d="M4.5 8h7" /><path d="M3.5 12h9" /></>,
  "align-right":  <><path d="M2.5 4h11" /><path d="M6.5 8h7" /><path d="M4.5 12h9" /></>,
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name:   IconName;
  size?:  number;
  style?: React.CSSProperties;
  /** Decorative by default (the control around it carries the label). */
  title?: string;
}

// Review round (VIS-6): the 16-unit viewBox is scaled to `size`, so the
// stroke width is compensated to stay 1.5 device px at any size.
export function Icon({ name, size = 16, style, title }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={(1.5 * 16) / size} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
