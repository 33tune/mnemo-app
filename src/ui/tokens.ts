// ── MYLAND Liquid glass (Menus v4, Phase L0): editor themes ─────────────────
// The palettes of the MYLAND design system (design-import/menus-liquid-glass/
// _ds/…/tokens/glass.css + colors.css: `--glass-*`, `--brand-*`) — the single
// source for every editor theme color. Emitted as `--ui-theme-<key>` ONLY
// under :root[data-editor-theme="<t>"] :where([data-mnemo-editor],
// [data-mnemo-ui]) (uiCssVarsStylesheet below): they never reach the canvas,
// the ProfileCard or the public page. Semantic T.ui tokens point at them
// (`th("ink")`).
//
// Material: tinted graphite glass (dark) / pearl glass (light) + blur 28 /
// saturate 190, a 0.5px light edge and a long plum shadow; ONE accent (Rosa)
// for "on"; the neutral `on` (near-white / near-black) for "selected but not
// active"; a lilac focus ring. OG keeps its identity (lime selection, violet
// rail, pink accent) on a near-white panel.
//
// Design values are verbatim EXCEPT the WCAG adjustments (measured in
// uiTokens.test.ts over white / black / mid-grey wallpapers and the theme
// page, because the dock is translucent; plan liquid-glass-plan.md §2):
//   dock/panel fill  dark .60 -> .85 (the design's own --glass-fill-strong
//                    family), light .66 -> .86 (= --glass-fill-strong): ink2/
//                    ink3 >= 4.5:1 over ANY wallpaper.
//   ink2  dark .68 -> .82, light .64 -> .72;  ink3 dark .42 -> .71, light
//                    .42 -> .64 (>= 4.5:1 on panel, well and well-hover).
//   switch off track: the design's well-press has ~1.5:1; it keeps an `edge`
//                    ring (>= 3:1), like the v3 open-row fix (F-B1).
// Second block of keys = derived values the DS does not spell out (edges,
// danger tints, picker chrome…), chosen in the same family and tested.
const LIGHT = {
  // panel = the dock's glass; field = the flat "well" inside it.
  panel: "rgba(253,251,253,0.86)", field: "rgba(40,10,40,0.05)", fieldHover: "rgba(40,10,40,0.08)",
  ink: "#141118", ink2: "rgba(20,17,24,0.72)", ink3: "rgba(20,17,24,0.64)",
  track: "rgba(40,10,40,0.05)", track2: "rgba(40,10,40,0.12)", fill: "#D42A70",
  sel: "#141118", selInk: "#FFFFFF", on: "#D42A70", knobOn: "#FFFFFF", edit: "#D42A70",
  rail: "rgba(253,251,253,0.86)", railInk: "rgba(20,17,24,0.72)", railSel: "#141118", railSelInk: "#FFFFFF",
  glass: "rgba(253,251,253,0.86)", glassInk: "#141118", glassInk2: "rgba(20,17,24,0.72)",
  glassEdge: "inset 0 0.5px 0 rgba(255,255,255,0.95), inset 0 0 0 0.5px rgba(40,10,40,0.08)", glassBtn: "rgba(40,10,40,0.05)",
  pop: "rgba(253,251,253,0.94)", popInk: "#141118",
  panelShadow: "inset 0 0.5px 0 rgba(255,255,255,0.95), inset 0 0 0 0.5px rgba(40,10,40,0.08), 0 1px 2px rgba(40,10,40,0.06), 0 28px 64px -18px rgba(60,20,60,0.28)",
  seg: "#141118", segInk: "#FFFFFF", segShadow: "0 2px 10px rgba(0,0,0,0.2)",
  n1: "#D42A70", n2: "#D42A70", n3: "#D42A70", n4: "#D42A70",
  // DS accent (Rosa) + its ink / tints (tiles, Publicar, slider, switch on).
  accent: "#D42A70", accentInk: "#FFFFFF", accentSoft: "rgba(212,42,112,0.12)", accentGlow: "rgba(212,42,112,0.35)",
  wellPress: "rgba(40,10,40,0.12)", success: "#1F9D5B", panelSolid: "#FBF9FB",
  // derived
  page: "#F3EFF4", fieldActive: "rgba(40,10,40,0.12)", inkDisabled: "rgba(20,17,24,0.32)",
  popSolid: "#FBF9FB", popShadow: "inset 0 0.5px 0 rgba(255,255,255,0.95), inset 0 0 0 0.5px rgba(40,10,40,0.08), 0 8px 24px -8px rgba(60,20,60,0.28)",
  scrollbar: "rgba(40,10,40,0.16)", line: "rgba(40,10,40,0.08)", lineStrong: "rgba(40,10,40,0.20)", lineField: "#77707B",
  primaryHover: "#2A2530", primaryActive: "#3A3440", trackHover: "rgba(40,10,40,0.08)",
  danger: "#B02A24", dangerTint: "rgba(176,42,36,0.10)", dangerTintActive: "rgba(217,58,49,0.16)", dangerLine: "rgba(217,58,49,0.35)",
  focus: "#6440F0", ring: "0 0 0 2px #FBF9FB, 0 0 0 4px #6440F0",
  // A boundary grey >= 3:1 on panel AND well (switch off ring, field edges).
  edge: "#77707B",
  thumbShadow: "0 1px 3px rgba(0,0,0,0.20)",
  wellBase: "#FFFFFF",
  checker: "conic-gradient(#D9D4DC 25%, #FFFFFF 0 50%, #D9D4DC 0 75%, #FFFFFF 0)",
  selEdge: "transparent",
};
type ThemePalette = { readonly [K in keyof typeof LIGHT]: string };

