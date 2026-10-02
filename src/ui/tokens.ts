export const T = {
  surface: {
    canvas:  "#09090B",
    base:    "#111114",
    raised:  "#18181C",
    overlay: "#1E1E24",
    input:   "rgba(255,255,255,0.04)",
  },
  text: {
    primary:   "#F2F2F4",
    secondary: "#8A8A96",
    muted:     "#46464F",
  },
  border: {
    subtle:  "rgba(255,255,255,0.05)",
    default: "rgba(255,255,255,0.10)",
    strong:  "rgba(255,255,255,0.18)",
  },
  accent: {
    default: "#FFFFFF",
    danger:  "#FF4444",
  },
  font: {
    sans: "'DM Sans', sans-serif",
    mono: "'Space Mono', monospace",
  },
  size: {
    label: 10,
    xs:    11,
    sm:    12,
    base:  13,
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: {
    sm:    "0 1px 3px rgba(0,0,0,0.5)",
    panel: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
  },
  comp: {
    panelWidth: 272,
    rowHeight:  28,
    inputH:     32,
    toggleW:    34,
    toggleH:    20,
    swatchSize: 22,
  },

  // ── Block 2 (editor visual system, "vidrio ahumado, cuerpo sólido") ──────
  // Everything above stays as-is: some canvas widgets still read it for
  // their own RENDER, so changing those values would leak into cards. The
  // editor primitives in src/ui read from here instead. Interaction states
  // (:hover/:active/:focus-visible, range thumbs, reduced motion/
  // transparency) live in src/ui/editor.css — see its header.
  ui: {
    text: {
      primary:   "rgba(255,255,255,0.94)",
      secondary: "rgba(255,255,255,0.62)",
      /** Only at >= 12px. */
      tertiary:  "rgba(255,255,255,0.46)",
      disabled:  "rgba(255,255,255,0.28)",
      /** Mono section headers — never below 0.5 alpha. */
      section:   "rgba(255,255,255,0.52)",
    },
    surface: {
      /** L1 — the panel body. Solid on purpose: no backdrop blur. */
      panel:      "rgba(20,20,23,0.94)",
      /** L2 — grouped controls, segmented track. */
      group:      "rgba(255,255,255,0.05)",
      groupHover: "rgba(255,255,255,0.08)",
      /** L3 — popovers (blurred, see editor.css's opaque fallback). */
      popover:    "rgba(30,30,35,0.90)",
      popoverSolid: "#1E1E23",
      control:    "rgba(255,255,255,0.06)",
      thumb:      "rgba(255,255,255,0.14)",
    },
    line: {
      panel:  "rgba(255,255,255,0.12)",
      group:  "rgba(255,255,255,0.06)",
      control:"rgba(255,255,255,0.10)",
      strong: "rgba(255,255,255,0.20)",
    },
    accent: {
      on:     "#F2F2F4",
      onInk:  "#141417",
      fill:   "rgba(255,255,255,0.88)",
      track:  "rgba(255,255,255,0.12)",
      danger: "#FF5A52",
      focus:  "rgba(255,255,255,0.70)",
    },
    radius: { panel: 16, group: 12, control: 8, segment: 6, chip: 999 },
    size:   { panelPad: 16, row: 32, control: 28, swatch: 24, icon: 16 },
    shadow: {
      panel:   "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px -12px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3)",
      popover: "inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 48px -8px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.35)",
      // Review round (A11Y-7): a 1px 0.42 ring gives the selected segment
      // >= 3:1 against the track (fill alone measured 1.55:1).
      thumb:   "inset 0 0 0 1px rgba(255,255,255,0.42), inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.3)",
    },
  },

  /** Type scale — DM Sans for everything readable, Space Mono only for
   * section headers and numeric/hex values. Nothing below 10px. */
  type: {
    // Spec asks 600, but loading DM Sans 600 would change how existing
    // profiles render (cards requesting 600/700 would switch from synthetic
    // bold to the real face) — Block 2 must not touch render. 500 is the
    // heaviest weight already loaded.
    title:   { fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: "20px", fontWeight: 500 },
    // Spec asks 450; the DM Sans import (globals.css) only ships 300/400/500
    // and the browser would snap 450 to 500 — 400 is the honest match.
    label:   { fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: "18px", fontWeight: 400 },
    help:    { fontFamily: "'DM Sans', sans-serif", fontSize: 12, lineHeight: "16px", fontWeight: 400 },
    tab:     { fontFamily: "'DM Sans', sans-serif", fontSize: 12, lineHeight: "16px", fontWeight: 500 },
    section: { fontFamily: "'Space Mono', monospace", fontSize: 10, lineHeight: "14px", letterSpacing: "0.08em", textTransform: "uppercase" },
    value:   { fontFamily: "'Space Mono', monospace", fontSize: 11, lineHeight: "16px", fontVariantNumeric: "tabular-nums" },
  },

  motion: { fast: 120, base: 180, panel: 220, segment: 240, ease: "cubic-bezier(0.32,0.72,0,1)" },
  z:      { menu: 999999, popover: 1000000 },
} as const;
