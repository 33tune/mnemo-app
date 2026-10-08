// ── MYLAND Editor v3 — Phase A: editor themes (Light / Dark / OG) ─────────
// The palettes of "MYLAND Editor v3.dc.html" (`[data-t=…]`, the `--t-*`
// variables; plan §3) — the single source for every theme color. They are
// emitted as `--ui-theme-<key>` ONLY under
//   :root[data-editor-theme="<t>"] :where([data-mnemo-editor], [data-mnemo-ui])
// (uiCssVarsStylesheet below), so they can never reach the canvas, the
// ProfileCard or the public page. The semantic T.ui tokens below point at
// them (`th("ink")`), which is how the existing editor.css rules and inline
// styles switch theme without being rewritten.
//
// First block of keys = the design file, verbatim, EXCEPT the WCAG
// adjustments (decision A5, measured by uiTokens.test.ts; also in
// docs/ux/menu-redesign/myland-editor-v3-plan.md §3):
//   light/og ink3   #A1A1AA -> #69696F  (2.29:1 -> 4.50:1 on fieldHover, text)
//   dark ink3       #5F5F68 -> #8B8B91  (2.69:1 -> 4.50:1 on fieldHover, text)
//   light ink2 #6B6B73 / og ink2 #66666E -> #56565E (r2: keeps ink2 clearly
//                    above ink3 — 7.27:1 vs 5.45:1 on panel)
//   dark ink2       #9B9BA4 -> #B4B4BC  (r2: same reason, 9.08:1 vs 5.52:1)
//   pop (all)       .78 / .74 / .80 -> .90  (r2: ink2 labels on a popover over
//                    ANY wallpaper >= 4.5:1; Darkroom precedent >= .86)
//   light/og track2 #E4E4E7 -> #949496  (1.27:1 -> 3.03:1 on panel, switch off)
//   dark track2     #2C2C31 -> #616165  (1.35:1 -> 3.03:1 on panel, switch off)
//   og on           #FF5C9D -> #F5559A  (2.89:1 -> 3.16:1 on panel + vs knob)
//   dark sel        #7B61FF -> #765DF5  (selInk 4.20:1 -> 4.51:1)
//   r2: + `edge` (#8B8B93 / #67676B, >= 3:1 on panel AND field): field
//   outline, slider thumb ring (Light/OG), selected-segment ring; slider
//   track .09->.12 (light/og), .10->.14 (dark); picker well/checker themed.
//   og glass/glassInk2  rgba(16,16,18,.55)/rgba(255,255,255,.65)
//                    -> rgba(16,16,18,.64)/rgba(255,255,255,.80)
//                       (glassInk2 2.89:1 -> 4.6:1 over the og page)
// Second block = derived keys the design file does not spell out (lines,
// focus ring, danger, opaque fallbacks…), chosen per theme in the same
// family and contrast-tested the same way.
const LIGHT = {
  panel: "#FFFFFF", field: "#F2F2F4", fieldHover: "#E9E9EC",
  ink: "#0B0B0C", ink2: "#56565E", ink3: "#69696F",
  track: "rgba(0,0,0,0.12)", track2: "#949496", fill: "#6B4EFF",
  sel: "#6B4EFF", selInk: "#FFFFFF", on: "#0B0B0C", knobOn: "#FFFFFF", edit: "#C2541A",
  rail: "#0B0B0C", railInk: "#8A8A93", railSel: "#6B4EFF", railSelInk: "#FFFFFF",
  glass: "rgba(255,255,255,0.80)", glassInk: "#0B0B0C", glassInk2: "#6B6B73",
  glassEdge: "inset 0 -0.5px 0 rgba(0,0,0,0.08)", glassBtn: "rgba(0,0,0,0.05)",
  pop: "rgba(255,255,255,0.90)", popInk: "#0B0B0C",
  panelShadow: "0 0 0 0.5px rgba(0,0,0,0.06), 0 24px 60px -24px rgba(0,0,0,0.35)",
  seg: "#FFFFFF", segInk: "#0B0B0C", segShadow: "inset 0 0 0 1px #8B8B93, 0 1px 3px rgba(0,0,0,0.12)",
  n1: "#6B4EFF", n2: "#E11D74", n3: "#C2541A", n4: "#5E7A00",
  // derived
  page: "#F4F4F5", fieldActive: "#E2E2E6", inkDisabled: "#B4B4BB",
  popSolid: "#FFFFFF", popShadow: "0 0 0 0.5px rgba(0,0,0,0.08), 0 16px 40px -12px rgba(0,0,0,0.28)",
  scrollbar: "rgba(0,0,0,0.18)", line: "rgba(0,0,0,0.08)", lineStrong: "rgba(0,0,0,0.20)", lineField: "#8B8B93",
  primaryHover: "#26262A", primaryActive: "#3A3A40", trackHover: "rgba(0,0,0,0.14)",
  danger: "#D92D20", dangerTint: "rgba(217,45,32,0.08)", dangerTintActive: "rgba(217,45,32,0.14)", dangerLine: "rgba(217,45,32,0.35)",
  focus: "#6B4EFF", ring: "0 0 0 2px #FFFFFF, 0 0 0 3.5px #6B4EFF",
  // r2: a boundary grey >= 3:1 on panel AND field — slider thumb ring,
  // selected-segment ring, field outline (1.4.11).
  edge: "#8B8B93",
  thumbShadow: "0 0 0 1.5px #8B8B93, 0 1px 3px rgba(0,0,0,0.20)",
  wellBase: "#FFFFFF",
  checker: "conic-gradient(#E4E4E7 25%, #FFFFFF 0 50%, #E4E4E7 0 75%, #FFFFFF 0)",
};
type ThemePalette = { readonly [K in keyof typeof LIGHT]: string };

