/**
 * Iteration 0: where focus goes after an action removes the focused control
 * (reset dot, "quitar" photo/logo/background/MP3, deleting a link, deleting
 * a module) — never <body>.
 *
 * Order (A11y review): the field's own main control (when the field
 * survives) → the next list item → the previous list item → the enclosing
 * group → the panel root → the canvas. Pure: callers pass candidates in
 * that order, each resolved AFTER the re-render.
 */
export interface FocusCandidate {
  /** Is the container still in the document? */
  connected: boolean;
  /** Its first focusable element (null when it has none). */
  target: { focus: (o?: FocusOptions) => void } | null;
}

export function pickRefocusTarget(candidates: Array<FocusCandidate | null | undefined>): FocusCandidate["target"] {
  for (const c of candidates) {
    if (c && c.connected && c.target) return c.target;
  }
  return null;
}
