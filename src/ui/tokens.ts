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
} as const;
