// @ts-nocheck — ported verbatim from the MYLAND design system bundle
// (design-import/landing-auth/_ds/…/_ds_bundle.js: components/core/Icon.jsx and
// components/glass/GlassPanel.jsx). Only change: the Lucide glyphs are inlined
// (lucide-static 0.460.0, ISC) instead of fetched from unpkg at runtime.
"use client";
import React from "react";

// The editor's own icon set, copied path-for-path from src/ui/icons/index.tsx:
// 16px grid, 1.5 stroke, round caps/joins, currentColor.
const PATHS = {
  close: /*#__PURE__*/React.createElement("path", {
    d: "M4 4l8 8M12 4l-8 8"
  }),
  plus: /*#__PURE__*/React.createElement("path", {
    d: "M8 3.5v9M3.5 8h9"
  }),
  minus: /*#__PURE__*/React.createElement("path", {
    d: "M3.5 8h9"
  }),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M3.5 8.5l3 3 6-7"
  }),
  pencil: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.5 3.5l2 2L6 12H4v-2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 5l2 2"
  })),
  "chevron-down": /*#__PURE__*/React.createElement("path", {
    d: "M4 6l4 4 4-4"
  }),
  "chevron-right": /*#__PURE__*/React.createElement("path", {
    d: "M6 4l4 4-4 4"
  }),
  "chevron-up": /*#__PURE__*/React.createElement("path", {
    d: "M4 10l4-4 4 4"
  }),
  "chevron-left": /*#__PURE__*/React.createElement("path", {
    d: "M10 4l-4 4 4 4"
  }),
  reset: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3.5 8a4.5 4.5 0 1 0 1.4-3.3L3.5 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.5 2.5v2.5H6"
  })),
  eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "2"
  })),
  "eye-off": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6.6 3.7A6.4 6.4 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a11 11 0 0 1-1.7 2.2M4.3 4.9C2.6 6.1 1.5 8 1.5 8S4 12.5 8 12.5c1.1 0 2.1-.3 3-.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 2l12 12"
  })),
  trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 4.5h11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 4.5V3h4v1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 4.5l.7 8.5h6.6l.7-8.5"
  })),
  upload: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 10V3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 5.5L8 2.5l3 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10.5v2h10v-2"
  })),
  link: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.7.7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.7-.7"
  })),
  more: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "3.5",
    cy: "8",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12.5",
    cy: "8",
    r: "0.75"
  })),
  lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "7",
    width: "9",
    height: "6.5",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
  })),
  unlock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3.5",
    y: "7",
    width: "9",
    height: "6.5",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.5 7V5a2.5 2.5 0 0 1 4.8-1"
  })),
  rotate: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12.5 8a4.5 4.5 0 1 1-1.3-3.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12.5 2.5v3h-3"
  })),
  pointer: /*#__PURE__*/React.createElement("path", {
    d: "M4 2.5l8.5 5.5-3.8.9L11 13l-1.6.8-2.2-4.1L4.5 12z"
  }),
  layers: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 2.5l5.5 3L8 8.5l-5.5-3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 8.5L8 11.5l5.5-3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 11.2L8 14.2l5.5-3"
  })),
  undo: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5.5 4L2.5 7l3 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 7h7.5a3 3 0 0 1 0 6H7"
  })),
  redo: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.5 4l3 3-3 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.5 7H6a3 3 0 0 0 0 6h3"
  })),
  room: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 7.5L8 3l5.5 4.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 6.5v7h8v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 13.5v-3.5h3v3.5"
  })),
  grip: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "4",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "4",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "8",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "8",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "12",
    r: "0.75"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "12",
    r: "0.75"
  })),
  "align-left": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 4h11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 8h7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2.5 12h9"
  })),
  "align-center": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 4h11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4.5 8h7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.5 12h9"
  })),
  "align-right": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 4h11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 8h7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4.5 12h9"
  }))
};