const DARK: ThemePalette = {
  panel: "#121214", field: "#1C1C20", fieldHover: "#25252A",
  ink: "#F4F4F5", ink2: "#B4B4BC", ink3: "#8B8B91",
  track: "rgba(255,255,255,0.14)", track2: "#616165", fill: "#8B73FF",
  sel: "#765DF5", selInk: "#FFFFFF", on: "#C6F432", knobOn: "#0B0B0C", edit: "#FF8A3D",
  rail: "#000000", railInk: "#6F6F78", railSel: "#C6F432", railSelInk: "#0B0B0C",
  glass: "rgba(16,16,18,0.58)", glassInk: "#F4F4F5", glassInk2: "#9B9BA4",
  glassEdge: "inset 0 -0.5px 0 rgba(255,255,255,0.08)", glassBtn: "rgba(255,255,255,0.07)",
  pop: "rgba(26,26,30,0.90)", popInk: "#F4F4F5",
  panelShadow: "0 0 0 0.5px rgba(255,255,255,0.07), 0 30px 80px -24px rgba(0,0,0,0.9)",
  seg: "#2E2E34", segInk: "#F4F4F5", segShadow: "inset 0 0 0 1px #67676B, 0 1px 2px rgba(0,0,0,0.5)",
  n1: "#9B85FF", n2: "#FF5C9D", n3: "#FF8A3D", n4: "#C6F432",
  // derived
  page: "#050506", fieldActive: "#2C2C32", inkDisabled: "#4A4A52",
  popSolid: "#1A1A1E", popShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 32px rgba(0,0,0,0.5)",
  scrollbar: "rgba(255,255,255,0.14)", line: "rgba(255,255,255,0.08)", lineStrong: "rgba(255,255,255,0.20)", lineField: "#67676B",
  primaryHover: "#FFFFFF", primaryActive: "#DADADF", trackHover: "rgba(255,255,255,0.16)",
  danger: "#FF5A52", dangerTint: "rgba(255,90,82,0.10)", dangerTintActive: "rgba(255,90,82,0.16)", dangerLine: "rgba(255,90,82,0.35)",
  focus: "#9B85FF", ring: "0 0 0 2px #121214, 0 0 0 3.5px #9B85FF",
  edge: "#67676B",
  // The white thumb itself is 18:1 on the dark panel: no ring needed.
  thumbShadow: "0 1px 3px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(0,0,0,0.2)",
  wellBase: "#2A2A30",
  checker: "conic-gradient(#3A3A42 25%, #24242A 0 50%, #3A3A42 0 75%, #24242A 0)",
};

