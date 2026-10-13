/**
 * Editor v3 Phase G — a free text's defaults: the values a new text is
 * created with (CanvasBoard › "+" › Texto) and, therefore, what the text
 * inspector's modified dots / resets compare against (every CanvasText field
 * is required — a reset writes the default back instead of deleting a key).
 */
export const CANVAS_TEXT_DEFAULTS = {
  content: "text",
  font: "DM Sans",
  size: 48,
  color: "#ffffff",
  opacity: 1,
  letterSpacing: 0,
  uppercase: false,
} as const;

/** Font size bounds: the old toolbar's −/+ and the Ctrl/⌘+arrow resize
 * (canvasNudge.nudgeResize) clamp to the same range. */
export const CANVAS_TEXT_SIZE_RANGE = { min: 10, max: 300 } as const;