// SUBSTITUTION (flagged in readme): glyphs the repo set does not have come
// from Lucide (lucide-static on unpkg), fetched once and inlined (currentColor).
const LUCIDE = {
  text: "type",
  image: "image",
  music: "music",
  copy: "copy",
  sparkles: "sparkles",
  palette: "palette",
  search: "search",
  star: "star",
  play: "play",
  pause: "pause",
  "bring-front": "bring-to-front",
  "send-back": "send-to-back",
  "arrow-up": "arrow-up",
  "arrow-down": "arrow-down",
  sliders: "sliders-horizontal",
  card: "contact",
  pipette: "pipette",
  "case": "case-upper",
  sun: "sun",
  moon: "moon",
  share: "share",
  bell: "bell",
  user: "user",
  pin: "map-pin",
  at: "at-sign",
  quote: "quote",
  shapes: "shapes",
  wand: "wand-sparkles",
  scissors: "scissors",
  clipboard: "clipboard",
  maximize: "maximize-2",
  move: "move",
  frame: "frame",
  globe: "globe",
  gift: "gift",
  disc: "disc-3",
  volume: "volume-2",
  corner: "square-round-corner",
  blend: "blend",
  "skip-back": "skip-back",
  "skip-forward": "skip-forward",
  spacing: "move-horizontal",
  height: "move-vertical"
};
const LUCIDE_SVG: Record<string, string> = {
"arrow-down": "<svg\n  class=\"lucide lucide-arrow-down\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M12 5v14\" />\n  <path d=\"m19 12-7 7-7-7\" />\n</svg>",
"arrow-right": "<svg\n  class=\"lucide lucide-arrow-right\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M5 12h14\" />\n  <path d=\"m12 5 7 7-7 7\" />\n</svg>",
"arrow-up": "<svg\n  class=\"lucide lucide-arrow-up\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m5 12 7-7 7 7\" />\n  <path d=\"M12 19V5\" />\n</svg>",
"arrow-up-right": "<svg\n  class=\"lucide lucide-arrow-up-right\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M7 7h10v10\" />\n  <path d=\"M7 17 17 7\" />\n</svg>",
"at-sign": "<svg\n  class=\"lucide lucide-at-sign\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"12\" cy=\"12\" r=\"4\" />\n  <path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8\" />\n</svg>",
"bell": "<svg\n  class=\"lucide lucide-bell\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" />\n  <path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />\n</svg>",
"blend": "<svg\n  class=\"lucide lucide-blend\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"9\" cy=\"9\" r=\"7\" />\n  <circle cx=\"15\" cy=\"15\" r=\"7\" />\n</svg>",
"bring-to-front": "<svg\n  class=\"lucide lucide-bring-to-front\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect x=\"8\" y=\"8\" width=\"8\" height=\"8\" rx=\"2\" />\n  <path d=\"M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2\" />\n  <path d=\"M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2\" />\n</svg>",
"case-upper": "<svg\n  class=\"lucide lucide-case-upper\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m3 15 4-8 4 8\" />\n  <path d=\"M4 13h6\" />\n  <path d=\"M15 11h4.5a2 2 0 0 1 0 4H15V7h4a2 2 0 0 1 0 4\" />\n</svg>",
"check": "<svg\n  class=\"lucide lucide-check\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M20 6 9 17l-5-5\" />\n</svg>",
"clipboard": "<svg\n  class=\"lucide lucide-clipboard\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" />\n  <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" />\n</svg>",
"contact": "<svg\n  class=\"lucide lucide-contact\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M16 2v2\" />\n  <path d=\"M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2\" />\n  <path d=\"M8 2v2\" />\n  <circle cx=\"12\" cy=\"11\" r=\"3\" />\n  <rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\" />\n</svg>",
"copy": "<svg\n  class=\"lucide lucide-copy\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" />\n  <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />\n</svg>",
"disc-3": "<svg\n  class=\"lucide lucide-disc-3\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M6 12c0-1.7.7-3.2 1.8-4.2\" />\n  <circle cx=\"12\" cy=\"12\" r=\"2\" />\n  <path d=\"M18 12c0 1.7-.7 3.2-1.8 4.2\" />\n</svg>",
"eye": "<svg\n  class=\"lucide lucide-eye\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" />\n  <circle cx=\"12\" cy=\"12\" r=\"3\" />\n</svg>",
"eye-off": "<svg\n  class=\"lucide lucide-eye-off\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" />\n  <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" />\n  <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" />\n  <path d=\"m2 2 20 20\" />\n</svg>",
"frame": "<svg\n  class=\"lucide lucide-frame\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <line x1=\"22\" x2=\"2\" y1=\"6\" y2=\"6\" />\n  <line x1=\"22\" x2=\"2\" y1=\"18\" y2=\"18\" />\n  <line x1=\"6\" x2=\"6\" y1=\"2\" y2=\"22\" />\n  <line x1=\"18\" x2=\"18\" y1=\"2\" y2=\"22\" />\n</svg>",
"gift": "<svg\n  class=\"lucide lucide-gift\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\" />\n  <path d=\"M12 8v13\" />\n  <path d=\"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7\" />\n  <path d=\"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5\" />\n</svg>",
"globe": "<svg\n  class=\"lucide lucide-globe\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"12\" cy=\"12\" r=\"10\" />\n  <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" />\n  <path d=\"M2 12h20\" />\n</svg>",
"image": "<svg\n  class=\"lucide lucide-image\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" />\n  <circle cx=\"9\" cy=\"9\" r=\"2\" />\n  <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />\n</svg>",
"mail": "<svg\n  class=\"lucide lucide-mail\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" />\n  <path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\" />\n</svg>",
"map-pin": "<svg\n  class=\"lucide lucide-map-pin\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" />\n  <circle cx=\"12\" cy=\"10\" r=\"3\" />\n</svg>",
"maximize-2": "<svg\n  class=\"lucide lucide-maximize-2\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <polyline points=\"15 3 21 3 21 9\" />\n  <polyline points=\"9 21 3 21 3 15\" />\n  <line x1=\"21\" x2=\"14\" y1=\"3\" y2=\"10\" />\n  <line x1=\"3\" x2=\"10\" y1=\"21\" y2=\"14\" />\n</svg>",
"moon": "<svg\n  class=\"lucide lucide-moon\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\" />\n</svg>",
"move": "<svg\n  class=\"lucide lucide-move\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M12 2v20\" />\n  <path d=\"m15 19-3 3-3-3\" />\n  <path d=\"m19 9 3 3-3 3\" />\n  <path d=\"M2 12h20\" />\n  <path d=\"m5 9-3 3 3 3\" />\n  <path d=\"m9 5 3-3 3 3\" />\n</svg>",
"move-horizontal": "<svg\n  class=\"lucide lucide-move-horizontal\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m18 8 4 4-4 4\" />\n  <path d=\"M2 12h20\" />\n  <path d=\"m6 8-4 4 4 4\" />\n</svg>",
"move-vertical": "<svg\n  class=\"lucide lucide-move-vertical\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M12 2v20\" />\n  <path d=\"m8 18 4 4 4-4\" />\n  <path d=\"m8 6 4-4 4 4\" />\n</svg>",
"music": "<svg\n  class=\"lucide lucide-music\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M9 18V5l12-2v13\" />\n  <circle cx=\"6\" cy=\"18\" r=\"3\" />\n  <circle cx=\"18\" cy=\"16\" r=\"3\" />\n</svg>",
"palette": "<svg\n  class=\"lucide lucide-palette\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" />\n  <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" />\n  <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />\n  <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" />\n  <path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\" />\n</svg>",
"pause": "<svg\n  class=\"lucide lucide-pause\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\" />\n  <rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\" />\n</svg>",
"pipette": "<svg\n  class=\"lucide lucide-pipette\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m2 22 1-1h3l9-9\" />\n  <path d=\"M3 21v-3l9-9\" />\n  <path d=\"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z\" />\n</svg>",
"play": "<svg\n  class=\"lucide lucide-play\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <polygon points=\"6 3 20 12 6 21 6 3\" />\n</svg>",
"quote": "<svg\n  class=\"lucide lucide-quote\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\" />\n  <path d=\"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\" />\n</svg>",
"scissors": "<svg\n  class=\"lucide lucide-scissors\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"6\" cy=\"6\" r=\"3\" />\n  <path d=\"M8.12 8.12 12 12\" />\n  <path d=\"M20 4 8.12 15.88\" />\n  <circle cx=\"6\" cy=\"18\" r=\"3\" />\n  <path d=\"M14.8 14.8 20 20\" />\n</svg>",
"search": "<svg\n  class=\"lucide lucide-search\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"11\" cy=\"11\" r=\"8\" />\n  <path d=\"m21 21-4.3-4.3\" />\n</svg>",
"send-to-back": "<svg\n  class=\"lucide lucide-send-to-back\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <rect x=\"14\" y=\"14\" width=\"8\" height=\"8\" rx=\"2\" />\n  <rect x=\"2\" y=\"2\" width=\"8\" height=\"8\" rx=\"2\" />\n  <path d=\"M7 14v1a2 2 0 0 0 2 2h1\" />\n  <path d=\"M14 7h1a2 2 0 0 1 2 2v1\" />\n</svg>",
"shapes": "<svg\n  class=\"lucide lucide-shapes\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z\" />\n  <rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\" />\n  <circle cx=\"17.5\" cy=\"17.5\" r=\"3.5\" />\n</svg>",
"share": "<svg\n  class=\"lucide lucide-share\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\" />\n  <polyline points=\"16 6 12 2 8 6\" />\n  <line x1=\"12\" x2=\"12\" y1=\"2\" y2=\"15\" />\n</svg>",
"skip-back": "<svg\n  class=\"lucide lucide-skip-back\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <polygon points=\"19 20 9 12 19 4 19 20\" />\n  <line x1=\"5\" x2=\"5\" y1=\"19\" y2=\"5\" />\n</svg>",
"skip-forward": "<svg\n  class=\"lucide lucide-skip-forward\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <polygon points=\"5 4 15 12 5 20 5 4\" />\n  <line x1=\"19\" x2=\"19\" y1=\"5\" y2=\"19\" />\n</svg>",
"sliders-horizontal": "<svg\n  class=\"lucide lucide-sliders-horizontal\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" />\n  <line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" />\n  <line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" />\n  <line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" />\n  <line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" />\n  <line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" />\n  <line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" />\n  <line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" />\n  <line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />\n</svg>",
"sparkles": "<svg\n  class=\"lucide lucide-sparkles\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" />\n  <path d=\"M20 3v4\" />\n  <path d=\"M22 5h-4\" />\n  <path d=\"M4 17v2\" />\n  <path d=\"M5 18H3\" />\n</svg>",
"star": "<svg\n  class=\"lucide lucide-star\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />\n</svg>",
"sun": "<svg\n  class=\"lucide lucide-sun\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <circle cx=\"12\" cy=\"12\" r=\"4\" />\n  <path d=\"M12 2v2\" />\n  <path d=\"M12 20v2\" />\n  <path d=\"m4.93 4.93 1.41 1.41\" />\n  <path d=\"m17.66 17.66 1.41 1.41\" />\n  <path d=\"M2 12h2\" />\n  <path d=\"M20 12h2\" />\n  <path d=\"m6.34 17.66-1.41 1.41\" />\n  <path d=\"m19.07 4.93-1.41 1.41\" />\n</svg>",
"type": "<svg\n  class=\"lucide lucide-type\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <polyline points=\"4 7 4 4 20 4 20 7\" />\n  <line x1=\"9\" x2=\"15\" y1=\"20\" y2=\"20\" />\n  <line x1=\"12\" x2=\"12\" y1=\"4\" y2=\"20\" />\n</svg>",
"user": "<svg\n  class=\"lucide lucide-user\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" />\n  <circle cx=\"12\" cy=\"7\" r=\"4\" />\n</svg>",
"volume-2": "<svg\n  class=\"lucide lucide-volume-2\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\" />\n  <path d=\"M16 9a5 5 0 0 1 0 6\" />\n  <path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\" />\n</svg>",
"wand-sparkles": "<svg\n  class=\"lucide lucide-wand-sparkles\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\" />\n  <path d=\"m14 7 3 3\" />\n  <path d=\"M5 6v4\" />\n  <path d=\"M19 14v4\" />\n  <path d=\"M10 2v2\" />\n  <path d=\"M7 8H3\" />\n  <path d=\"M21 16h-4\" />\n  <path d=\"M11 3H9\" />\n</svg>",
"x": "<svg\n  class=\"lucide lucide-x\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n  <path d=\"M18 6 6 18\" />\n  <path d=\"m6 6 12 12\" />\n</svg>"
};
const ICON_NAMES = [...Object.keys(PATHS), ...Object.keys(LUCIDE)];
function loadLucide(file) {
  return Promise.resolve(LUCIDE_SVG[file] || "");
}
function LucideIcon({
  file,
  size,
  style,
  title
}) {
  const svg0 = (LUCIDE_SVG[file] || "").replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`).replace(/stroke-width="2"/, `stroke-width="${1.5 * 24 / size}"`).replace(/class="[^"]*"/, "");
  const [svg, setSvg] = React.useState(svg0);
  React.useEffect(() => {
    let live = true;
    loadLucide(file).then(t => {
      if (live) setSvg(t.replace(/<!--[\s\S]*?-->/g, "").replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`).replace(/stroke-width="2"/, `stroke-width="${1.5 * 24 / size}"`).replace(/class="[^"]*"/, ""));
    });
    return () => {
      live = false;
    };
  }, [file, size]);
  return /*#__PURE__*/React.createElement("span", {
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    style: {
      display: "block",
      flexShrink: 0,
      width: size,
      height: size,
      lineHeight: 0,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: svg
    }
  });
}
function Icon({
  name,
  size = 16,
  style,
  title
}) {
  if (PATHS[name]) {
    return /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5 * 16 / size,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": title ? undefined : true,
      role: title ? "img" : undefined,
      focusable: "false",
      style: {
        display: "block",
        flexShrink: 0,
        ...style
      }
    }, title && /*#__PURE__*/React.createElement("title", null, title), PATHS[name]);
  }
  return /*#__PURE__*/React.createElement(LucideIcon, {
    file: LUCIDE[name] || name,
    size: size,
    style: style,
    title: title
  });
}