const OG: ThemePalette = {
  ...LIGHT,
  ink2: "#56565E",
  sel: "#C6F432", selInk: "#0B0B0C", on: "#F5559A", knobOn: "#FFFFFF",
  rail: "#6B4EFF", railInk: "rgba(255,255,255,0.72)", railSel: "#C6F432", railSelInk: "#0B0B0C",
  glass: "rgba(16,16,18,0.64)", glassInk: "#FFFFFF", glassInk2: "rgba(255,255,255,0.80)",
  glassEdge: "inset 0 -0.5px 0 rgba(255,255,255,0.1)", glassBtn: "rgba(255,255,255,0.1)",
  pop: "rgba(255,255,255,0.90)",
  panelShadow: "0 24px 60px -24px rgba(0,0,0,0.6)",
  seg: "#0B0B0C", segInk: "#FFFFFF", segShadow: "none",
};

/** Editor font stacks: next/font (layout.tsx) defines --font-display/-sans/
 * -mono/-serif on <html>. None of these families is in CANVAS_FONTS, so no
 * profile can render with them (uiTokens.test.ts). */
const UI_FONT = {
  display: "var(--font-display, system-ui), system-ui, sans-serif",
  sans:    "var(--font-sans, system-ui), system-ui, sans-serif",
  mono:    "var(--font-mono, ui-monospace), ui-monospace, monospace",
  serif:   "var(--font-serif, Georgia), Georgia, serif",
} as const;

/** Per-theme type overrides (DS: OG title 750 26 display, heading 650 15
 * display). Emitted with the palettes as --ui-theme-<key>. */
const TYPE_BASE = {
  titleFont: UI_FONT.display, titleSize: "22px", titleWeight: "650",
  headingFont: UI_FONT.sans, headingWeight: "600",
};
type ThemeType = { readonly [K in keyof typeof TYPE_BASE]: string };
const TYPE_OG: ThemeType = { ...TYPE_BASE, titleSize: "26px", titleWeight: "750", headingFont: UI_FONT.display, headingWeight: "650" };

const kebab = (k: string) => k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

/** A semantic token that follows the editor theme: the theme variable, with
 * the DARK value as fallback (= the look of any consumer outside an editor
 * root, e.g. CanvasBoard's FAB, and of the dark-locked legacy menus). */
