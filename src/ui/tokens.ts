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
      /** Only at >= 12px. Iteration 0: .46 -> .50 (inherited value/hex
       * measured 4.47:1 on the control fill; .50 clears 4.5:1). */
      tertiary:  "rgba(255,255,255,0.50)",
      disabled:  "rgba(255,255,255,0.28)",
      /** Mono section headers — never below 0.5 alpha. */
      section:   "rgba(255,255,255,0.52)",
      /** Review round (A11Y-12): placeholders need >= 4.5:1 on the control
       * fill — 0.46 measured 4.46:1 there. */
      placeholder: "rgba(255,255,255,0.52)",
    },
    surface: {
      /** L1 — the panel body. Solid on purpose: no backdrop blur. */
      panel:      "rgba(20,20,23,0.94)",
      /** L1 under prefers-reduced-transparency. */
      panelOpaque: "#141417",
      /** L2 — grouped controls, segmented track. */
      group:      "rgba(255,255,255,0.05)",
      groupHover: "rgba(255,255,255,0.08)",
      /** L3 — popovers (blurred, see editor.css's opaque fallback). */
      popover:    "rgba(30,30,35,0.90)",
      popoverSolid: "#1E1E23",
      control:    "rgba(255,255,255,0.06)",
      controlHover:  "rgba(255,255,255,0.10)",
      controlActive: "rgba(255,255,255,0.14)",
      thumb:      "rgba(255,255,255,0.14)",
      scrollbar:  "rgba(255,255,255,0.12)",
      /** Native <option> popups (not translucent anywhere). */
      option:     "#18181C",
    },
    line: {
      panel:  "rgba(255,255,255,0.12)",
      group:  "rgba(255,255,255,0.06)",
      control:"rgba(255,255,255,0.10)",
      strong: "rgba(255,255,255,0.20)",
      /** Always-visible field hairline (NumberField). */
      field:  "rgba(255,255,255,0.32)",
    },
    accent: {
      on:     "#F2F2F4",
      onHover: "#FFFFFF",
      onActive: "#DADADF",
      onInk:  "#141417",
      fill:   "rgba(255,255,255,0.88)",
      track:  "rgba(255,255,255,0.12)",
      trackHover: "rgba(255,255,255,0.18)",
      knob:   "rgba(255,255,255,0.92)",
      thumb:  "#FFFFFF",
      danger: "#FF5A52",
      dangerTint:       "rgba(255,90,82,0.10)",
      dangerTintActive: "rgba(255,90,82,0.16)",
      dangerLine:       "rgba(255,90,82,0.35)",
      focus:  "rgba(255,255,255,0.70)",
    },
    opacity: { disabled: 0.38 },
    radius: { panel: 16, group: 12, control: 8, segment: 6, chip: 999 },
    size:   { panelPad: 16, row: 32, control: 28, swatch: 24, icon: 16 },
    shadow: {
      panel:   "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px -12px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.3)",
      // Menu redesign Phase 1: was "… 0 16px 48px -8px …" here while
      // editor.css (what actually renders) drew this one — the CSS won.
      popover: "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px rgba(0,0,0,0.5)",
      // Review round (A11Y-7): a 1px 0.42 ring gives the selected segment
      // >= 3:1 against the track (fill alone measured 1.55:1).
      thumb:   "inset 0 0 0 1px rgba(255,255,255,0.42), inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.3)",
      /** The shared focus ring (dark halo + light ring). */
      ring:    "0 0 0 2px rgba(20,20,23,1), 0 0 0 3.5px rgba(255,255,255,0.70)",
      knob:    "0 1px 3px rgba(0,0,0,0.4)",
      rangeThumb:    "0 1px 3px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(0,0,0,0.2)",
      rangeThumbMoz: "0 1px 3px rgba(0,0,0,0.45)",
      well:      "0 0 0 1px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.32)",
      wellHover: "0 0 0 1px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.40)",
      /** Picker handles and gradient stops. */
      handle:         "0 0 0 1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
      handleSelected: "0 0 0 1px rgba(0,0,0,0.6), 0 0 0 3.5px rgba(255,255,255,0.55)",
      /** Keyboard focus ring of the canvas wrapper (Iteration 0). */
      canvasRing: "0 0 0 2px rgba(20,20,23,0.85), inset 0 0 0 2px rgba(255,255,255,0.75)",
    },
    /** Color well / picker chrome (the user's color is drawn on top). */
    picker: {
      handleBorder: "#FFFFFF",
      wellBase: "#2A2A30",
      checker:  "conic-gradient(#3A3A42 25%, #24242A 0 50%, #3A3A42 0 75%, #24242A 0)",
    },
    /** Canvas chrome buttons ("Editar", lock, rotate, toolbars) — opaque so
     * they read over any wallpaper. */
    chrome: {
      bg:          "rgba(12,12,14,0.96)",
      bgHover:     "rgba(40,40,44,0.98)",
      text:        "rgba(255,255,255,0.78)",
      line:        "rgba(255,255,255,0.18)",
      lineActive:  "rgba(255,255,255,0.32)",
      tint:        "rgba(255,255,255,0.16)",
      flatHover:   "rgba(255,255,255,0.10)",
      flatPressed: "rgba(255,255,255,0.92)",
      flatInk:     "#0a0a0c",
      shape:        "rgba(255,255,255,0.55)",
      shapePressed: "rgba(255,255,255,0.9)",
      shapeFill:    "rgba(255,255,255,0.25)",
      shapeFillInk: "rgba(10,10,12,0.25)",
      shadow:      "0 2px 8px rgba(0,0,0,0.4)",
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

// ── Menu redesign Phase 1: ONE source for the editor's design values ──────
// editor.css never declares a value of its own: every `--ui-*` custom
// property is GENERATED from T.ui / T.motion below and injected once by
// src/app/layout.tsx. Name = `--ui-<group>-<key>` in kebab case
// (T.ui.text.primary -> --ui-text-primary, T.motion.fast -> --ui-motion-fast).
// uiTokens.test.ts fails if editor.css references an unknown variable,
// declares its own, or carries a literal color.

const kebab = (k: string) => k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

/** Every editor custom property, name -> CSS value. */
export function uiCssVars(): Record<string, string> {
  const out: Record<string, string> = {};
  // Every T.ui group, so a group added later is emitted too (review P2-2).
  for (const g of Object.keys(T.ui) as Array<keyof typeof T.ui>) {
    for (const [k, v] of Object.entries(T.ui[g] as Record<string, string | number>)) {
      const px = g === "radius" || g === "size";
      out[`--ui-${kebab(g)}-${kebab(k)}`] = typeof v === "number" ? (px ? `${v}px` : String(v)) : v;
    }
  }
  for (const [k, v] of Object.entries(T.motion)) {
    out[`--ui-motion-${kebab(k)}`] = typeof v === "number" ? `${v}ms` : v;
  }
  return out;
}

/** Where the variables are defined: every editor root, plus the canvas
 * wrapper (its keyboard focus ring reads --ui-shadow-canvas-ring). Only
 * custom properties live here — nothing in card render reads `--ui-*`. */
export const UI_VARS_SCOPE = ":where([data-mnemo-editor], [data-mnemo-ui], [data-mnemo-canvas])";

/** The stylesheet text layout.tsx injects. */
export function uiCssVarsStylesheet(): string {
  const decls = Object.entries(uiCssVars()).map(([k, v]) => `${k}:${v};`).join("");
  return `${UI_VARS_SCOPE}{${decls}}`;
}