function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} = React;
// MYLAND Liquid glass primitives. Icon-first, direct manipulation, one material
// (glass) on the floating layer only — inner controls are flat wells.
function GlassPanel({
  children,
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass lg-panel " + className,
    style: style
  }, children);
}
function GlassButton({
  icon,
  tip,
  tipSide,
  onClick,
  pressed,
  filled,
  tone,
  size = 36,
  iconSize = 17,
  disabled,
  children,
  accent
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: tip ? "lg-btn lg-tip" : "lg-btn",
    "data-tip": tip,
    "data-tip-side": tipSide,
    "aria-label": tip,
    "aria-pressed": pressed,
    "data-filled": filled || undefined,
    "data-tone": tone,
    "data-accent": accent || undefined,
    "aria-disabled": disabled || undefined,
    onMouseDown: e => e.stopPropagation(),
    onClick: e => {
      e.stopPropagation();
      onClick && onClick(e);
    },
    style: {
      width: children ? "auto" : size,
      height: size,
      padding: children ? "0 12px" : 0,
      gap: 6,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: iconSize
  }), children);
}

// The whole capsule is the control: drag anywhere (relative), tap to jump,
// double-click resets, arrows step. Rubber-bands past the ends; the value
// pops on every step.
function LiquidSlider({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  fmt,
  onChange,
  defaultValue,
  disabled
}) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [over, setOver] = useState(0);
  const p = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const show = fmt ? fmt(value) : String(Math.round(value));
  const dec = (String(step).split(".")[1] || "").length;
  const set = v => onChange && onChange(Number(Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min)).toFixed(dec)));
  const at = e => {
    const r = ref.current.getBoundingClientRect(),
      raw = (e.clientX - r.left) / r.width;
    setOver(raw < 0 ? Math.max(-1, raw * 2.5) : raw > 1 ? Math.min(1, (raw - 1) * 2.5) : 0);
    set(min + Math.max(0, Math.min(1, raw)) * (max - min));
  };
  const end = () => {
    setActive(false);
    setOver(0);
  };
  const stretch = 1 + Math.abs(over) * 0.045;
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    role: "slider",
    tabIndex: 0,
    "aria-label": label,
    "aria-valuenow": value,
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-valuetext": show,
    "aria-disabled": disabled || undefined,
    className: "lg-slider",
    "data-active": active || undefined,
    "data-edge": p <= 0 ? "min" : p >= 1 ? "max" : undefined,
    onPointerDown: e => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setActive(true);
      at(e);
    },
    onPointerMove: e => {
      if (active) at(e);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onDoubleClick: () => defaultValue !== undefined && set(defaultValue),
    onKeyDown: e => {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        set(value + step * (e.shiftKey ? 10 : 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        set(value - step * (e.shiftKey ? 10 : 1));
      }
    },
    style: {
      transform: `scale(${active ? 1.02 : 1}) scaleX(${stretch})`,
      transformOrigin: over < 0 ? "right center" : over > 0 ? "left center" : "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg-slider__fill",
    style: {
      width: p * 100 + "%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg-slider__knob",
    style: {
      left: `calc(${p * 100}% + ${p < 0.02 ? 7 : p > 0.98 ? -7 : 0}px)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg-slider__row"
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17
  }), /*#__PURE__*/React.createElement("span", {
    className: "lg-slider__lbl"
  }, label), /*#__PURE__*/React.createElement("span", {
    key: show,
    className: "lg-slider__val"
  }, show)));
}

// Segmented capsule; the thumb slides on a spring and squashes a little in flight.
function IconTabs({
  tabs,
  value,
  onChange
}) {
  const i = Math.max(0, tabs.findIndex(t => t.id === value));
  const prev = useRef(i);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (prev.current !== i) {
      setMoving(true);
      const t = setTimeout(() => setMoving(false), 220);
      prev.current = i;
      return () => clearTimeout(t);
    }
  }, [i]);
  return /*#__PURE__*/React.createElement("div", {
    className: "lg-tabs",
    role: "tablist"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg-tabs__thumb",
    "data-moving": moving || undefined,
    style: {
      width: `calc((100% - 8px) / ${tabs.length})`,
      transform: `translateX(${i * 100}%)`
    }
  }), tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    role: "tab",
    "aria-selected": t.id === value,
    "aria-label": t.label || t.tip,
    title: t.tip,
    className: "lg-tabs__btn",
    onClick: () => onChange && onChange(t.id)
  }, t.icon && /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 15
  }), t.label)));
}

// Round part buttons with ONE indicator that glides between them.
function PartPicker({
  parts,
  value,
  onChange
}) {
  const box = useRef(null);
  const [ind, setInd] = useState(null);
  useLayoutEffect(() => {
    const el = box.current && box.current.querySelector(`[data-part="${value}"]`);
    if (!el) return setInd(null);
    setInd({
      x: el.offsetLeft,
      w: el.offsetWidth
    });
    const b = box.current,
      l = el.offsetLeft - 20,
      r = el.offsetLeft + el.offsetWidth + 20;
    if (l < b.scrollLeft) b.scrollTo({
      left: l,
      behavior: "smooth"
    });else if (r > b.scrollLeft + b.clientWidth) b.scrollTo({
      left: r - b.clientWidth,
      behavior: "smooth"
    });
  }, [value, parts.length]);
  return /*#__PURE__*/React.createElement("div", {
    ref: box,
    className: "lg-parts",
    role: "tablist"
  }, ind && /*#__PURE__*/React.createElement("span", {
    className: "lg-parts__ind",
    style: {
      transform: `translateX(${ind.x}px)`,
      width: ind.w
    }
  }), parts.map((p, i) => p === "sep" ? /*#__PURE__*/React.createElement("span", {
    key: "sep" + i,
    className: "lg-parts__sep"
  }) : /*#__PURE__*/React.createElement("button", {
    key: p.id,
    "data-part": p.id,
    type: "button",
    role: "tab",
    "aria-selected": p.id === value,
    "aria-label": p.label,
    "data-tip": p.label,
    "data-tip-side": "bottom",
    className: "lg-part lg-tip",
    onClick: () => onChange && onChange(p.id)
  }, p.thumb ? /*#__PURE__*/React.createElement("img", {
    src: p.thumb,
    alt: ""
  }) : p.swatch ? /*#__PURE__*/React.createElement("span", {
    className: "lg-part__sw",
    style: {
      background: p.swatch
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 18
  }), p.modified && /*#__PURE__*/React.createElement("span", {
    className: "lg-part__dot"
  }))));
}
function ColorRibbon({
  value,
  colors,
  onChange,
  onMore,
  moreOpen
}) {
  const n = c => (c || "").toLowerCase();
  const custom = !colors.map(n).includes(n(value));
  return /*#__PURE__*/React.createElement("div", {
    className: "lg-colors",
    role: "radiogroup",
    "aria-label": "Color"
  }, colors.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    type: "button",
    role: "radio",
    className: "lg-color",
    "aria-checked": n(c) === n(value),
    "aria-label": c,
    style: {
      background: c
    },
    onClick: () => onChange && onChange(c)
  })), onMore && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-color lg-color--more lg-tip",
    "data-tip": "M\xE1s colores",
    "aria-label": "M\xE1s colores",
    "aria-expanded": moreOpen,
    "aria-checked": custom,
    onClick: onMore
  }, custom && /*#__PURE__*/React.createElement("span", {
    className: "lg-color__cur",
    style: {
      background: value
    }
  })));
}
function LiquidSwitch({
  value,
  onChange,
  label
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": !!value,
    "aria-label": label,
    className: "lg-switch",
    onClick: e => {
      e.stopPropagation();
      onChange && onChange(!value);
    }
  });
}

// Control-Center tiles: tap = on/off (light sweeps from the touch point, icon pops);
// chevron = its controls, full width under the row (one open per grid).
function ControlTiles({
  tiles
}) {
  const [open, setOpen] = useState(null);
  const [ripple, setRipple] = useState(null);
  const out = [];
  const tap = (t, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({
      id: t.id,
      x: (e.clientX || r.left + r.width / 2) - r.left,
      y: (e.clientY || r.top + r.height / 2) - r.top,
      k: Date.now()
    });
    const v = !t.on;
    t.onToggle && t.onToggle(v);
    if (v && t.detail) setOpen(t.id);
    if (!v && open === t.id) setOpen(null);
  };
  tiles.forEach((t, i) => {
    out.push(/*#__PURE__*/React.createElement("div", {
      key: t.id,
      role: "switch",
      "aria-checked": !!t.on,
      "aria-label": t.label,
      tabIndex: 0,
      className: "lg-tile",
      "data-on": t.on || undefined,
      "data-open": open === t.id || undefined,
      onClick: e => tap(t, e),
      onKeyDown: e => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          tap(t, e);
        }
      }
    }, ripple && ripple.id === t.id && /*#__PURE__*/React.createElement("span", {
      key: ripple.k,
      className: "lg-tile__ripple",
      style: {
        left: ripple.x,
        top: ripple.y
      }
    }), /*#__PURE__*/React.createElement("span", {
      key: String(!!t.on),
      className: "lg-tile__ico"
    }, t.preview || /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("div", {
      className: "lg-tile__name"
    }, t.label), /*#__PURE__*/React.createElement("div", {
      className: "lg-tile__state"
    }, t.on ? t.state || "Activado" : "Desactivado")), t.detail && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "lg-tile__more",
      "aria-label": `Ajustes de ${t.label}`,
      "aria-expanded": open === t.id,
      onClick: e => {
        e.stopPropagation();
        setOpen(open === t.id ? null : t.id);
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 14
    }))));
    if (i % 2 === 1 || i === tiles.length - 1) {
      const row = tiles.slice(i - i % 2, i + 1).find(x => x.id === open);
      if (row) out.push(/*#__PURE__*/React.createElement("div", {
        key: row.id + "-d",
        className: "lg-detail"
      }, row.detail));
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "lg-tiles"
  }, out);
}
function GlassToolbar({
  items,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass lg-toolbar",
    style: style,
    onMouseDown: e => e.stopPropagation()
  }, items.map((it, i) => it === "sep" ? /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "lg-toolbar__sep"
  }) : /*#__PURE__*/React.createElement(GlassButton, _extends({
    key: i
  }, it, {
    size: it.children ? 36 : 38
  }))));
}

// Vertical tool rail: one indicator glides to the active tool.
function GlassRail({
  items,
  value,
  onSelect,
  style
}) {
  const i = items.findIndex(t => t.id === value);
  return /*#__PURE__*/React.createElement("nav", {
    className: "lg lg-glass lg-rail",
    "aria-label": "Herramientas",
    style: style
  }, i >= 0 && /*#__PURE__*/React.createElement("span", {
    className: "lg-rail__ind",
    style: {
      transform: `translateY(${i * 48}px)`
    }
  }), items.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    type: "button",
    className: "lg-rail__btn lg-tip",
    "data-tip": t.tip,
    "data-tip-side": "right",
    "aria-label": t.tip,
    "aria-pressed": t.id === value,
    onClick: () => onSelect && onSelect(t.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: t.icon,
    size: 19
  }))));
}

// HUD toast — confirms what just happened; optional inline action (Deshacer).
function GlassToast({
  toast,
  onAction
}) {
  if (!toast) return null;
  return /*#__PURE__*/React.createElement("div", {
    key: toast.k,
    className: "lg lg-glass lg-toast",
    role: "status"
  }, toast.icon && /*#__PURE__*/React.createElement("span", {
    className: "lg-toast__ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: toast.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("span", null, toast.text), toast.action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-toast__act",
    onClick: onAction
  }, toast.action));
}


export { Icon, LiquidSlider, IconTabs, ColorRibbon, ControlTiles, GlassToast };