function th(key: keyof ThemePalette): string {
  return `var(--ui-theme-${kebab(key)}, ${DARK[key]})`;
}
function thType(key: keyof ThemeType): string {
  return `var(--ui-theme-${kebab(key)}, ${TYPE_BASE[key]})`;
}

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

  // ── MYLAND Editor v3 (Phase A): editor themes ────────────────────────────
  // Light / Dark / OG palettes (see the header of this file). Everything in
  // T.ui that is a COLOR is a theme reference (`th(key)`); sizes, radii,
  // z-indexes and motion stay literal. Interaction states live in
  // src/ui/editor.css.
  theme: { light: LIGHT, dark: DARK, og: OG },
  themeType: { light: TYPE_BASE, dark: TYPE_BASE, og: TYPE_OG },

  ui: {
    text: {
      primary:   th("ink"),
      secondary: th("ink2"),
      /** >= 4.5:1 on panel AND field in every theme (A5, tested). */
      tertiary:  th("ink3"),
      disabled:  th("inkDisabled"),
      section:   th("ink2"),
      placeholder: th("ink3"),
      /** Selected segment label (OG: white on the black thumb). */
      seg:       th("segInk"),
      /** Selected chip label (Phase F). */
      sel:       th("selInk"),
    },
    surface: {
      panel:      th("panel"),
      /** Panel under prefers-reduced-transparency (the panels are opaque). */
      panelOpaque: th("panel"),
      group:      th("field"),
      groupHover: th("fieldHover"),
      /** Popovers: translucent `pop` + blur; opaque fallback below. */
      popover:    th("pop"),
      popoverSolid: th("popSolid"),
      control:    th("field"),
      controlHover:  th("fieldHover"),
      controlActive: th("fieldActive"),
      /** Selected segment thumb. */
      thumb:      th("seg"),
      scrollbar:  th("scrollbar"),
      /** Native <option> popups (not translucent anywhere). */
      option:     th("popSolid"),
      sel:        th("sel"),
    },
    line: {
      panel:  th("line"),
      group:  th("line"),
      control:th("line"),
      strong: th("lineStrong"),
      /** Always-visible field hairline (NumberField). */
      field:  th("lineField"),
    },
    accent: {
      /** Primary button: ink on panel. */
      on:     th("ink"),
      onHover: th("primaryHover"),
      onActive: th("primaryActive"),
      onInk:  th("panel"),
      /** Slider fill (and the value pill while dragging). */
      fill:   th("fill"),
      /** Slider track. */
      track:  th("track"),
      trackHover: th("trackHover"),
      /** Switch: off track / on track / knob off / knob on. */
      switchOff: th("track2"),
      switchOn:  th("on"),
      knob:   "#FFFFFF",
      knobOn: th("knobOn"),
      /** Range thumb (white in every theme, with a shadow ring). */
      thumb:  "#FFFFFF",
      /** "Modified" dot and "N cambios". */
      edit:   th("edit"),
      danger: th("danger"),
      dangerTint:       th("dangerTint"),
      dangerTintActive: th("dangerTintActive"),
      dangerLine:       th("dangerLine"),
      focus:  th("focus"),
      /** Select chevron, drawn inside a data: URI (no var() there): one
       * mid grey with >= 3:1 on the field of every theme (tested). */
      chevron: "#86868E",
    },
    /** Section number tones 01–04 (MenuSection `tone`). */
    tone: { n1: th("n1"), n2: th("n2"), n3: th("n3"), n4: th("n4") },
    /** Editor font stacks as variables (--ui-font-sans …) for editor.css. */
    font: UI_FONT,
    opacity: { disabled: 0.38 },
    radius: { panel: 16, group: 12, control: 8, segment: 6, chip: 999, field: 12, pill: 7, button: 10, segTrack: 10, segThumb: 8,
      /** Editor v3 Phase B: top corners of the bottom sheet (design screen 10). */
      sheet: 28 },
    size:   {
      panelPad: 16, row: 32, control: 28, swatch: 24, icon: 16,
      /** Menu redesign Phase 2: the docked inspector's width (InspectorShell). */
      inspectorW: 320,
      /** Object-list chip height (design-direction.md §E). */
      objChip: 32,
      /** v3 controls (plan §3): switch 40×24 / knob 20, slider thumb 18, button 34. */
      switchW: 40, switchH: 24, knob: 20, thumb: 18, button: 34,
    },
    /** Below this viewport width the inspector stops docking and becomes a
     * bottom sheet (Editor v3 Phase B; Phase 2 used a right overlay here).
     * The design says "under ~900px"; the value stays 992 because the dock
     * must leave room for the widest ProfileCard next to it — see
     * uiTokens.test.ts (inspectorW + getFreeformCardBounds().maxW + 2 × 16px
     * gutter). Phase D (dock 360px) recomputes it from the same rule. */
    breakpoint: { inspectorSheet: 992 },
    shadow: {
      panel:   th("panelShadow"),
      popover: th("popShadow"),
      /** Selected segment thumb. */
      thumb:   th("segShadow"),
      /** The shared focus ring (panel-colored halo + focus ring). */
      ring:    th("ring"),
      knob:    "0 1px 3px rgba(0,0,0,0.25)",
      /** r2: Light/OG ring the white thumb with `edge` (>= 3:1 on the panel). */
      rangeThumb:    th("thumbShadow"),
      rangeThumbMoz: th("thumbShadow"),
      well:      "inset 0 0 0 1px rgba(0,0,0,0.18), 0 0 0 1px rgba(127,127,127,0.35)",
      wellHover: "inset 0 0 0 1px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(127,127,127,0.55)",
      /** Picker handles and gradient stops. */
      handle:         "0 0 0 1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
      handleSelected: "0 0 0 1px rgba(0,0,0,0.6), 0 0 0 3.5px rgba(127,127,127,0.7)",
      /** Keyboard focus ring of the canvas wrapper (Iteration 0). THEME-
       * INDEPENDENT on purpose (A6): it is the only `--ui-*` color the
       * canvas scope defines. */
      canvasRing: "0 0 0 2px rgba(20,20,23,0.85), inset 0 0 0 2px rgba(255,255,255,0.75)",
    },
    /** Color well / picker chrome (the user's color is drawn on top). */
    picker: {
      handleBorder: "#FFFFFF",
      /** r2: themed, so alpha colors read clean on Light/OG. */
      wellBase: th("wellBase"),
      checker:  th("checker"),
    },
    /** Canvas chrome buttons ("Editar", lock, rotate, toolbars, Link chip) —
     * opaque so they read over any wallpaper. THEME-INDEPENDENT (A6): never
     * th(); editor.css' chrome rules use only these (+ chrome.ring). */
    chrome: {
      bg:          "rgba(12,12,14,0.96)",
      bgHover:     "rgba(40,40,44,0.98)",
      text:        "rgba(255,255,255,0.78)",
      textHover:   "rgba(255,255,255,0.94)",
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
      ring:        "0 0 0 2px rgba(20,20,23,1), 0 0 0 3.5px rgba(255,255,255,0.70)",
    },
  },

  /** Editor font stacks (next/font variables, layout.tsx). */
  uiFont: UI_FONT,

  /** Type roles of the MYLAND DS (tokens/typography.css). Nothing below
   * 11px. Families are next/font variables (never DM Sans / Space Mono —
   * those belong to the canvas). title/heading follow the theme (OG uses
   * the display face, heavier). */
  type: {
    title:   { fontFamily: thType("titleFont"), fontSize: thType("titleSize"), lineHeight: 1.15, fontWeight: thType("titleWeight"), letterSpacing: "-0.02em" },
    heading: { fontFamily: thType("headingFont"), fontSize: 15, lineHeight: "20px", fontWeight: thType("headingWeight") },
    label:   { fontFamily: UI_FONT.sans, fontSize: 13, lineHeight: "18px", fontWeight: 450 },
    control: { fontFamily: UI_FONT.sans, fontSize: 13, lineHeight: "18px", fontWeight: 550 },
    help:    { fontFamily: UI_FONT.sans, fontSize: 12, lineHeight: "16px", fontWeight: 400 },
    /** Segmented / tab labels = the DS "control" role. */
    tab:     { fontFamily: UI_FONT.sans, fontSize: 13, lineHeight: "18px", fontWeight: 550 },
    /** Section eyebrow (MenuSection, Collapsible): mono 11, uppercase, .12em. */
    section: { fontFamily: UI_FONT.mono, fontSize: 11, lineHeight: "14px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase" },
    eyebrow: { fontFamily: UI_FONT.sans, fontSize: 11, lineHeight: "14px", fontWeight: 600 },
    value:   { fontFamily: UI_FONT.mono, fontSize: 12, lineHeight: "16px", fontWeight: 450, fontVariantNumeric: "tabular-nums" },
    kbd:     { fontFamily: UI_FONT.mono, fontSize: 11, lineHeight: "14px", fontWeight: 450 },
    accent:  { fontFamily: UI_FONT.serif, fontSize: 22, lineHeight: 1.1, fontWeight: 400, fontStyle: "italic" },
  },

  motion: { fast: 120, base: 180, panel: 220, segment: 240, ease: "cubic-bezier(0.32,0.72,0,1)", spring: "cubic-bezier(0.34,1.56,0.64,1)", switch: 320 },
  /** inspector = menu − 1: under Music's floating menu and ColorPopover,
   * above every canvas chrome and the topbar (uiTokens.test.ts). */
  z:      { inspector: 999998, menu: 999999, popover: 1000000 },
} as const;