const DARK: ThemePalette = {
  panel: "rgba(19,17,24,0.85)", field: "rgba(255,255,255,0.07)", fieldHover: "rgba(255,255,255,0.11)",
  ink: "#F6F3F8", ink2: "rgba(238,232,244,0.82)", ink3: "rgba(238,232,244,0.71)",
  track: "rgba(255,255,255,0.07)", track2: "rgba(255,255,255,0.16)", fill: "#FF4F94",
  sel: "#F6F3F8", selInk: "#141118", on: "#FF4F94", knobOn: "#FFFFFF", edit: "#FF4F94",
  rail: "rgba(19,17,24,0.85)", railInk: "rgba(238,232,244,0.82)", railSel: "#F6F3F8", railSelInk: "#141118",
  glass: "rgba(19,17,24,0.85)", glassInk: "#F6F3F8", glassInk2: "rgba(238,232,244,0.82)",
  glassEdge: "inset 0 0.5px 0 rgba(255,255,255,0.22), inset 0 0 0 0.5px rgba(255,255,255,0.10)", glassBtn: "rgba(255,255,255,0.07)",
  pop: "rgba(19,17,24,0.92)", popInk: "#F6F3F8",
  panelShadow: "inset 0 0.5px 0 rgba(255,255,255,0.22), inset 0 0 0 0.5px rgba(255,255,255,0.10), 0 1px 2px rgba(8,4,12,0.30), 0 28px 64px -16px rgba(8,4,12,0.55)",
  seg: "#F6F3F8", segInk: "#141118", segShadow: "0 2px 10px rgba(0,0,0,0.2)",
  n1: "#FF4F94", n2: "#FF4F94", n3: "#FF4F94", n4: "#FF4F94",
  accent: "#FF4F94", accentInk: "#1C0712", accentSoft: "rgba(255,79,148,0.18)", accentGlow: "rgba(255,79,148,0.50)",
  wellPress: "rgba(255,255,255,0.16)", success: "#5BE49B", panelSolid: "#17151C",
  // derived
  page: "#0E0C12", fieldActive: "rgba(255,255,255,0.16)", inkDisabled: "rgba(238,232,244,0.32)",
  popSolid: "#17151C", popShadow: "inset 0 0.5px 0 rgba(255,255,255,0.22), inset 0 0 0 0.5px rgba(255,255,255,0.10), 0 12px 32px rgba(8,4,12,0.5)",
  scrollbar: "rgba(255,255,255,0.14)", line: "rgba(255,255,255,0.09)", lineStrong: "rgba(255,255,255,0.20)", lineField: "#9A93A2",
  primaryHover: "#FFFFFF", primaryActive: "#DCD6E2", trackHover: "rgba(255,255,255,0.11)",
  danger: "#FF8079", dangerTint: "rgba(255,95,87,0.16)", dangerTintActive: "rgba(255,95,87,0.22)", dangerLine: "rgba(255,95,87,0.35)",
  focus: "#B9A2FF", ring: "0 0 0 2px #17151C, 0 0 0 4px #B9A2FF",
  edge: "#9A93A2",
  // The white thumb is 15:1 on the dark glass: no ring needed.
  thumbShadow: "0 1px 3px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(0,0,0,0.2)",
  wellBase: "#2C2733",
  checker: "conic-gradient(#3A3440 25%, #24202A 0 50%, #3A3440 0 75%, #24202A 0)",
  selEdge: "transparent",
};

