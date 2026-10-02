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
  link:           <><path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.7.7" /><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.7-.7" /></>,
  more:           <><circle cx="3.5" cy="8" r="0.75" /><circle cx="8" cy="8" r="0.75" /><circle cx="12.5" cy="8" r="0.75" /></>,
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