// ── ONE source for the editor's design values (Phase 1, extended in v3 A) ─
// editor.css never declares a value of its own: every `--ui-*` custom
// property is GENERATED from T below and injected once by src/app/layout.tsx.
//   --ui-<group>-<key>   from T.ui / T.motion (T.ui.text.primary ->
//                        --ui-text-primary). Colors are theme references.
//   --ui-theme-<key>     from T.theme / T.themeType, one set per theme, ONLY
//                        under :root[data-editor-theme="<t>"] + editor roots.
// uiTokens.test.ts fails if editor.css references an unknown variable,
// declares its own, or carries a literal color.

/** Inline-style helper: `uv("text-primary")` -> "var(--ui-text-primary)".
 * The only way src/ui and the editor menus write a color inline. */
export function uv(name: string): string {
  return `var(--ui-${name})`;
}

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

export type EditorThemeName = keyof typeof T.theme;
export const EDITOR_THEME_NAMES = Object.keys(T.theme) as EditorThemeName[];

/** One theme's `--ui-theme-*` variables (palette + type overrides). */
export function themeCssVars(theme: EditorThemeName): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(T.theme[theme])) out[`--ui-theme-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(T.themeType[theme])) out[`--ui-theme-${kebab(k)}`] = v;
  return out;
}

/** The editor roots: where the --ui-* variables are defined. */
export const UI_ROOTS = ":where([data-mnemo-editor], [data-mnemo-ui])";
/** Back-compat name (Phase 1): the editor scope. */
export const UI_VARS_SCOPE = UI_ROOTS;
/** The canvas wrapper only gets theme-NEUTRAL values: its keyboard focus
 * ring (A6) and the view-offset transition timing. Never a theme color. */
export const CANVAS_VARS_SCOPE = ":where([data-mnemo-canvas])";
export function canvasCssVars(): Record<string, string> {
  const all = uiCssVars();
  const out: Record<string, string> = { "--ui-shadow-canvas-ring": all["--ui-shadow-canvas-ring"] };
  for (const k of Object.keys(all)) if (k.startsWith("--ui-motion-")) out[k] = all[k];
  return out;
}

/** Selector of one theme's declarations (<html data-editor-theme>). */
export function themeSelector(theme: EditorThemeName): string {
  return `:root[data-editor-theme="${theme}"] ${UI_ROOTS}`;
}
/** Themes a subtree can be locked to (A7: legacy widgets' MenuPanel carries
 * data-editor-theme="dark" so their menus stay legible in Light/OG). The
 * lock outranks the html theme: (0,3,0) vs (0,2,0). */
export const LOCKABLE_THEMES: EditorThemeName[] = ["dark"];
export function themeLockSelector(theme: EditorThemeName): string {
  return `:root[data-editor-theme] ${UI_ROOTS}[data-editor-theme="${theme}"], :root[data-editor-theme] [data-editor-theme="${theme}"] ${UI_ROOTS}`;
}

const block = (sel: string, vars: Record<string, string>) =>
  `${sel}{${Object.entries(vars).map(([k, v]) => `${k}:${v};`).join("")}}`;

/** The stylesheet text layout.tsx injects. */
export function uiCssVarsStylesheet(): string {
  return [
    block(UI_ROOTS, uiCssVars()),
    block(CANVAS_VARS_SCOPE, canvasCssVars()),
    ...EDITOR_THEME_NAMES.map(t => block(themeSelector(t), themeCssVars(t))),
    ...LOCKABLE_THEMES.map(t => block(themeLockSelector(t), themeCssVars(t))),
  ].join("\n");
}