// OG: the light pearl glass, nearly opaque (OG was the flat white editor),
// with its own identity: lime selection, violet rail, pink accent.
const OG: ThemePalette = {
  ...LIGHT,
  panel: "rgba(255,255,255,0.94)", panelSolid: "#FFFFFF", page: "#F4F4F5", popSolid: "#FFFFFF", pop: "rgba(255,255,255,0.96)",
  sel: "#C6F432", selInk: "#0B0B0C", selEdge: "#0B0B0C",
  on: "#D6246E", fill: "#D6246E", edit: "#D6246E", knobOn: "#FFFFFF",
  accent: "#D6246E", accentInk: "#FFFFFF", accentSoft: "rgba(214,36,110,0.12)", accentGlow: "rgba(214,36,110,0.35)",
  n1: "#D6246E", n2: "#D6246E", n3: "#D6246E", n4: "#D6246E",
  rail: "#6B4EFF", railInk: "rgba(255,255,255,0.86)", railSel: "#C6F432", railSelInk: "#0B0B0C",
  glass: "rgba(16,16,18,0.80)", glassInk: "#FFFFFF", glassInk2: "rgba(255,255,255,0.84)",
  glassEdge: "inset 0 0.5px 0 rgba(255,255,255,0.14), inset 0 0 0 0.5px rgba(255,255,255,0.08)", glassBtn: "rgba(255,255,255,0.10)",
  seg: "#0B0B0C", segInk: "#FFFFFF", segShadow: "none",
  ring: "0 0 0 2px #FFFFFF, 0 0 0 4px #6440F0",
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
  // Liquid glass: Geist does the work (title 19/650, DS tokens/typography.css).
  titleFont: UI_FONT.sans, titleSize: "19px", titleWeight: "650",
  headingFont: UI_FONT.sans, headingWeight: "600",
};
type ThemeType = { readonly [K in keyof typeof TYPE_BASE]: string };
const TYPE_OG: ThemeType = { ...TYPE_BASE, titleFont: UI_FONT.display, titleSize: "21px", titleWeight: "750", headingFont: UI_FONT.display, headingWeight: "650" };

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
      /** Panel under prefers-reduced-transparency / forced colors: the
       * glass' solid fill (DS --glass-fill-solid). */
      panelOpaque: th("panelSolid"),
      /** Liquid glass "well" press state (DS --glass-well-press). */
      controlPress: th("wellPress"),
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
      /** Phase F: selected object chip outline (OG lime needs ink, >= 3:1). */
      selEdge: th("selEdge"),
    },
    accent: {
      /** Primary button / selected-but-not-active (DS --glass-on). */
      on:     th("sel"),
      onHover: th("primaryHover"),
      onActive: th("primaryActive"),
      onInk:  th("selInk"),
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
      /** Liquid glass: Publicar is the accent (DS .lg-pill--brand) — the
       * theme's Rosa with its ink (>= 4.5:1, tested). */
      brand:    th("accent"),
      brandInk: th("accentInk"),
      /** The ONE accent (DS --glass-accent): tiles on, switches, slider,
       * modified dot, canvas selection. */
      main:     th("accent"),
      ink:      th("accentInk"),
      soft:     th("accentSoft"),
      glow:     th("accentGlow"),
      success:  th("success"),
    },
    /** Section number tones 01–04 (MenuSection `tone`). */
    tone: { n1: th("n1"), n2: th("n2"), n3: th("n3"), n4: th("n4") },
    /** Editor v3 Phase D: the editor shell — the tool rail and the glass
     * editor topbar (design --t-rail* / --t-glass*). Themed. */
    shell: {
      rail: th("rail"), railInk: th("railInk"), railSel: th("railSel"), railSelInk: th("railSelInk"),
      glass: th("glass"), glassInk: th("glassInk"), glassInk2: th("glassInk2"), glassBtn: th("glassBtn"),
      /** A box-shadow (the glass bottom hairline). */
      glassEdge: th("glassEdge"),
    },
    /** Liquid glass material (DS --glass-blur): the floating layer only —
     * dock, rail, topbar, menus, toasts; never glass on glass. */
    material: { blur: "blur(28px) saturate(190%)" },
    /** Editor font stacks as variables (--ui-font-sans …) for editor.css. */
    font: UI_FONT,
    opacity: { disabled: 0.38 },
    // Liquid glass (DS tokens/glass.css + spacing.css): continuous, generous
    // radii — 10 menu item, 16 control / field, 20 tile, 22 popover, 30
    // panel, capsules (999) everywhere else.
    radius: { panel: 30, group: 20, control: 16, segment: 999, chip: 999, field: 16, pill: 999, button: 999, segTrack: 999, segThumb: 999,
      /** Bottom sheet's top corners (= the panel radius). */
      sheet: 30,
      /** Part picker buttons (round). */
      objChip: 999,
      /** The floating dock (DS --glass-radius-panel). */
      dock: 30,
      /** Tiles and inline detail wells (DS --glass-radius-tile). */
      tile: 20,
      /** Popovers (DS .lg-pop). */
      popover: 22,
      /** Menu items (DS .lg-menu__item). */
      item: 10,
      /** Accordion cards of the dock. */
      card: 22 },
    size:   {
      panelPad: 14, row: 44, control: 44, swatch: 32, icon: 17,
      /** The floating dock (DS --glass-w-dock), `dockMargin` from the edges
       * (DS --glass-gap-edge). */
      inspectorW: 344,
      dockMargin: 16,
      /** The tool rail (left) and the editor topbar. The topbar OVERLAYS the
       * canvas (glass): CANVAS_TOP_OFFSET stays 44 (R1). */
      railW: 64,
      editorTopbarH: 60,
      /** Part picker button (DS --glass-h-part). */
      objChip: 44,
      /** DS controls: switch 51x31 / knob 27, buttons 36, tiles 92, hit 44. */
      switchW: 51, switchH: 31, knob: 27, thumb: 18, button: 36, tileH: 92, touch: 44,
    },
    /** Below this viewport width the inspector stops docking and becomes a
     * bottom sheet (Editor v3 Phase B) and the rail hides (design screen 10
     * has none). The design says "under ~900px"; the value comes from the rule
     * that the widest ProfileCard fits between the rail and the dock — see
     * uiTokens.test.ts (railW + 16 + maxW 640 + 16 + inspectorW + dockMargin).
     * Liquid glass: 64 + 16 + 640 + 16 + 344 + 16 = 1096 (kept at 1108). */
    breakpoint: { inspectorSheet: 1108 },
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
      /** Editor v3 Phase H: the selection violet (design: frame + part
       * outline) — the active part's dashed outline on the card and the dot
       * of the "Editando …" pill. Fixed, like all chrome. */
      partMark:    "#6B4EFF",
      /** Under the dashed part outline (offset 4): dark 0–2.5px + light
       * 2.5–4px — ≥ 3:1 against any card / wallpaper (review H-V M1). */
      partRing:    "0 0 0 2.5px rgba(10,10,12,0.75), 0 0 0 4px rgba(255,255,255,0.85)",
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
    heading: { fontFamily: thType("headingFont"), fontSize: 14, lineHeight: "18px", fontWeight: thType("headingWeight"), letterSpacing: "-0.01em" },
    // Liquid glass (DS tokens/typography.css): body 15, control 14/550,
    // label 13/600, caption 12; numbers in Geist Mono 13.
    label:   { fontFamily: UI_FONT.sans, fontSize: 14, lineHeight: "18px", fontWeight: 500 },
    control: { fontFamily: UI_FONT.sans, fontSize: 14, lineHeight: "18px", fontWeight: 550 },
    help:    { fontFamily: UI_FONT.sans, fontSize: 12, lineHeight: "16px", fontWeight: 450 },
    /** Segmented / tab labels = the DS "control" role (lg-tabs__btn 13/550). */
    tab:     { fontFamily: UI_FONT.sans, fontSize: 13, lineHeight: "18px", fontWeight: 550 },
    /** Field / group label (DS .lg-label): Geist 13/600 in ink2. */
    section: { fontFamily: UI_FONT.sans, fontSize: 13, lineHeight: "18px", fontWeight: 600 },
    eyebrow: { fontFamily: UI_FONT.sans, fontSize: 11, lineHeight: "14px", fontWeight: 600 },
    value:   { fontFamily: UI_FONT.mono, fontSize: 13, lineHeight: "16px", fontWeight: 500, fontVariantNumeric: "tabular-nums" },
    kbd:     { fontFamily: UI_FONT.mono, fontSize: 11, lineHeight: "14px", fontWeight: 450 },
    accent:  { fontFamily: UI_FONT.serif, fontSize: 22, lineHeight: 1.1, fontWeight: 400, fontStyle: "italic" },
  },

  // Liquid glass (DS tokens/motion.css): springs for anything you touch,
  // ease-out for content swaps; reduced motion = instant (editor.css).
  motion: { fast: 120, base: 180, panel: 220, segment: 240, ease: "cubic-bezier(0.25,1,0.5,1)", spring: "cubic-bezier(0.34,1.56,0.64,1)", switch: 420,
    springSoft: "cubic-bezier(0.22,1.2,0.36,1)", tap: 160, swap: 260, panelIn: 420, toast: 2400 },
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
