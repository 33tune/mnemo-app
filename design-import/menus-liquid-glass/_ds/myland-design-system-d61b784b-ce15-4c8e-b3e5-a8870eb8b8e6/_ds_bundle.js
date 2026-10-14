/* @ds-bundle: {"format":4,"namespace":"MYLANDDesignSystem_d61b78","components":[{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ColorPopover","sourcePath":"components/glass/ColorPopover.jsx"},{"name":"ContextMenu","sourcePath":"components/glass/ContextMenu.jsx"},{"name":"GOOGLE_CATALOG","sourcePath":"components/glass/FontSelect.jsx"},{"name":"FontSelect","sourcePath":"components/glass/FontSelect.jsx"},{"name":"GlassPanel","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"GlassButton","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"LiquidSlider","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"IconTabs","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"PartPicker","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"ColorRibbon","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"LiquidSwitch","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"ControlTiles","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"GlassToolbar","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"GlassRail","sourcePath":"components/glass/GlassPanel.jsx"},{"name":"GlassToast","sourcePath":"components/glass/GlassPanel.jsx"}],"sourceHashes":{"components/core/Icon.jsx":"6385708e52d2","components/glass/ColorPopover.jsx":"52b5eecb1aea","components/glass/ContextMenu.jsx":"3db9e3f47bc3","components/glass/FontSelect.jsx":"3b6e92c3d202","components/glass/GlassPanel.jsx":"879fad5b8de0","ui_kits/editor/App.jsx":"0fb9996cc12e","ui_kits/editor/Canvas.jsx":"f1d014f79a43","ui_kits/editor/Liquid.jsx":"c57f96d0732f","ui_kits/editor/ProfileCard.jsx":"f673a793298b","ui_kits/editor/data.jsx":"9e1d1f5328c3","ui_kits/editor/ds-loader.js":"83dc683dda2c"},"inlinedExternals":[],"unexposedExports":[{"name":"loadGoogleFont","sourcePath":"components/glass/FontSelect.jsx"},{"name":"useDismiss","sourcePath":"components/glass/ColorPopover.jsx"}]} */

(() => {

const __ds_ns = (window.MYLANDDesignSystem_d61b78 = window.MYLANDDesignSystem_d61b78 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
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
const LUCIDE_BASE = "https://unpkg.com/lucide-static@0.460.0/icons/";
const ICON_NAMES = [...Object.keys(PATHS), ...Object.keys(LUCIDE)];
const cache = {};
function loadLucide(file) {
  if (!cache[file]) cache[file] = fetch(LUCIDE_BASE + file + ".svg").then(r => r.ok ? r.text() : "").catch(() => "");
  return cache[file];
}
function LucideIcon({
  file,
  size,
  style,
  title
}) {
  const [svg, setSvg] = React.useState("");
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
Object.assign(__ds_scope, { ICON_NAMES, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/glass/ColorPopover.jsx
try { (() => {
const {
  useEffect,
  useRef,
  useState
} = React;
const hex2rgb = h => {
  h = (h || "#ffffff").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const rgb2hex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
const rgb2hsv = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) {
    h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
};
const hsv2rgb = (h, s, v) => {
  const f = n => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
};
function useDismiss(ref, onClose) {
  useEffect(() => {
    const down = e => {
      if (ref.current && !ref.current.contains(e.target)) onClose && onClose();
    };
    const key = e => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose && onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", down), 0);
    document.addEventListener("keydown", key, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key, true);
    };
  }, [onClose]);
}
function Drag({
  onMove,
  children,
  className,
  style,
  label
}) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const at = e => {
    const r = ref.current.getBoundingClientRect();
    onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    role: "slider",
    "aria-label": label,
    tabIndex: 0,
    className: className,
    "data-active": on || undefined,
    style: style,
    onPointerDown: e => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setOn(true);
      at(e);
    },
    onPointerMove: e => {
      if (e.buttons) at(e);
    },
    onPointerUp: () => setOn(false)
  }, children);
}

// Glass colour picker: SV field · hue · optional alpha · hex + eyedropper · "En tu tarjeta".
function ColorPopover({
  value,
  onChange,
  onClose,
  alpha,
  swatches,
  label,
  style
}) {
  const ref = useRef(null);
  useDismiss(ref, onClose);
  const [hsv, setHsv] = useState(() => rgb2hsv(...hex2rgb(value)));
  const [a, setA] = useState(1);
  const [draft, setDraft] = useState(null);
  const [h, s, v] = hsv;
  const hex = rgb2hex(...hsv2rgb(h, s, v));
  const emit = (h, s, v) => {
    setHsv([h, s, v]);
    onChange && onChange(rgb2hex(...hsv2rgb(h, s, v)));
  };
  const pick = c => {
    setHsv(rgb2hsv(...hex2rgb(c)));
    onChange && onChange(c.toUpperCase());
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "lg lg-glass lg-pop lg-cpop",
    role: "dialog",
    "aria-label": label ? `Color: ${label}` : "Color",
    onMouseDown: e => e.stopPropagation(),
    style: style
  }, /*#__PURE__*/React.createElement(Drag, {
    label: "Saturaci\xF3n y brillo",
    className: "lg-cpop__sv",
    onMove: (x, y) => emit(h, x, 1 - y),
    style: {
      background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${h} 100% 50%))`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-cpop__h",
    style: {
      left: s * 100 + "%",
      top: (1 - v) * 100 + "%",
      background: hex
    }
  })), /*#__PURE__*/React.createElement(Drag, {
    label: "Tono",
    className: "lg-cpop__bar",
    onMove: x => emit(x * 360, s, v),
    style: {
      background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-cpop__h",
    style: {
      left: h / 360 * 100 + "%",
      top: "50%",
      background: `hsl(${h} 100% 50%)`
    }
  })), alpha && /*#__PURE__*/React.createElement(Drag, {
    label: "Opacidad",
    className: "lg-cpop__bar lg-checker",
    onMove: x => setA(x),
    style: {
      backgroundImage: `linear-gradient(to right,transparent,${hex})`
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-cpop__h",
    style: {
      left: a * 100 + "%",
      top: "50%",
      background: hex
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-cpop__now",
    style: {
      background: hex
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "lg-input lg-cpop__hex",
    "aria-label": "Hex",
    value: draft ?? hex,
    spellCheck: false,
    onFocus: e => {
      setDraft(hex);
      e.currentTarget.select();
    },
    onChange: e => setDraft(e.target.value),
    onBlur: () => {
      if (/^#?[0-9a-f]{6}$/i.test(draft || "")) pick(draft[0] === "#" ? draft : "#" + draft);
      setDraft(null);
    },
    onKeyDown: e => {
      if (e.key === "Enter") e.currentTarget.blur();
    }
  }), alpha && /*#__PURE__*/React.createElement("span", {
    className: "lg-cpop__pct"
  }, Math.round(a * 100), "%"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-btn lg-tip",
    "data-tip": "Cuentagotas",
    "aria-label": "Cuentagotas",
    style: {
      width: 36,
      height: 36
    },
    onClick: async () => {
      if (window.EyeDropper) {
        try {
          const r = await new window.EyeDropper().open();
          pick(r.sRGBHex);
        } catch (e) {}
      }
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "pipette",
    size: 16
  }))), swatches && swatches.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-label"
  }, "En tu tarjeta"), /*#__PURE__*/React.createElement("div", {
    className: "lg-colors",
    style: {
      gap: 8
    }
  }, swatches.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    type: "button",
    className: "lg-color",
    "aria-checked": c.toUpperCase() === hex,
    "aria-label": c,
    style: {
      background: c,
      width: 26,
      height: 26
    },
    onClick: () => pick(c)
  })))));
}
Object.assign(__ds_scope, { useDismiss, ColorPopover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/ColorPopover.jsx", error: String((e && e.message) || e) }); }

// components/glass/ContextMenu.jsx
try { (() => {
const {
  useRef,
  useState
} = React;
// Right-click / "⋯" menu. Optional quick-action row of round icons on top
// (the 3–4 things you do most), then the full list with shortcuts. Items cascade in.
function ContextMenu({
  items,
  quick,
  x = 0,
  y = 0,
  onClose,
  title,
  style
}) {
  const ref = useRef(null);
  __ds_scope.useDismiss(ref, onClose);
  const [hi, setHi] = useState(-1);
  const real = items.map((it, i) => it === "sep" || it.disabled ? null : i).filter(i => i !== null);
  const run = it => {
    if (it.disabled) return;
    it.onSelect && it.onSelect();
    onClose && onClose();
  };
  let n = 0;
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "lg lg-glass lg-pop lg-menu",
    role: "menu",
    tabIndex: -1,
    "aria-label": title,
    onMouseDown: e => e.stopPropagation(),
    onContextMenu: e => e.preventDefault(),
    onKeyDown: e => {
      const p = real.indexOf(hi);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi(real[(p + 1) % real.length]);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi(real[(p - 1 + real.length) % real.length]);
      }
      if (e.key === "Enter" && hi >= 0) run(items[hi]);
    },
    style: {
      position: "absolute",
      left: x,
      top: y,
      ...style
    }
  }, quick && quick.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "lg-menu__quick"
  }, quick.map((q, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    className: "lg-menu__q",
    "data-tone": q.tone,
    "aria-label": q.label,
    style: {
      animationDelay: i * 22 + "ms"
    },
    onClick: () => run(q)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: q.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, q.label)))), items.map((it, i) => it === "sep" ? /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "lg-menu__sep"
  }) : /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    role: "menuitem",
    className: "lg-menu__item",
    "data-tone": it.tone,
    "aria-disabled": it.disabled || undefined,
    "data-active": hi === i || undefined,
    onMouseEnter: () => setHi(i),
    onClick: () => run(it),
    style: {
      animationDelay: (quick ? 60 : 0) + n++ * 18 + "ms"
    }
  }, it.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, it.label), it.keys && /*#__PURE__*/React.createElement("span", {
    className: "lg-menu__keys"
  }, it.keys))));
}
Object.assign(__ds_scope, { ContextMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/ContextMenu.jsx", error: String((e && e.message) || e) }); }

// components/glass/GlassPanel.jsx
try { (() => {
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
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  }, t.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  }) : /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
    }, t.preview || /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
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
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: toast.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("span", null, toast.text), toast.action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-toast__act",
    onClick: onAction
  }, toast.action));
}
Object.assign(__ds_scope, { GlassPanel, GlassButton, LiquidSlider, IconTabs, PartPicker, ColorRibbon, LiquidSwitch, ControlTiles, GlassToolbar, GlassRail, GlassToast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/GlassPanel.jsx", error: String((e && e.message) || e) }); }

// components/glass/FontSelect.jsx
try { (() => {
const {
  useEffect,
  useMemo,
  useRef,
  useState
} = React;
// Font field for an open-ended library: the current font as a row; tap opens an
// in-panel browser — search, filter chips, recents, favourites, the user's text
// rendered in every face — plus "Agregar": any Google Font by name, or upload a file.
const LS_FAV = "myland.fonts.fav",
  LS_REC = "myland.fonts.recent",
  LS_INST = "myland.fonts.installed";
const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch (e) {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};
const FALLBACK = {
  sans: "sans-serif",
  serif: "serif",
  display: "sans-serif",
  mono: "monospace",
  script: "cursive",
  custom: "sans-serif"
};
const CATS = [["all", "Todas"], ["fav", "Favoritas"], ["sans", "Sans"], ["serif", "Serif"], ["display", "Display"], ["mono", "Mono"], ["script", "Script"], ["custom", "Mías"]];
const GOOGLE_CATALOG = [["Inter Tight", "sans"], ["Manrope", "sans"], ["Outfit", "sans"], ["Plus Jakarta Sans", "sans"], ["Figtree", "sans"], ["Work Sans", "sans"], ["Rubik", "sans"], ["Sora", "sans"], ["Unbounded", "display"], ["Space Grotesk", "sans"], ["Lexend", "sans"], ["Familjen Grotesk", "sans"], ["Cormorant Garamond", "serif"], ["EB Garamond", "serif"], ["Fraunces", "serif"], ["DM Serif Display", "serif"], ["Libre Caslon Text", "serif"], ["Lora", "serif"], ["Bodoni Moda", "serif"], ["Abril Fatface", "display"], ["Anton", "display"], ["Archivo Black", "display"], ["Righteous", "display"], ["Monoton", "display"], ["Rubik Glitch", "display"], ["Bungee", "display"], ["Press Start 2P", "display"], ["VT323", "mono"], ["JetBrains Mono", "mono"], ["IBM Plex Mono", "mono"], ["Courier Prime", "mono"], ["Caveat", "script"], ["Dancing Script", "script"], ["Satisfy", "script"], ["Sacramento", "script"], ["Homemade Apple", "script"], ["Permanent Marker", "script"], ["Shadows Into Light", "script"]].map(([label, category]) => ({
  key: label,
  label,
  category,
  family: `'${label}',${FALLBACK[category]}`
}));
const loaded = new Set();
function loadGoogleFont(name) {
  if (loaded.has(name)) return document.fonts.load(`20px '${name}'`);
  loaded.add(name);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(l);
  return new Promise(res => {
    l.onload = () => document.fonts.load(`20px '${name}'`).then(res, () => res([]));
    l.onerror = () => res([]);
  });
}
function Row({
  f,
  sample,
  selected,
  fav,
  onPick,
  onFav,
  active,
  installing,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "option",
    "aria-selected": selected,
    className: "lg-frow",
    "data-active": active || undefined,
    onClick: onPick
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-frow__face",
    style: {
      fontFamily: f.family
    }
  }, sample), /*#__PURE__*/React.createElement("span", {
    className: "lg-frow__name"
  }, f.label, f.category === "custom" && " · archivo")), action, onFav && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-frow__fav",
    "aria-label": fav ? "Quitar de favoritas" : "Agregar a favoritas",
    "aria-pressed": fav,
    onClick: e => {
      e.stopPropagation();
      onFav();
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    size: 15
  })), installing ? /*#__PURE__*/React.createElement("span", {
    className: "lg-frow__spin"
  }) : selected && /*#__PURE__*/React.createElement("span", {
    className: "lg-frow__check"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16
  })));
}
function FontSelect({
  fonts,
  value,
  onChange,
  sample = "Aa",
  onInstall,
  label = "Fuente"
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("mine");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [hi, setHi] = useState(0);
  const [fav, setFav] = useState(() => read(LS_FAV, []));
  const [rec, setRec] = useState(() => read(LS_REC, []));
  const [inst, setInst] = useState(() => read(LS_INST, []));
  const [custom, setCustom] = useState([]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const ref = useRef(null),
    search = useRef(null),
    file = useRef(null);
  useEffect(() => {
    inst.forEach(loadGoogleFont);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => search.current && search.current.focus(), 60);else {
      setQ("");
      setMode("mine");
      setErr(null);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const d = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", d);
    return () => document.removeEventListener("mousedown", d);
  }, [open]);
  useEffect(() => setHi(0), [q, cat, mode]);
  const instFonts = GOOGLE_CATALOG.filter(g => inst.includes(g.key)).concat(inst.filter(n => !GOOGLE_CATALOG.some(g => g.key === n)).map(n => ({
    key: n,
    label: n,
    category: "sans",
    family: `'${n}',sans-serif`
  })));
  const library = useMemo(() => {
    const seen = new Set();
    return [...fonts, ...instFonts, ...custom].filter(f => !seen.has(f.key) && seen.add(f.key));
  }, [fonts, inst, custom]);
  const cur = library.find(f => f.key === value) || {
    key: value,
    label: value,
    family: "inherit"
  };
  const ql = q.trim().toLowerCase();
  const mine = library.filter(f => (cat === "all" || (cat === "fav" ? fav.includes(f.key) : f.category === cat)) && f.label.toLowerCase().includes(ql));
  const recents = !ql && cat === "all" ? rec.map(k => library.find(f => f.key === k)).filter(Boolean).slice(0, 3) : [];
  const catalog = GOOGLE_CATALOG.filter(g => !library.some(f => f.key === g.key) && g.label.toLowerCase().includes(ql) && (cat === "all" || cat === "fav" || cat === "custom" || g.category === cat));
  const exactMissing = ql.length > 2 && ![...library, ...GOOGLE_CATALOG].some(f => f.label.toLowerCase() === ql);
  useEffect(() => {
    if (open && mode === "add") catalog.slice(0, 24).forEach(g => loadGoogleFont(g.key));
  }, [open, mode, q, cat]);
  const pick = k => {
    onChange && onChange(k);
    const r = [k, ...rec.filter(x => x !== k)].slice(0, 6);
    setRec(r);
    write(LS_REC, r);
  };
  const toggleFav = k => {
    const f = fav.includes(k) ? fav.filter(x => x !== k) : [...fav, k];
    setFav(f);
    write(LS_FAV, f);
  };
  const install = async (name, category = "sans") => {
    setBusy(name);
    setErr(null);
    const faces = await loadGoogleFont(name);
    setBusy(null);
    if (!faces || !faces.length) {
      setErr(`No encontramos “${name}” en Google Fonts`);
      return;
    }
    const n = [...inst.filter(x => x !== name), name];
    setInst(n);
    write(LS_INST, n);
    const f = GOOGLE_CATALOG.find(g => g.key === name) || {
      key: name,
      label: name,
      category,
      family: `'${name}',sans-serif`
    };
    onInstall && onInstall(f);
    pick(name);
    setMode("mine");
    setQ("");
  };
  const upload = async e => {
    const fl = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!fl) return;
    const name = fl.name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[-_]+/g, " ").trim();
    try {
      const face = new FontFace(name, await fl.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      const f = {
        key: name,
        label: name,
        category: "custom",
        family: `'${name}',sans-serif`
      };
      setCustom(c => [...c.filter(x => x.key !== name), f]);
      onInstall && onInstall(f);
      pick(name);
      setMode("mine");
    } catch (x) {
      setErr("Ese archivo no es una fuente válida");
    }
  };
  const listForKeys = mode === "mine" ? [...recents, ...mine] : catalog;
  const onKey = e => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi(h => Math.min(listForKeys.length - 1, h + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi(h => Math.max(0, h - 1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const f = listForKeys[hi];
      if (mode === "mine" && f) pick(f.key);else if (mode === "add") {
        if (f) install(f.key, f.category);else if (exactMissing) install(q.trim());
      }
    }
  };
  const sampleText = (sample || "Aa").slice(0, 22);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "lg-fsel",
    "data-open": open || undefined
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-fsel__trigger",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    "aria-label": `${label}: ${cur.label}`,
    onClick: () => setOpen(o => !o)
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-fsel__aa",
    style: {
      fontFamily: cur.family
    }
  }, "Aa"), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0,
      flex: 1,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-fsel__cur",
    style: {
      fontFamily: cur.family
    }
  }, cur.label)), /*#__PURE__*/React.createElement("span", {
    className: "lg-fsel__chev"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15
  }))), open && /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__body",
    onKeyDown: onKey
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lg-fsel__search"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15
  }), /*#__PURE__*/React.createElement("input", {
    ref: search,
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: mode === "mine" ? "Buscar" : "Buscar en Google Fonts",
    "aria-label": "Buscar fuente"
  }), q && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-fsel__clear",
    "aria-label": "Borrar b\xFAsqueda",
    onClick: () => setQ("")
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "close",
    size: 11
  })))), /*#__PURE__*/React.createElement(__ds_scope.IconTabs, {
    value: mode,
    onChange: setMode,
    tabs: [{
      id: "mine",
      icon: "text",
      label: "Mis fuentes"
    }, {
      id: "add",
      icon: "plus",
      label: "Agregar"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__cats",
    role: "tablist"
  }, CATS.filter(([k]) => mode === "mine" || !["fav", "custom"].includes(k)).map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    type: "button",
    role: "tab",
    "aria-selected": cat === k,
    className: "lg-chip",
    onClick: () => setCat(k)
  }, k === "fav" && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "star",
    size: 12
  }), l))), /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__list lg-scroll",
    role: "listbox",
    "aria-label": "Fuentes"
  }, mode === "mine" && /*#__PURE__*/React.createElement(React.Fragment, null, recents.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__head"
  }, "Recientes"), recents.map((f, i) => /*#__PURE__*/React.createElement(Row, {
    key: "r" + f.key,
    f: f,
    sample: sampleText,
    selected: f.key === value,
    fav: fav.includes(f.key),
    active: hi === i,
    onPick: () => pick(f.key),
    onFav: () => toggleFav(f.key)
  })), recents.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__head"
  }, CATS.find(c => c[0] === cat)[1], " \xB7 ", mine.length), mine.map((f, i) => /*#__PURE__*/React.createElement(Row, {
    key: f.key,
    f: f,
    sample: sampleText,
    selected: f.key === value,
    fav: fav.includes(f.key),
    active: hi === i + recents.length,
    onPick: () => pick(f.key),
    onFav: () => toggleFav(f.key)
  })), mine.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__empty"
  }, cat === "fav" ? "Tocá la estrella para guardar favoritas" : `Nada con “${q}”`, ql && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-pill lg-pill--well",
    style: {
      height: 34,
      fontSize: 13
    },
    onClick: () => setMode("add")
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 14
  }), "Buscar en Google Fonts"))), mode === "add" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lg-frow lg-frow--upload",
    onClick: () => file.current.click()
  }, /*#__PURE__*/React.createElement("span", {
    className: "lg-fsel__aa",
    style: {
      width: 36,
      height: 36
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "upload",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "Subir archivo"), /*#__PURE__*/React.createElement("span", {
    className: "lg-frow__name"
  }, "TTF \xB7 OTF \xB7 WOFF"))), /*#__PURE__*/React.createElement("input", {
    ref: file,
    type: "file",
    accept: ".ttf,.otf,.woff,.woff2",
    hidden: true,
    onChange: upload
  }), exactMissing && /*#__PURE__*/React.createElement(Row, {
    f: {
      key: q,
      label: `Instalar “${q.trim()}”`,
      family: "inherit"
    },
    sample: sampleText,
    active: catalog.length === 0,
    installing: busy === q.trim(),
    onPick: () => install(q.trim()),
    action: /*#__PURE__*/React.createElement("span", {
      className: "lg-frow__get"
    }, "Google")
  }), err && /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__err"
  }, err), /*#__PURE__*/React.createElement("div", {
    className: "lg-fsel__head"
  }, "Google Fonts"), catalog.map((f, i) => /*#__PURE__*/React.createElement(Row, {
    key: f.key,
    f: f,
    sample: sampleText,
    active: hi === i,
    installing: busy === f.key,
    onPick: () => install(f.key, f.category),
    action: busy !== f.key && /*#__PURE__*/React.createElement("span", {
      className: "lg-frow__get"
    }, "Instalar")
  }))))));
}
Object.assign(__ds_scope, { GOOGLE_CATALOG, loadGoogleFont, FontSelect });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glass/FontSelect.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/App.jsx
try { (() => {
// MYLAND editor — UI kit app: state, history, selection, keyboard, toasts. Chrome lives in Liquid.jsx.
function useHistory(init) {
  const [h, setH] = React.useState({
    past: [],
    present: init,
    future: []
  });
  const last = React.useRef(0);
  const push = (h, next) => ({
    past: [...h.past, h.present].slice(-100),
    present: next,
    future: []
  });
  return {
    st: h.present,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
    count: h.past.length,
    begin: () => {
      last.current = 0;
      setH(h => ({
        ...h,
        past: [...h.past, h.present].slice(-100),
        future: []
      }));
    },
    set: fn => setH(h => ({
      ...h,
      present: fn(h.present)
    })),
    // Continuous edits within 600ms coalesce into one undo step (end of gesture).
    change: fn => {
      const now = Date.now(),
        co = now - last.current < 600;
      last.current = now;
      setH(h => co ? {
        ...h,
        present: fn(h.present)
      } : push(h, fn(h.present)));
    },
    undo: () => setH(h => h.past.length ? {
      past: h.past.slice(0, -1),
      present: h.past[h.past.length - 1],
      future: [h.present, ...h.future]
    } : h),
    redo: () => setH(h => h.future.length ? {
      past: [...h.past, h.present],
      present: h.future[0],
      future: h.future.slice(1)
    } : h)
  };
}
const KEY = {
  text: "texts",
  image: "images",
  music: "music"
};
const THEMES = [["dark", "Oscuro", "moon"], ["light", "Claro", "sun"]];
const KIND_NAME = {
  text: "Texto",
  image: "Imagen",
  music: "Música",
  card: "Tarjeta"
};
function App() {
  const H = useHistory({
    ...INITIAL,
    order: ["m1", "t1"],
    room: DEFAULT_ROOM
  });
  const {
    st
  } = H;
  const [sel, setSel] = React.useState({
    kind: "card",
    id: "card"
  });
  const [panel, setPanel] = React.useState("inspector");
  const [cardObj, setCardObj] = React.useState("name");
  const [addOpen, setAddOpen] = React.useState(false);
  const [ctx, setCtx] = React.useState(null);
  const [tbPop, setTbPop] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const [echo, setEcho] = React.useState(0);
  const [toast, setToast] = React.useState(null);
  const [theme, setTheme] = React.useState(() => {
    const t = localStorage.getItem("myland.editorTheme");
    return t === "light" ? "light" : "dark";
  });
  const [published, setPublished] = React.useState(0);
  const rootRef = React.useRef(null);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-editor-theme", theme);
    localStorage.setItem("myland.editorTheme", theme);
  }, [theme]);
  React.useEffect(() => setTbPop(null), [sel && sel.id]);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (icon, text, action) => setToast({
    k: Date.now(),
    icon,
    text,
    action
  });
  const fxOn = Object.values(st.card.fx).filter(x => x.on).length;
  const prevFx = React.useRef(fxOn);
  React.useEffect(() => {
    if (fxOn > prevFx.current) setEcho(e => e + 1);
    prevFx.current = fxOn;
  }, [fxOn]);
  const find = (kind, id) => kind === "card" ? st.card : st[KEY[kind]].find(e => e.id === id);
  const mapEl = (kind, id, fn) => s => ({
    ...s,
    [KEY[kind]]: s[KEY[kind]].map(e => e.id === id ? fn(e) : e)
  });
  const setEl = (kind, id, patch) => H.set(mapEl(kind, id, e => ({
    ...e,
    ...patch
  })));
  const changeEl = (kind, id, patch) => H.change(mapEl(kind, id, e => ({
    ...e,
    ...patch
  })));
  const discrete = (kind, id, patch) => {
    H.begin();
    setEl(kind, id, patch);
  };
  const changeCard = fn => H.change(s => ({
    ...s,
    card: fn(s.card)
  }));
  const changeRoom = patch => H.change(s => ({
    ...s,
    room: {
      ...s.room,
      ...patch
    }
  }));
  const openInspector = obj => {
    if (obj) setCardObj(obj);
    setPanel("inspector");
    setAddOpen(false);
  };
  const remove = (kind, id) => {
    if (kind === "card") return;
    H.begin();
    H.set(s => ({
      ...s,
      [KEY[kind]]: s[KEY[kind]].filter(e => e.id !== id),
      order: s.order.filter(o => o !== id)
    }));
    setSel(null);
    notify("trash", `${KIND_NAME[kind]} eliminado`, "Deshacer");
  };
  const duplicate = (kind, id) => {
    if (kind === "card") return;
    const e = find(kind, id),
      nid = kind[0] + Date.now();
    H.begin();
    H.set(s => ({
      ...s,
      [KEY[kind]]: [...s[KEY[kind]], {
        ...e,
        id: nid,
        x: e.x + 24,
        y: e.y + 24,
        locked: false
      }],
      order: [...s.order, nid]
    }));
    setSel({
      kind,
      id: nid
    });
    notify("copy", "Duplicado");
  };
  const toggleLock = (kind, id) => {
    if (kind === "card") return;
    const l = !find(kind, id).locked;
    discrete(kind, id, {
      locked: l
    });
    notify(l ? "lock" : "unlock", l ? "Bloqueado" : "Desbloqueado");
  };
  const move = (id, dir) => {
    H.begin();
    H.set(s => {
      const o = [...s.order],
        i = o.indexOf(id),
        j = i + dir;
      if (j < 0 || j >= o.length) return s;
      [o[i], o[j]] = [o[j], o[i]];
      return {
        ...s,
        order: o
      };
    });
  };
  const toEdge = (id, edge) => {
    H.begin();
    H.set(s => {
      const o = s.order.filter(x => x !== id);
      return {
        ...s,
        order: edge === "front" ? [...o, id] : [id, ...o]
      };
    });
    notify(edge === "front" ? "bring-front" : "send-back", edge === "front" ? "Al frente" : "Al fondo");
  };
  const add = (type, file, at) => {
    const id = type[0] + Date.now();
    H.begin();
    H.set(s => {
      const n = {
        ...s,
        order: [...s.order, id]
      };
      if (type === "text") n.texts = [...s.texts, {
        id,
        content: "Texto nuevo",
        font: "DM Sans",
        size: 28,
        ls: 0,
        upper: false,
        color: "#2A1630",
        opacity: 1,
        x: 220,
        y: 200,
        rotation: 0,
        layer: 2,
        locked: false
      }];
      if (type === "image") n.images = [...s.images, {
        id,
        src: file.url,
        name: file.name,
        x: at ? at.x - 90 : 260,
        y: at ? at.y - 90 : 260,
        w: 180,
        h: 180,
        rotation: 0,
        radius: 20,
        link: "",
        layer: 2,
        locked: false
      }];
      if (type === "music") n.music = [...s.music, {
        ...INITIAL.music[0],
        id,
        title: "Nueva pista",
        artist: "Artista",
        x: 200,
        y: 600
      }];
      return n;
    });
    setSel({
      kind: type,
      id
    });
    setAddOpen(false);
    setPanel("inspector");
  };
  const addImage = async at => {
    const f = await pickFile("image/*");
    if (f) add("image", f, at);
  };
  const undo = () => {
    if (H.canUndo) {
      H.undo();
      notify("undo", "Deshecho");
    }
  };
  const redo = () => {
    if (H.canRedo) {
      H.redo();
      notify("redo", "Rehecho");
    }
  };
  const publish = () => {
    setPublished(H.count);
    notify("check", "Publicado en tu perfil");
  };
  React.useEffect(() => {
    const k = e => {
      const t = e.target,
        typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (typing) return;
      if (e.key === "Escape") {
        if (ctx || addOpen) {
          setCtx(null);
          setAddOpen(false);
        } else if (panel) setPanel(null);else setSel(null);
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && sel) {
        e.preventDefault();
        duplicate(sel.kind, sel.id);
        return;
      }
      if (mod && e.key.toLowerCase() === "l" && sel) {
        e.preventDefault();
        toggleLock(sel.kind, sel.id);
        return;
      }
      if (mod) return;
      if ((e.key === "Backspace" || e.key === "Delete") && sel) {
        e.preventDefault();
        remove(sel.kind, sel.id);
      }
      if (e.key === "Enter" && sel) openInspector();
      if (e.key.toLowerCase() === "a") setAddOpen(o => !o);
      if (e.key.toLowerCase() === "l") setPanel(p => p === "layers" ? null : "layers");
      if (e.key.toLowerCase() === "v") {
        setAddOpen(false);
        setCtx(null);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const onContext = (e, target) => {
    const r = rootRef.current.getBoundingClientRect();
    setCtx({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      target
    });
  };
  const ctxMenu = () => {
    const t = ctx.target;
    if (!t) return {
      title: "Sala",
      quick: [{
        icon: "text",
        label: "Texto",
        onSelect: () => add("text")
      }, {
        icon: "image",
        label: "Imagen",
        onSelect: () => addImage({
          x: ctx.x,
          y: ctx.y
        })
      }, {
        icon: "music",
        label: "Música",
        onSelect: () => add("music")
      }],
      items: [{
        icon: "layers",
        label: "Capas",
        keys: "L",
        onSelect: () => setPanel("layers")
      }, {
        icon: "room",
        label: "Tu sala",
        onSelect: () => setPanel("room")
      }, "sep", {
        icon: "undo",
        label: "Deshacer",
        keys: "⌘Z",
        disabled: !H.canUndo,
        onSelect: undo
      }]
    };
    if (t.kind === "card") return {
      title: "Tarjeta",
      quick: [{
        icon: "pencil",
        label: "Editar",
        onSelect: () => openInspector()
      }, {
        icon: "palette",
        label: "Fondo",
        onSelect: () => openInspector("cardBg")
      }, {
        icon: "sparkles",
        label: "Efectos",
        onSelect: () => openInspector("cardFx")
      }],
      items: [{
        icon: "layers",
        label: "Ver en Capas",
        keys: "L",
        onSelect: () => setPanel("layers")
      }]
    };
    const e = find(t.kind, t.id);
    return {
      title: KIND_NAME[t.kind],
      quick: [{
        icon: "copy",
        label: "Duplicar",
        onSelect: () => duplicate(t.kind, t.id)
      }, {
        icon: e.locked ? "unlock" : "lock",
        label: e.locked ? "Soltar" : "Fijar",
        onSelect: () => toggleLock(t.kind, t.id)
      }, {
        icon: "trash",
        label: "Eliminar",
        tone: "danger",
        onSelect: () => remove(t.kind, t.id)
      }],
      items: [{
        icon: "pencil",
        label: "Editar",
        keys: "↵",
        onSelect: () => openInspector()
      }, "sep", {
        icon: "bring-front",
        label: "Al frente",
        disabled: e.locked,
        onSelect: () => toEdge(t.id, "front")
      }, {
        icon: "send-back",
        label: "Al fondo",
        disabled: e.locked,
        onSelect: () => toEdge(t.id, "back")
      }, {
        icon: "copy",
        label: "Duplicar",
        keys: "⌘D",
        onSelect: () => duplicate(t.kind, t.id)
      }, {
        icon: e.locked ? "unlock" : "lock",
        label: e.locked ? "Desbloquear" : "Bloquear",
        keys: "⌘L",
        onSelect: () => toggleLock(t.kind, t.id)
      }, "sep", {
        icon: "trash",
        label: "Eliminar",
        keys: "⌫",
        tone: "danger",
        onSelect: () => remove(t.kind, t.id)
      }]
    };
  };
  const more = e => {
    const r = rootRef.current.getBoundingClientRect(),
      b = e.currentTarget.getBoundingClientRect();
    setCtx({
      x: b.left - r.left,
      y: b.bottom - r.top + 8,
      target: sel
    });
  };
  const toolbarFor = s => {
    const ed = {
      icon: "pencil",
      label: "Editar",
      keys: "↵",
      onClick: () => openInspector()
    };
    const mo = {
      icon: "more",
      label: "Más",
      onClick: more
    };
    if (s.kind === "card") return /*#__PURE__*/React.createElement(LiquidTB, {
      items: [ed, "sep", {
        icon: "palette",
        label: "Fondo",
        onClick: () => openInspector("cardBg")
      }, {
        icon: "sparkles",
        label: "Efectos",
        onClick: () => openInspector("cardFx")
      }, "sep", mo]
    });
    const e = find(s.kind, s.id);
    if (!e) return null;
    const lk = {
      icon: e.locked ? "lock" : "unlock",
      label: e.locked ? "Desbloquear" : "Bloquear",
      keys: "⌘L",
      pressed: e.locked,
      onClick: () => toggleLock(s.kind, s.id)
    };
    let items;
    if (s.kind === "text") items = [{
      text: (CANVAS_FONTS.find(f => f.key === e.font) || {
        label: e.font
      }).label,
      font: fontFamily(e.font),
      label: "Fuente",
      onClick: () => openInspector()
    }, {
      icon: "minus",
      label: "Achicar",
      onClick: () => changeEl("text", e.id, {
        size: Math.max(10, e.size - 2)
      })
    }, {
      text: String(e.size),
      label: "Tamaño"
    }, {
      icon: "plus",
      label: "Agrandar",
      onClick: () => changeEl("text", e.id, {
        size: Math.min(120, e.size + 2)
      })
    }, {
      swatch: e.color,
      label: "Color",
      pressed: tbPop === "color",
      onClick: () => setTbPop(tbPop === "color" ? null : "color")
    }, "sep", lk, mo];
    if (s.kind === "image") items = [{
      icon: "upload",
      label: "Reemplazar",
      onClick: async () => {
        const f = await pickFile("image/*");
        if (f) discrete("image", e.id, {
          src: f.url,
          name: f.name
        });
      }
    }, {
      icon: "corner",
      label: "Esquinas",
      onClick: () => {
        const r = [0, 8, 20, 999];
        discrete("image", e.id, {
          radius: r[(r.indexOf(e.radius) + 1) % r.length]
        });
      }
    }, "sep", ed, lk, mo];
    if (s.kind === "music") items = [{
      icon: playing ? "pause" : "play",
      label: playing ? "Pausa" : "Escuchar",
      onClick: () => setPlaying(!playing)
    }, "sep", ed, lk, mo];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative"
      }
    }, /*#__PURE__*/React.createElement(LiquidTB, {
      items: items
    }), tbPop === "color" && /*#__PURE__*/React.createElement(MY.ColorPopover, {
      value: e.color,
      swatches: ["#2A1630", "#FF4F94", "#FFFFFF", "#B9A2FF", "#C6F432"],
      onChange: v => changeEl("text", e.id, {
        color: v
      }),
      onClose: () => setTbPop(null),
      style: {
        position: "absolute",
        top: 54,
        left: 0
      }
    }));
  };
  const th = THEMES.find(t => t[0] === theme);
  const pending = Math.max(0, H.count - published);
  const m = ctx && ctxMenu();
  const ctxEl = ctx && /*#__PURE__*/React.createElement(MY.ContextMenu, {
    x: Math.min(ctx.x, window.innerWidth - 250),
    y: Math.min(ctx.y, window.innerHeight - 380),
    title: m.title,
    quick: m.quick,
    items: m.items,
    onClose: () => setCtx(null)
  });
  const actions = sel ? {
    onLock: () => toggleLock(sel.kind, sel.id),
    onDuplicate: () => duplicate(sel.kind, sel.id),
    onDelete: () => remove(sel.kind, sel.id)
  } : {};
  return /*#__PURE__*/React.createElement(LiquidShell, {
    st,
    sel,
    setSel,
    panel,
    setPanel,
    cardObj,
    setCardObj,
    addOpen,
    setAddOpen,
    setCtx,
    ctxEl,
    H,
    th,
    setTheme,
    pending,
    publish,
    undo,
    redo,
    rootRef,
    toolbarFor,
    find,
    setEl,
    changeEl,
    changeCard,
    changeRoom,
    toggleLock,
    move,
    toEdge,
    add,
    addImage,
    playing,
    setPlaying,
    echo,
    openInspector,
    onContext,
    actions,
    toast,
    setToast
  });
}
if (window.MYLAND_READY && document.getElementById("root") && !window.__mlMounted) {
  window.__mlMounted = true;
  window.MYLAND_READY.then(() => ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null)));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/Canvas.jsx
try { (() => {
// The sala (canvas): wallpaper, free elements, the ProfileCard, selection
// chrome, the contextual toolbar and its quick popovers.
function MusicWidget({
  m,
  playing,
  onPlay
}) {
  const b = m.bg,
    f = m.fx;
  const shadows = [f.shadow ? `0 14px 30px -10px rgba(42,10,26,${f.shadowIntensity})` : null, f.outer ? `0 0 ${30 * f.glowIntensity}px ${f.glowColor}` : null, f.inner ? `inset 0 0 ${24 * f.glowIntensity}px ${f.glowColor}` : null, f.borderWidth ? `inset 0 0 0 ${f.borderWidth}px ${hexA(f.borderColor, 0.7)}` : null].filter(Boolean).join(",");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      borderRadius: f.radius,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: 12,
      background: b.gradient ? `linear-gradient(${b.angle}deg,${b.from},${b.to})` : hexA(b.color, b.opacity),
      backdropFilter: b.glass ? `blur(${b.blur}px) saturate(160%)` : undefined,
      boxShadow: shadows || undefined,
      "--ml-float": `-${f.floatHeight}px`,
      animation: f.floating ? `mlFloat ${f.floatSpeed}s ease-in-out infinite` : undefined,
      color: m.textColor,
      fontFamily: fontFamily(m.font)
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 60,
      borderRadius: 12,
      flex: "none",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      background: "linear-gradient(135deg,#FF4F94,#2A1630)",
      animation: playing ? "mlSpin 6s linear infinite" : undefined
    }
  }, /*#__PURE__*/React.createElement(MY.Icon, {
    name: "disc",
    size: 28
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: m.textSize + 1,
      fontWeight: 600,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, m.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: m.textSize,
      opacity: 0.7
    }
  }, m.artist), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 3,
      borderRadius: 2,
      background: hexA(m.textColor, 0.15),
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: playing ? "46%" : "18%",
      height: "100%",
      borderRadius: 2,
      background: m.textColor,
      transition: "width 600ms ease"
    }
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      onPlay();
    },
    onPointerDown: e => e.stopPropagation(),
    "aria-label": playing ? "Pausa" : "Reproducir",
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      border: "none",
      background: m.textColor,
      color: "#fff",
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(MY.Icon, {
    name: playing ? "pause" : "play",
    size: 14
  })));
}
function Canvas({
  st,
  sel,
  onSelect,
  cardObj,
  inspector,
  onPart,
  openInspector,
  begin,
  set,
  change,
  onContext,
  echo,
  docW,
  playing,
  setPlaying,
  toolbarFor
}) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({
    w: 1200,
    h: 800
  });
  const [editing, setEditing] = React.useState(null);
  const cardWasSel = React.useRef(false);
  React.useEffect(() => {
    const measure = () => {
      const r = ref.current.getBoundingClientRect();
      setSize({
        w: r.width,
        h: r.height
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const offset = inspector ? docW / 2 : 0;
  const cx = Math.round(size.w / 2 - st.card.w / 2 - offset),
    cy = Math.round(Math.max(76, size.h / 2 - st.card.h / 2 + 10));
  const drag = (kind, el) => e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect({
      kind,
      id: el.id
    });
    if (el.locked || editing === el.id) return;
    const start = {
      x: e.clientX,
      y: e.clientY,
      ex: el.x,
      ey: el.y
    };
    let moved = false;
    const mv = ev => {
      const dx = ev.clientX - start.x,
        dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) {
        begin();
        moved = true;
      }
      set(kind, el.id, {
        x: Math.round(start.ex + dx),
        y: Math.round(start.ey + dy)
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const resize = (kind, el) => e => {
    e.stopPropagation();
    begin();
    const s = {
        x: e.clientX,
        w: el.w,
        h: el.h
      },
      r = el.h / el.w;
    const mv = ev => {
      const w = Math.max(40, Math.round(s.w + ev.clientX - s.x));
      set(kind, el.id, kind === "image" ? {
        w,
        h: Math.round(w * r)
      } : {
        w
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const isSel = (k, id) => sel && sel.kind === k && sel.id === id;
  const frame = (k, el, w, h) => isSel(k, el.id) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: -6,
      border: "1.5px solid var(--glass-accent)",
      borderRadius: 6,
      pointerEvents: "none"
    }
  }), !el.locked && w && /*#__PURE__*/React.createElement("div", {
    onPointerDown: resize(k, el),
    style: {
      position: "absolute",
      right: -11,
      bottom: -11,
      width: 10,
      height: 10,
      background: "#fff",
      border: "1.5px solid var(--glass-accent)",
      borderRadius: 3,
      cursor: "nwse-resize"
    }
  }), el.locked && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: -10,
      left: -10,
      width: 22,
      height: 22,
      borderRadius: 7,
      background: "var(--glass-fill-solid)",
      color: "var(--glass-ink)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(MY.Icon, {
    name: "lock",
    size: 12
  })));
  const z = (layer, i, id) => layer * 100 + (st.order.indexOf(id) + 1) * 2;
  const selEl = sel && (sel.kind === "card" ? {
    x: cx,
    y: cy,
    w: st.card.w
  } : sel.kind === "text" ? st.texts.find(t => t.id === sel.id) : sel.kind === "image" ? st.images.find(t => t.id === sel.id) : st.music.find(t => t.id === sel.id));
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    onPointerDown: () => {
      onSelect(null);
      setEditing(null);
    },
    onContextMenu: e => {
      e.preventDefault();
      onContext(e, null);
    },
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 0,
      overflow: "hidden",
      background: `radial-gradient(120% 90% at 30% 20%,${st.room.from} 0%,${st.room.to} 100%)`
    }
  }, st.room.grain && /*#__PURE__*/React.createElement("div", {
    className: "grain-layer"
  }), st.images.map((im, i) => /*#__PURE__*/React.createElement("div", {
    key: im.id,
    onPointerDown: drag("image", im),
    onContextMenu: e => {
      e.preventDefault();
      e.stopPropagation();
      onSelect({
        kind: "image",
        id: im.id
      });
      onContext(e, {
        kind: "image",
        id: im.id
      });
    },
    onDoubleClick: () => openInspector(),
    style: {
      position: "absolute",
      left: im.x,
      top: im.y,
      width: im.w,
      height: im.h,
      transform: `rotate(${im.rotation}deg)`,
      zIndex: z(im.layer, i, im.id) + (isSel("image", im.id) ? 1000 : 0),
      cursor: im.locked ? "default" : "grab"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: im.src,
    alt: "",
    draggable: false,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      borderRadius: im.radius >= 50 ? "50%" : im.radius,
      display: "block",
      userSelect: "none"
    }
  }), frame("image", im, im.w, im.h))), st.texts.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    onPointerDown: drag("text", t),
    onDoubleClick: e => {
      e.stopPropagation();
      if (!t.locked) setEditing(t.id);
    },
    onContextMenu: e => {
      e.preventDefault();
      e.stopPropagation();
      onSelect({
        kind: "text",
        id: t.id
      });
      onContext(e, {
        kind: "text",
        id: t.id
      });
    },
    style: {
      position: "absolute",
      left: t.x,
      top: t.y,
      transform: `rotate(${t.rotation}deg)`,
      zIndex: z(t.layer, i, t.id) + (isSel("text", t.id) ? 1000 : 0),
      cursor: editing === t.id ? "text" : t.locked ? "default" : "grab"
    }
  }, /*#__PURE__*/React.createElement("div", {
    contentEditable: editing === t.id,
    suppressContentEditableWarning: true,
    spellCheck: false,
    ref: el => {
      if (el && editing === t.id && document.activeElement !== el) {
        el.focus();
        document.getSelection().selectAllChildren(el);
      }
    },
    onBlur: e => {
      if (editing === t.id) {
        begin();
        set("text", t.id, {
          content: e.currentTarget.textContent
        });
        setEditing(null);
      }
    },
    onKeyDown: e => {
      if (e.key === "Escape" || e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: {
      fontFamily: fontFamily(t.font),
      fontSize: t.size,
      letterSpacing: t.ls,
      textTransform: t.upper ? "uppercase" : "none",
      color: t.color,
      opacity: t.opacity,
      whiteSpace: "nowrap",
      outline: "none",
      lineHeight: 1.2,
      userSelect: editing === t.id ? "text" : "none"
    }
  }, t.content), frame("text", t))), st.music.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    onPointerDown: drag("music", m),
    onContextMenu: e => {
      e.preventDefault();
      e.stopPropagation();
      onSelect({
        kind: "music",
        id: m.id
      });
      onContext(e, {
        kind: "music",
        id: m.id
      });
    },
    onDoubleClick: () => openInspector(),
    style: {
      position: "absolute",
      left: m.x,
      top: m.y,
      width: m.w,
      height: m.h,
      zIndex: z(m.layer, i, m.id) + (isSel("music", m.id) ? 1000 : 0),
      cursor: m.locked ? "default" : "grab"
    }
  }, /*#__PURE__*/React.createElement(MusicWidget, {
    m: m,
    playing: playing,
    onPlay: () => setPlaying(!playing)
  }), frame("music", m, m.w))), /*#__PURE__*/React.createElement("div", {
    onPointerDown: e => {
      e.stopPropagation();
      cardWasSel.current = isSel("card", "card");
      if (!cardWasSel.current) onSelect({
        kind: "card",
        id: "card"
      });
    },
    onDoubleClick: () => openInspector(),
    onContextMenu: e => {
      e.preventDefault();
      e.stopPropagation();
      onSelect({
        kind: "card",
        id: "card"
      });
      onContext(e, {
        kind: "card",
        id: "card"
      });
    },
    style: {
      position: "absolute",
      left: cx,
      top: cy,
      zIndex: 150 + (isSel("card", "card") ? 1000 : 0),
      transition: "left var(--motion-panel) var(--glass-spring-soft), top var(--motion-panel) var(--glass-spring-soft)"
    }
  }, /*#__PURE__*/React.createElement(ProfileCard, {
    card: st.card,
    active: inspector && sel && sel.kind === "card" ? cardObj : null,
    echo: echo,
    onPart: id => {
      if (cardWasSel.current) onPart(id);
    }
  }), isSel("card", "card") && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: -6,
      border: "1.5px solid var(--glass-accent)",
      borderRadius: st.card.radius + 6,
      pointerEvents: "none"
    }
  })), selEl && !editing && toolbarFor && /*#__PURE__*/React.createElement("div", {
    onPointerDown: e => e.stopPropagation(),
    style: {
      position: "absolute",
      left: selEl.x - 6,
      top: selEl.y - 56 >= 68 ? selEl.y - 56 : Math.min(size.h - 60, selEl.y + (sel.kind === "card" ? st.card.h : selEl.h || 60) + 14),
      zIndex: 5000
    }
  }, toolbarFor(sel)), inspector && sel && sel.kind === "card" && cy + st.card.h + 64 <= size.h && /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass lg-hint",
    style: {
      position: "absolute",
      left: cx + st.card.w / 2,
      top: cy + st.card.h + 20,
      transform: "translateX(-50%)",
      zIndex: 4000,
      color: "var(--glass-ink)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 99,
      display: "grid",
      placeItems: "center",
      background: "var(--glass-accent)",
      color: "var(--glass-accent-ink)"
    }
  }, /*#__PURE__*/React.createElement(MY.Icon, {
    name: "pencil",
    size: 13
  })), /*#__PURE__*/React.createElement("span", {
    key: cardObj,
    className: "lg-swap",
    style: {
      fontWeight: 600
    }
  }, PART_LABELS[cardObj]), /*#__PURE__*/React.createElement("kbd", null, "esc")));
}
const PART_LABELS = {
  name: "Nombre",
  handle: "@usuario",
  descriptor: "Frase",
  location: "Ubicación",
  bio: "Bio",
  views: "Visitas",
  photo: "Foto",
  links: "Links",
  logo: "Logo",
  cardBg: "Fondo",
  cardFx: "Efectos",
  allText: "Todos los textos"
};
Object.assign(window, {
  Canvas,
  PART_LABELS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/Canvas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/Liquid.jsx
try { (() => {
// v2 "Liquid" editor chrome: floating glass rail, capsule topbar, one glass inspector with
// round part picker + icon tabs + direct-manipulation controls. Reuses App state (App.jsx).
const G = new Proxy({}, {
  get: (_, k) => window.MYLAND && window.MYLAND[k]
});
const px = v => Math.round(v) + " px";
function LiquidTB({
  items
}) {
  const conv = items.map(it => it === "sep" ? "sep" : {
    icon: it.text || it.swatch ? undefined : it.icon,
    tip: it.label + (it.keys ? "   " + it.keys : ""),
    tipSide: "bottom",
    onClick: it.onClick,
    pressed: it.pressed,
    children: it.swatch ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: 99,
        background: it.swatch,
        boxShadow: "inset 0 0 0 1px rgba(127,127,127,.4)"
      }
    }) : it.text ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: it.font,
        fontSize: it.font ? 15 : 13,
        fontWeight: 600,
        display: "flex",
        gap: 6,
        alignItems: "center"
      }
    }, it.icon && /*#__PURE__*/React.createElement(G.Icon, {
      name: it.icon,
      size: 15
    }), it.text) : undefined
  });
  return /*#__PURE__*/React.createElement(G.GlassToolbar, {
    items: conv
  });
}
function DropZone({
  label,
  onFile
}) {
  const [over, setOver] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "lg-drop",
    "data-over": over || undefined,
    role: "button",
    tabIndex: 0,
    onClick: async () => {
      const f = await pickFile("image/*");
      if (f) onFile(f);
    },
    onDragOver: e => {
      e.preventDefault();
      e.stopPropagation();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile({
        url: URL.createObjectURL(f),
        name: f.name
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 99,
      display: "grid",
      placeItems: "center",
      background: "var(--glass-well-hover)"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "upload",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--glass-ink)"
    }
  }, label), /*#__PURE__*/React.createElement("span", null, "o soltalo ac\xE1"));
}
function ColorField({
  value,
  onChange,
  colors
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(G.ColorRibbon, {
    value: value,
    colors: colors,
    onChange: onChange,
    onMore: () => setOpen(o => !o),
    moreOpen: open
  }), open && /*#__PURE__*/React.createElement(G.ColorPopover, {
    value: value,
    onChange: onChange,
    onClose: () => setOpen(false),
    swatches: colors,
    style: {
      position: "absolute",
      top: 42,
      left: 0
    }
  }));
}
function Sec({
  label,
  children,
  action
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    className: "lg-label"
  }, label, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }, action)), children);
}
function CaseButtons({
  upper,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(G.GlassButton, {
    tip: "Normal",
    filled: true,
    pressed: !upper,
    size: 44,
    onClick: () => onChange(false)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, "Aa")), /*#__PURE__*/React.createElement(G.GlassButton, {
    tip: "May\xFAsculas",
    filled: true,
    pressed: upper,
    size: 44,
    onClick: () => onChange(true)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600
    }
  }, "AA")));
}
const TEXT_FX = (a, set) => [{
  id: "sh",
  label: "Sombra",
  on: a.shadow,
  onToggle: v => set({
    shadow: v
  }),
  preview: /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      textShadow: "0 2px 3px rgba(0,0,0,.7)"
    }
  }, "A")
}, {
  id: "gl",
  label: "Brillo",
  on: a.glow,
  onToggle: v => set({
    glow: v
  }),
  preview: /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      textShadow: "0 0 8px #FF4F94"
    }
  }, "A")
}, {
  id: "ol",
  label: "Contorno",
  on: a.outline,
  onToggle: v => set({
    outline: v
  }),
  preview: /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: "transparent",
      WebkitTextStroke: "1px currentColor"
    }
  }, "A")
}, {
  id: "bl",
  label: "Desenfoque",
  on: a.blur > 0,
  state: px(a.blur),
  onToggle: v => set({
    blur: v ? 1 : 0
  }),
  preview: /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      filter: "blur(1.2px)"
    }
  }, "A"),
  detail: /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "blend",
    label: "Cantidad",
    min: 0,
    max: 4,
    step: 0.5,
    value: a.blur,
    fmt: px,
    onChange: v => set({
      blur: v
    })
  })
}];
function CardBody({
  card,
  obj,
  tab,
  u
}) {
  const cols = cardColors(card);
  if (ROLE_IDS.includes(obj)) {
    const r = card.roles[obj],
      d = ROLE_DEFAULTS[obj],
      sr = p => u(["roles", obj], {
        ...r,
        ...p
      });
    if (tab === "fx") return /*#__PURE__*/React.createElement(Sec, {
      label: "Todos los textos"
    }, /*#__PURE__*/React.createElement(G.ControlTiles, {
      tiles: TEXT_FX(card.allText, p => u(["allText"], {
        ...card.allText,
        ...p
      }))
    }), /*#__PURE__*/React.createElement(G.IconTabs, {
      value: card.allText.align,
      onChange: v => u(["allText", "align"], v),
      tabs: [{
        id: "left",
        icon: "align-left"
      }, {
        id: "center",
        icon: "align-center"
      }, {
        id: "right",
        icon: "align-right"
      }]
    }));
    const key = CONTENT_KEY[obj];
    return /*#__PURE__*/React.createElement(React.Fragment, null, obj === "views" ? /*#__PURE__*/React.createElement("div", {
      className: "lg-row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 500
      }
    }, "Mostrar visitas"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(G.LiquidSwitch, {
      value: card.showViews,
      onChange: v => u(["showViews"], v)
    }))) : obj === "handle" ? /*#__PURE__*/React.createElement("div", {
      className: "lg-input",
      style: {
        display: "flex",
        alignItems: "center",
        fontFamily: fontFamily(r.font),
        color: "var(--glass-ink-2)"
      }
    }, card.handle, /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto"
      },
      title: "Se cambia desde tu cuenta"
    }, /*#__PURE__*/React.createElement(G.Icon, {
      name: "lock",
      size: 14
    }))) : React.createElement(obj === "bio" ? "textarea" : "input", {
      className: "lg-input",
      rows: 3,
      value: card[key],
      placeholder: PLACEHOLDER[obj],
      onChange: e => u([key], e.target.value),
      style: {
        fontFamily: fontFamily(r.font),
        fontSize: obj === "bio" ? 15 : 19,
        letterSpacing: r.ls,
        textTransform: r.upper ? "uppercase" : "none"
      }
    }), /*#__PURE__*/React.createElement(Sec, {
      label: "Fuente"
    }, /*#__PURE__*/React.createElement(G.FontSelect, {
      fonts: CANVAS_FONTS,
      value: r.font,
      sample: card[key] || "Aa",
      onChange: v => sr({
        font: v
      })
    })), /*#__PURE__*/React.createElement(Sec, {
      label: "Color"
    }, /*#__PURE__*/React.createElement(ColorField, {
      value: r.color,
      colors: cols,
      onChange: v => sr({
        color: v
      })
    })), /*#__PURE__*/React.createElement(Sec, {
      label: "Ajustes",
      action: /*#__PURE__*/React.createElement(CaseButtons, {
        upper: r.upper,
        onChange: v => sr({
          upper: v
        })
      })
    }, /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "maximize",
      label: "Tama\xF1o",
      min: 8,
      max: 72,
      value: r.size,
      defaultValue: d.size,
      fmt: px,
      onChange: v => sr({
        size: v
      })
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "case",
      label: "Peso",
      min: 300,
      max: 800,
      step: 100,
      value: r.weight,
      defaultValue: d.weight,
      onChange: v => sr({
        weight: v
      })
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "spacing",
      label: "Espaciado",
      min: -4,
      max: 12,
      step: 0.5,
      value: r.ls,
      defaultValue: d.ls,
      fmt: px,
      onChange: v => sr({
        ls: v
      })
    }), obj === "bio" && /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "height",
      label: "Interlineado",
      min: 1,
      max: 2.2,
      step: 0.05,
      value: r.lh || 1.45,
      fmt: v => v.toFixed(2),
      onChange: v => sr({
        lh: v
      })
    })));
  }
  if (obj === "photo") {
    const p = card.photo,
      sp = q => u(["photo"], {
        ...p,
        ...q
      });
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 76,
        height: 76,
        borderRadius: p.shape === "circle" ? 99 : p.shape === "rounded" ? 20 : 8,
        backgroundImage: "url(../../assets/ld-card-user.png)",
        backgroundSize: "460%",
        backgroundPosition: "50% 31%",
        flex: "none"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["circle", "Círculo", 99], ["rounded", "Redonda", 7], ["square", "Cuadrada", 2]].map(([id, l, rr]) => /*#__PURE__*/React.createElement(G.GlassButton, {
      key: id,
      tip: l,
      filled: true,
      pressed: p.shape === id,
      size: 44,
      onClick: () => sp({
        shape: id
      })
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 18,
        border: "2px solid currentColor",
        borderRadius: rr
      }
    }))))), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "maximize",
      label: "Tama\xF1o",
      min: 56,
      max: 160,
      value: p.size,
      defaultValue: 104,
      fmt: px,
      onChange: v => sp({
        size: v
      })
    }), /*#__PURE__*/React.createElement(G.ControlTiles, {
      tiles: [{
        id: "b",
        label: "Borde",
        icon: "frame",
        on: p.border,
        onToggle: v => sp({
          border: v
        }),
        detail: /*#__PURE__*/React.createElement(ColorField, {
          value: p.borderColor,
          colors: cols,
          onChange: v => sp({
            borderColor: v
          })
        })
      }, {
        id: "s",
        label: "Sombra",
        icon: "moon",
        on: p.shadow,
        onToggle: v => sp({
          shadow: v
        })
      }, {
        id: "g",
        label: "Brillo",
        icon: "sun",
        on: p.glow,
        state: p.pulse ? "Con pulso" : "Fijo",
        onToggle: v => sp({
          glow: v
        }),
        detail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ColorField, {
          value: p.glowColor,
          colors: cols,
          onChange: v => sp({
            glowColor: v
          })
        }), /*#__PURE__*/React.createElement("div", {
          className: "lg-row"
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 15
          }
        }, "Pulso"), /*#__PURE__*/React.createElement("span", {
          style: {
            marginLeft: "auto"
          }
        }, /*#__PURE__*/React.createElement(G.LiquidSwitch, {
          value: p.pulse,
          onChange: v => sp({
            pulse: v
          })
        }))))
      }]
    }));
  }
  if (obj === "links") return /*#__PURE__*/React.createElement(React.Fragment, null, card.links.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: l.platform,
    tip: "Cambiar \xEDcono",
    filled: true,
    size: 44,
    onClick: () => {
      const P = ["instagram", "youtube", "twitch", "globe"];
      u(["links", i, "platform"], P[(P.indexOf(l.platform) + 1) % 4]);
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "lg-input",
    value: l.url,
    placeholder: "https://",
    onChange: e => u(["links", i, "url"], e.target.value),
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13
    }
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "trash",
    tip: "Quitar",
    tone: "danger",
    size: 36,
    onClick: () => u(["links"], card.links.filter(x => x.id !== l.id))
  }))), card.links.length < 6 && /*#__PURE__*/React.createElement("button", {
    className: "lg-pill lg-pill--well",
    style: {
      justifyContent: "center"
    },
    onClick: () => u(["links"], [...card.links, {
      id: "l" + Date.now(),
      platform: "globe",
      url: ""
    }])
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "plus",
    size: 15
  }), "Agregar link"), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "maximize",
    label: "Tama\xF1o",
    min: 12,
    max: 40,
    value: card.linkSize,
    defaultValue: 20,
    fmt: px,
    onChange: v => u(["linkSize"], v)
  }), /*#__PURE__*/React.createElement(Sec, {
    label: "Color"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: card.linkColor,
    colors: cols,
    onChange: v => u(["linkColor"], v)
  })));
  if (obj === "logo") {
    const l = card.logo,
      sl = q => u(["logo"], {
        ...l,
        ...q
      });
    return /*#__PURE__*/React.createElement(React.Fragment, null, l.src ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 10,
        borderRadius: 22,
        background: "var(--glass-well)"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: l.src,
      alt: "",
      style: {
        width: 56,
        height: 56,
        objectFit: "contain",
        borderRadius: 12,
        flex: "none"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(G.GlassButton, {
      icon: "upload",
      tip: "Reemplazar",
      filled: true,
      size: 40,
      onClick: async () => {
        const f = await pickFile("image/*");
        if (f) sl({
          src: f.url
        });
      }
    }), /*#__PURE__*/React.createElement(G.GlassButton, {
      icon: "trash",
      tip: "Quitar",
      tone: "danger",
      size: 40,
      onClick: () => sl({
        src: null
      })
    })) : /*#__PURE__*/React.createElement(DropZone, {
      label: "Sub\xED tu logo",
      onFile: f => sl({
        src: f.url
      })
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "maximize",
      label: "Tama\xF1o",
      min: 20,
      max: 120,
      value: l.size,
      fmt: px,
      disabled: !l.src,
      onChange: v => sl({
        size: v
      })
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "eye",
      label: "Opacidad",
      min: 0,
      max: 1,
      step: 0.01,
      value: l.opacity,
      fmt: pct,
      disabled: !l.src,
      onChange: v => sl({
        opacity: v
      })
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "rotate",
      label: "Rotaci\xF3n",
      min: -180,
      max: 180,
      value: l.rotation,
      fmt: v => v + "°",
      disabled: !l.src,
      onChange: v => sl({
        rotation: v
      })
    }));
  }
  if (obj === "cardBg") {
    const b = card.bg,
      sb = q => u(["bg"], {
        ...b,
        ...q
      });
    return tab === "surface" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.ControlTiles, {
      tiles: [{
        id: "g",
        label: "Vidrio",
        icon: "blend",
        on: b.glass,
        onToggle: v => sb({
          glass: v
        }),
        detail: /*#__PURE__*/React.createElement(G.LiquidSlider, {
          icon: "blend",
          label: "Desenfoque",
          min: 0,
          max: 24,
          value: b.blur,
          fmt: px,
          onChange: v => sb({
            blur: v
          })
        })
      }, {
        id: "gr",
        label: "Gradiente",
        icon: "palette",
        on: b.gradient,
        onToggle: v => sb({
          gradient: v
        })
      }]
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "corner",
      label: "Esquinas",
      min: 0,
      max: 60,
      value: card.radius,
      defaultValue: 28,
      fmt: px,
      onChange: v => u(["radius"], v)
    }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "eye",
      label: "Opacidad",
      min: 0,
      max: 1,
      step: 0.01,
      value: b.opacity,
      fmt: pct,
      onChange: v => sb({
        opacity: v
      })
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 64,
        borderRadius: 18,
        background: b.gradient ? `linear-gradient(${b.angle}deg,${b.from},${b.to})` : b.color,
        boxShadow: "inset 0 0 0 1px rgba(127,127,127,.25)"
      }
    }), /*#__PURE__*/React.createElement(Sec, {
      label: b.gradient ? "Inicio" : "Color"
    }, /*#__PURE__*/React.createElement(ColorField, {
      value: b.gradient ? b.from : b.color,
      colors: cols,
      onChange: v => sb(b.gradient ? {
        from: v
      } : {
        color: v
      })
    })), b.gradient && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sec, {
      label: "Final"
    }, /*#__PURE__*/React.createElement(ColorField, {
      value: b.to,
      colors: cols,
      onChange: v => sb({
        to: v
      })
    })), /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: "rotate",
      label: "\xC1ngulo",
      min: 0,
      max: 360,
      step: 5,
      value: b.angle,
      fmt: v => v + "°",
      onChange: v => sb({
        angle: v
      })
    })));
  }
  if (obj === "cardFx") {
    const f = card.fx,
      sf = (k, q) => u(["fx", k], {
        ...f[k],
        ...q
      }),
      on = k => v => sf(k, {
        on: v
      });
    const S = (k, label, icon, min, max, step, fm) => /*#__PURE__*/React.createElement(G.LiquidSlider, {
      icon: icon,
      label: label,
      min: min,
      max: max,
      step: step,
      value: f[k[0]][k[1]],
      fmt: fm,
      onChange: v => sf(k[0], {
        [k[1]]: v
      })
    });
    const groups = {
      light: [{
        id: "border",
        label: "Borde",
        icon: "frame",
        on: f.border.on,
        state: px(f.border.width),
        onToggle: on("border"),
        detail: /*#__PURE__*/React.createElement(React.Fragment, null, S(["border", "width"], "Grosor", "frame", 0.5, 6, 0.5, px), S(["border", "opacity"], "Opacidad", "eye", 0, 1, 0.01, pct), /*#__PURE__*/React.createElement(ColorField, {
          value: f.border.color,
          colors: cols,
          onChange: v => sf("border", {
            color: v
          })
        }))
      }, {
        id: "shadow",
        label: "Sombra",
        icon: "moon",
        on: f.shadow.on,
        state: pct(f.shadow.intensity),
        onToggle: on("shadow"),
        detail: /*#__PURE__*/React.createElement(React.Fragment, null, S(["shadow", "intensity"], "Intensidad", "moon", 0.1, 1, 0.01, pct), /*#__PURE__*/React.createElement(ColorField, {
          value: f.shadow.color,
          colors: cols,
          onChange: v => sf("shadow", {
            color: v
          })
        }))
      }, {
        id: "glow",
        label: "Brillo",
        icon: "sun",
        on: f.glow.on,
        state: f.glow.mode,
        onToggle: on("glow"),
        detail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.IconTabs, {
          value: f.glow.mode,
          onChange: v => sf("glow", {
            mode: v
          }),
          tabs: ["Exterior", "Interior", "Ambos"].map(x => ({
            id: x,
            label: x
          }))
        }), S(["glow", "intensity"], "Intensidad", "sun", 0.1, 1, 0.01, pct), /*#__PURE__*/React.createElement(ColorField, {
          value: f.glow.color,
          colors: cols,
          onChange: v => sf("glow", {
            color: v
          })
        }))
      }, {
        id: "pulse",
        label: "Pulso",
        icon: "sparkles",
        on: f.glow.on && f.glow.pulse,
        onToggle: v => sf("glow", {
          pulse: v,
          on: v || f.glow.on
        })
      }],
      motion: [{
        id: "float",
        label: "Flotar",
        icon: "arrow-up",
        on: f.float.on,
        state: f.float.speed + "s",
        onToggle: on("float"),
        detail: /*#__PURE__*/React.createElement(React.Fragment, null, S(["float", "height"], "Altura", "height", 2, 24, 1, px), S(["float", "speed"], "Ciclo", "rotate", 1, 8, 0.5, v => v + "s"))
      }, {
        id: "tilt",
        label: "Inclinar 3D",
        icon: "move",
        on: f.tilt.on,
        state: f.tilt.intensity + "°",
        onToggle: on("tilt"),
        detail: S(["tilt", "intensity"], "Intensidad", "move", 1, 15, 0.5, v => v + "°")
      }, {
        id: "spot",
        label: "Spotlight",
        icon: "sun",
        on: f.spotlight.on,
        onToggle: on("spotlight"),
        detail: S(["spotlight", "size"], "Radio", "maximize", 20, 100, 1, v => v + "%")
      }],
      retro: [{
        id: "grain",
        label: "Grano",
        icon: "sparkles",
        on: f.grain.on,
        state: pct(f.grain.amount),
        onToggle: on("grain"),
        detail: S(["grain", "amount"], "Cantidad", "sparkles", 0.05, 1, 0.01, pct)
      }, {
        id: "scan",
        label: "Scanlines",
        icon: "align-left",
        on: f.scan.on,
        state: pct(f.scan.amount),
        onToggle: on("scan"),
        detail: S(["scan", "amount"], "Cantidad", "align-left", 0.05, 1, 0.01, pct)
      }]
    };
    return /*#__PURE__*/React.createElement(G.ControlTiles, {
      key: tab,
      tiles: groups[tab] || groups.light
    });
  }
  return null;
}
const CARD_PARTS = card => [{
  id: "photo",
  label: "Foto",
  thumb: "../../assets/ld-card-user.png"
}, {
  id: "name",
  label: "Nombre",
  icon: "text"
}, {
  id: "handle",
  label: "@usuario",
  icon: "at"
}, {
  id: "descriptor",
  label: "Frase",
  icon: "quote"
}, {
  id: "location",
  label: "Ubicación",
  icon: "pin"
}, {
  id: "bio",
  label: "Bio",
  icon: "align-left"
}, {
  id: "views",
  label: "Visitas",
  icon: "eye"
}, {
  id: "links",
  label: "Links",
  icon: "link"
}, {
  id: "logo",
  label: "Logo",
  icon: "shapes"
}, "sep", {
  id: "cardBg",
  label: "Fondo",
  swatch: card.bg.gradient ? `linear-gradient(135deg,${card.bg.from},${card.bg.to})` : card.bg.color
}, {
  id: "cardFx",
  label: "Efectos",
  icon: "sparkles"
}].map(p => p === "sep" || !ROLE_IDS.includes(p.id) ? p : {
  ...p,
  modified: Object.keys(ROLE_DEFAULTS[p.id]).some(k => card.roles[p.id][k] !== ROLE_DEFAULTS[p.id][k])
});
const CARD_TABS = {
  text: [{
    id: "style",
    icon: "text",
    label: "Estilo"
  }, {
    id: "fx",
    icon: "sparkles",
    label: "Efectos"
  }],
  cardBg: [{
    id: "color",
    icon: "palette",
    label: "Color"
  }, {
    id: "surface",
    icon: "blend",
    label: "Superficie"
  }],
  cardFx: [{
    id: "light",
    icon: "sun",
    label: "Luz"
  }, {
    id: "motion",
    icon: "move",
    label: "Movimiento"
  }, {
    id: "retro",
    icon: "disc",
    label: "Retro"
  }]
};
function ElementFooter({
  el,
  set,
  a
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 14px 14px",
      borderTop: "1px solid var(--glass-line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(G.IconTabs, {
    value: String(el.layer),
    onChange: v => set({
      layer: Number(v)
    }),
    tabs: [{
      id: "0",
      label: "Fondo"
    }, {
      id: "1",
      label: "Medio"
    }, {
      id: "2",
      label: "Frente"
    }]
  })), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: el.locked ? "lock" : "unlock",
    tip: el.locked ? "Desbloquear" : "Bloquear",
    pressed: el.locked,
    onClick: a.onLock
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "copy",
    tip: "Duplicar",
    onClick: a.onDuplicate
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "trash",
    tip: "Eliminar",
    tone: "danger",
    onClick: a.onDelete
  }));
}
function ElementBody({
  kind,
  el,
  set,
  tab,
  playing,
  setPlaying
}) {
  if (kind === "text") return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    className: "lg-input",
    value: el.content,
    onChange: e => set({
      content: e.target.value
    }),
    placeholder: "Escrib\xED algo",
    style: {
      fontFamily: fontFamily(el.font),
      fontSize: 20,
      textTransform: el.upper ? "uppercase" : "none"
    }
  }), /*#__PURE__*/React.createElement(Sec, {
    label: "Fuente"
  }, /*#__PURE__*/React.createElement(G.FontSelect, {
    fonts: CANVAS_FONTS,
    value: el.font,
    sample: el.content || "Aa",
    onChange: v => set({
      font: v
    })
  })), /*#__PURE__*/React.createElement(Sec, {
    label: "Color"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: el.color,
    colors: ["#2A1630", "#FFFFFF", "#FF4F94", "#9B85FF", "#C6F432", "#FF8A3D"],
    onChange: v => set({
      color: v
    })
  })), /*#__PURE__*/React.createElement(Sec, {
    label: "Ajustes",
    action: /*#__PURE__*/React.createElement(CaseButtons, {
      upper: el.upper,
      onChange: v => set({
        upper: v
      })
    })
  }, /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "maximize",
    label: "Tama\xF1o",
    min: 10,
    max: 120,
    value: el.size,
    defaultValue: 28,
    fmt: px,
    onChange: v => set({
      size: v
    })
  }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "spacing",
    label: "Espaciado",
    min: -10,
    max: 60,
    step: 0.5,
    value: el.ls,
    defaultValue: 0,
    fmt: px,
    onChange: v => set({
      ls: v
    })
  }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "eye",
    label: "Opacidad",
    min: 0.05,
    max: 1,
    step: 0.01,
    value: el.opacity,
    defaultValue: 1,
    fmt: pct,
    onChange: v => set({
      opacity: v
    })
  }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "rotate",
    label: "Rotaci\xF3n",
    min: -180,
    max: 180,
    value: el.rotation,
    defaultValue: 0,
    fmt: v => v + "°",
    onChange: v => set({
      rotation: v
    })
  })));
  if (kind === "image") return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 168,
      borderRadius: 22,
      background: "var(--glass-well)",
      display: "grid",
      placeItems: "center",
      position: "relative"
    },
    className: "ml-thumb"
  }, /*#__PURE__*/React.createElement("img", {
    src: el.src,
    alt: "",
    style: {
      maxWidth: "70%",
      maxHeight: 140,
      objectFit: "contain",
      borderRadius: el.radius >= 50 ? "50%" : el.radius
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "ml-thumb__over",
    style: {
      position: "absolute",
      right: 10,
      bottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "lg-pill lg-pill--well lg-glass",
    onClick: async () => {
      const f = await pickFile("image/*");
      if (f) set({
        src: f.url,
        name: f.name
      });
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "upload",
    size: 15
  }), "Reemplazar"))), /*#__PURE__*/React.createElement(Sec, {
    label: "Esquinas"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [[0, "Rectas", 1], [8, "Suaves", 4], [20, "Redondas", 7], [999, "Círculo", 99]].map(([v, l, r]) => /*#__PURE__*/React.createElement(G.GlassButton, {
    key: v,
    tip: l,
    filled: true,
    pressed: v === 999 ? el.radius >= 50 : el.radius === v,
    size: 48,
    onClick: () => set({
      radius: v
    })
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      border: "2px solid currentColor",
      borderRadius: r
    }
  }))))), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "maximize",
    label: "Ancho",
    min: 40,
    max: 600,
    value: el.w,
    fmt: px,
    onChange: v => set({
      w: v,
      h: Math.round(v * el.h / el.w)
    })
  }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "rotate",
    label: "Rotaci\xF3n",
    min: -180,
    max: 180,
    value: el.rotation,
    defaultValue: 0,
    fmt: v => v + "°",
    onChange: v => set({
      rotation: v
    })
  }), /*#__PURE__*/React.createElement(Sec, {
    label: "Link"
  }, /*#__PURE__*/React.createElement("input", {
    className: "lg-input",
    type: "url",
    value: el.link,
    placeholder: "https://",
    onChange: e => set({
      link: e.target.value
    }),
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13
    }
  })));
  const b = el.bg,
    f = el.fx,
    sb = q => set({
      bg: {
        ...b,
        ...q
      }
    }),
    sf = q => set({
      fx: {
        ...f,
        ...q
      }
    });
  if (tab === "fx") return /*#__PURE__*/React.createElement(G.ControlTiles, {
    tiles: [{
      id: "o",
      label: "Brillo",
      icon: "sun",
      on: f.outer,
      onToggle: v => sf({
        outer: v
      }),
      detail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "sun",
        label: "Intensidad",
        min: 0.1,
        max: 1,
        step: 0.01,
        value: f.glowIntensity,
        fmt: pct,
        onChange: v => sf({
          glowIntensity: v
        })
      }), /*#__PURE__*/React.createElement(ColorField, {
        value: f.glowColor,
        colors: ["#FF4F94", "#9B85FF", "#FFFFFF", "#C6F432"],
        onChange: v => sf({
          glowColor: v
        })
      }))
    }, {
      id: "i",
      label: "Brillo interior",
      icon: "blend",
      on: f.inner,
      onToggle: v => sf({
        inner: v
      })
    }, {
      id: "s",
      label: "Sombra",
      icon: "moon",
      on: f.shadow,
      state: pct(f.shadowIntensity),
      onToggle: v => sf({
        shadow: v
      }),
      detail: /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "moon",
        label: "Intensidad",
        min: 0.1,
        max: 1,
        step: 0.01,
        value: f.shadowIntensity,
        fmt: pct,
        onChange: v => sf({
          shadowIntensity: v
        })
      })
    }, {
      id: "b",
      label: "Borde",
      icon: "frame",
      on: f.borderWidth > 0,
      state: px(f.borderWidth),
      onToggle: v => sf({
        borderWidth: v ? 1 : 0
      }),
      detail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "frame",
        label: "Grosor",
        min: 0,
        max: 6,
        step: 0.5,
        value: f.borderWidth,
        fmt: px,
        onChange: v => sf({
          borderWidth: v
        })
      }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "corner",
        label: "Esquinas",
        min: 0,
        max: 60,
        value: f.radius,
        fmt: px,
        onChange: v => sf({
          radius: v
        })
      }))
    }, {
      id: "fl",
      label: "Flotar",
      icon: "arrow-up",
      on: f.floating,
      state: f.floatSpeed + "s",
      onToggle: v => sf({
        floating: v
      }),
      detail: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "height",
        label: "Altura",
        min: 2,
        max: 24,
        value: f.floatHeight,
        fmt: px,
        onChange: v => sf({
          floatHeight: v
        })
      }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "rotate",
        label: "Ciclo",
        min: 1,
        max: 8,
        step: 0.5,
        value: f.floatSpeed,
        fmt: v => v + "s",
        onChange: v => sf({
          floatSpeed: v
        })
      }))
    }, {
      id: "t",
      label: "Inclinar 3D",
      icon: "move",
      on: f.tilt,
      onToggle: v => sf({
        tilt: v
      }),
      detail: /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "move",
        label: "Intensidad",
        min: 1,
        max: 15,
        step: 0.5,
        value: f.tiltIntensity,
        fmt: v => v + "°",
        onChange: v => sf({
          tiltIntensity: v
        })
      })
    }, {
      id: "sp",
      label: "Spotlight",
      icon: "sun",
      on: f.spotlight,
      onToggle: v => sf({
        spotlight: v
      })
    }, {
      id: "h",
      label: "Glow al pasar",
      icon: "pointer",
      on: f.hoverGlow,
      onToggle: v => sf({
        hoverGlow: v
      })
    }]
  });
  if (tab === "look") return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sec, {
    label: "Fondo"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: b.color,
    colors: ["#FFFFFF", "#2A1630", "#FF4F94", "#9B85FF"],
    onChange: v => sb({
      color: v
    })
  })), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "eye",
    label: "Opacidad",
    min: 0,
    max: 1,
    step: 0.01,
    value: b.opacity,
    fmt: pct,
    onChange: v => sb({
      opacity: v
    })
  }), /*#__PURE__*/React.createElement(G.ControlTiles, {
    tiles: [{
      id: "g",
      label: "Vidrio",
      icon: "blend",
      on: b.glass,
      onToggle: v => sb({
        glass: v
      }),
      detail: /*#__PURE__*/React.createElement(G.LiquidSlider, {
        icon: "blend",
        label: "Desenfoque",
        min: 0,
        max: 24,
        value: b.blur,
        fmt: px,
        onChange: v => sb({
          blur: v
        })
      })
    }, {
      id: "gr",
      label: "Gradiente",
      icon: "palette",
      on: b.gradient,
      onToggle: v => sb({
        gradient: v
      })
    }]
  }), /*#__PURE__*/React.createElement(Sec, {
    label: "Texto"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: el.textColor,
    colors: ["#2A1630", "#FFFFFF", "#FF4F94"],
    onChange: v => set({
      textColor: v
    })
  })), /*#__PURE__*/React.createElement(G.FontSelect, {
    fonts: CANVAS_FONTS,
    value: el.font,
    sample: el.title,
    onChange: v => set({
      font: v
    })
  }));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: 22,
      background: "var(--glass-well)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 14,
      background: "linear-gradient(135deg,#FF4F94,#2A1630)",
      display: "grid",
      placeItems: "center",
      color: "#fff",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "disc",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "lg-input",
    value: el.title,
    onChange: e => set({
      title: e.target.value
    }),
    style: {
      minHeight: 0,
      padding: "2px 0",
      background: "none",
      fontWeight: 600
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "lg-input",
    value: el.artist,
    onChange: e => set({
      artist: e.target.value
    }),
    style: {
      minHeight: 0,
      padding: "2px 0",
      background: "none",
      fontSize: 13,
      color: "var(--glass-ink-2)"
    }
  })), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: playing ? "pause" : "play",
    tip: playing ? "Pausa" : "Escuchar",
    pressed: true,
    size: 44,
    onClick: () => setPlaying(!playing)
  })), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "volume",
    label: "Volumen",
    min: 0,
    max: 1,
    step: 0.01,
    value: el.volume,
    fmt: pct,
    onChange: v => set({
      volume: v
    })
  }), /*#__PURE__*/React.createElement(G.LiquidSlider, {
    icon: "maximize",
    label: "Ancho",
    min: 200,
    max: 420,
    value: el.w,
    fmt: px,
    onChange: v => set({
      w: v
    })
  }), /*#__PURE__*/React.createElement("button", {
    className: "lg-pill lg-pill--well",
    style: {
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "upload",
    size: 15
  }), "Cambiar MP3"));
}
function RoomBody({
  room,
  changeRoom
}) {
  const PRESETS = [["#FBE3EE", "#DCD5F6"], ["#0E0C12", "#2A1630"], ["#FFE9D6", "#FFC7D9"], ["#DFF3EA", "#C9D8FF"], ["#F3EFF4", "#F3EFF4"], ["#1B1F3A", "#5B3A8C"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 96,
      borderRadius: 22,
      background: `radial-gradient(120% 90% at 30% 20%,${room.from},${room.to})`,
      boxShadow: "inset 0 0 0 1px rgba(127,127,127,.25)",
      transition: "background 400ms"
    }
  }), /*#__PURE__*/React.createElement(Sec, {
    label: "Ambiente"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(6,1fr)",
      gap: 8
    }
  }, PRESETS.map(([f, t]) => /*#__PURE__*/React.createElement("button", {
    key: f + t,
    type: "button",
    className: "lg-color",
    "aria-checked": room.from === f && room.to === t,
    "aria-label": `${f} → ${t}`,
    style: {
      width: "100%",
      height: 40,
      borderRadius: 14,
      background: `linear-gradient(135deg,${f},${t})`
    },
    onClick: () => changeRoom({
      from: f,
      to: t
    })
  })))), /*#__PURE__*/React.createElement(Sec, {
    label: "Inicio"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: room.from,
    colors: ["#FBE3EE", "#FFE9D6", "#DFF3EA", "#0E0C12"],
    onChange: v => changeRoom({
      from: v
    })
  })), /*#__PURE__*/React.createElement(Sec, {
    label: "Final"
  }, /*#__PURE__*/React.createElement(ColorField, {
    value: room.to,
    colors: ["#DCD5F6", "#FFC7D9", "#C9D8FF", "#2A1630"],
    onChange: v => changeRoom({
      to: v
    })
  })), /*#__PURE__*/React.createElement(G.ControlTiles, {
    tiles: [{
      id: "grain",
      label: "Grano",
      icon: "sparkles",
      on: room.grain,
      onToggle: v => changeRoom({
        grain: v
      })
    }]
  }));
}
function LiquidDock({
  sel,
  st,
  find,
  cardObj,
  setCardObj,
  changeCard,
  changeEl,
  changeRoom,
  onClose,
  a,
  playing,
  setPlaying,
  layers,
  room,
  layersProps
}) {
  const [tab, setTab] = React.useState({});
  const kind = sel && sel.kind;
  const parts = CARD_PARTS(st.card).filter(p => p !== "sep").map(p => p.id);
  const prevIdx = React.useRef(parts.indexOf(cardObj));
  const idx = parts.indexOf(cardObj),
    dir = idx > prevIdx.current ? "r" : idx < prevIdx.current ? "l" : undefined;
  React.useEffect(() => {
    prevIdx.current = idx;
  }, [idx]);
  let title, icon, body, tabs, footer, picker, tkey;
  if (room) {
    title = "Tu sala";
    icon = "room";
    body = /*#__PURE__*/React.createElement(RoomBody, {
      room: st.room,
      changeRoom: changeRoom
    });
  } else if (layers) {
    title = "Capas";
    icon = "layers";
    body = /*#__PURE__*/React.createElement(LiquidLayers, layersProps);
  } else if (kind === "card") {
    const group = ROLE_IDS.includes(cardObj) ? "text" : cardObj;
    tkey = "card-" + group;
    tabs = CARD_TABS[group];
    const t = tab[tkey] || tabs && tabs[0].id;
    title = PART_LABELS[cardObj];
    icon = "card";
    picker = /*#__PURE__*/React.createElement(G.PartPicker, {
      parts: CARD_PARTS(st.card),
      value: cardObj,
      onChange: setCardObj
    });
    body = /*#__PURE__*/React.createElement(CardBody, {
      card: st.card,
      obj: cardObj,
      tab: t,
      u: (path, v) => changeCard(c => setIn(c, path, v))
    });
  } else if (kind) {
    const el = find(kind, sel.id);
    if (!el) return null;
    tkey = kind;
    tabs = kind === "music" ? [{
      id: "track",
      icon: "music",
      label: "Pista"
    }, {
      id: "look",
      icon: "palette",
      label: "Estilo"
    }, {
      id: "fx",
      icon: "sparkles",
      label: "Efectos"
    }] : null;
    title = {
      text: "Texto",
      image: "Imagen",
      music: "Música"
    }[kind];
    icon = {
      text: "text",
      image: "image",
      music: "music"
    }[kind];
    const set = p => changeEl(kind, el.id, p);
    body = /*#__PURE__*/React.createElement(ElementBody, {
      kind: kind,
      el: el,
      set: set,
      tab: tab[tkey] || "track",
      playing: playing,
      setPlaying: setPlaying
    });
    footer = /*#__PURE__*/React.createElement(ElementFooter, {
      el: el,
      set: set,
      a: a
    });
  } else return null;
  const t = tkey && (tab[tkey] || tabs && tabs[0].id);
  return /*#__PURE__*/React.createElement(G.GlassPanel, {
    style: {
      width: 344,
      height: "calc(100vh - 32px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 16px 12px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    key: icon,
    style: {
      width: 32,
      height: 32,
      borderRadius: 99,
      background: "var(--glass-well)",
      display: "grid",
      placeItems: "center",
      animation: "lg-pop 420ms var(--glass-spring)"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("h2", {
    key: title,
    className: "lg-swap",
    style: {
      margin: 0,
      fontSize: 19,
      fontWeight: 650,
      letterSpacing: "-0.02em"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto"
    }
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "close",
    tip: "Cerrar  esc",
    filled: true,
    size: 32,
    iconSize: 14,
    onClick: onClose
  })), picker, tabs && /*#__PURE__*/React.createElement(G.IconTabs, {
    tabs: tabs,
    value: t,
    onChange: id => setTab({
      ...tab,
      [tkey]: id
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg-scroll",
    style: {
      flex: 1,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: (room ? "room" : layers ? "layers" : kind) + cardObj + t,
    "data-dir": kind === "card" && !layers && !room ? dir : undefined,
    className: "lg-swap",
    style: {
      padding: "6px 20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, body)), footer);
}
function LiquidLayers({
  st,
  sel,
  onSelect,
  onToggleLock,
  onMove
}) {
  const all = [...st.texts.map(t => ({
    ...t,
    kind: "text",
    name: t.content,
    icon: "text"
  })), ...st.images.map(t => ({
    ...t,
    kind: "image",
    name: t.name,
    thumb: t.src
  })), ...st.music.map(t => ({
    ...t,
    kind: "music",
    name: t.title,
    icon: "music"
  })), {
    id: "card",
    kind: "card",
    name: st.card.name,
    icon: "card",
    layer: 1,
    fixed: true
  }];
  const rank = r => r.layer * 1000 + (r.id === "card" ? 500 : st.order.indexOf(r.id));
  const rows = all.sort((x, y) => rank(y) - rank(x));
  return [2, 1, 0].map(l => /*#__PURE__*/React.createElement("section", {
    key: l,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg-label"
  }, LAYER_NAMES[l]), rows.filter(r => r.layer === l).map(r => {
    const on = sel && sel.id === r.id;
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      onClick: () => onSelect({
        kind: r.kind,
        id: r.id
      }),
      className: "lg-tile",
      "data-on": on || undefined,
      style: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        padding: "0 8px 0 10px",
        borderRadius: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "lg-tile__ico",
      style: {
        borderRadius: 10
      }
    }, r.thumb ? /*#__PURE__*/React.createElement("img", {
      src: r.thumb,
      alt: "",
      style: {
        width: 30,
        height: 30,
        objectFit: "contain"
      }
    }) : /*#__PURE__*/React.createElement(G.Icon, {
      name: r.icon,
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 550,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, r.name), !r.fixed && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.GlassButton, {
      icon: "arrow-up",
      tip: "Subir",
      size: 30,
      iconSize: 14,
      onClick: () => onMove(r.id, 1)
    }), /*#__PURE__*/React.createElement(G.GlassButton, {
      icon: "arrow-down",
      tip: "Bajar",
      size: 30,
      iconSize: 14,
      onClick: () => onMove(r.id, -1)
    }), /*#__PURE__*/React.createElement(G.GlassButton, {
      icon: r.locked ? "lock" : "unlock",
      tip: r.locked ? "Desbloquear" : "Bloquear",
      size: 30,
      iconSize: 14,
      onClick: () => onToggleLock(r.kind, r.id)
    })));
  })));
}
function AddMenu({
  onAdd,
  onImage,
  onClose
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const d = e => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest("[data-rail]")) onClose();
    };
    document.addEventListener("mousedown", d);
    return () => document.removeEventListener("mousedown", d);
  }, []);
  const items = [["text", "text", "Texto", "Título, frase, lo que quieras", () => onAdd("text")], ["image", "image", "Imagen", "Foto, logo o GIF", onImage], ["music", "music", "Música", "Un reproductor con tu canción", () => onAdd("music")]];
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "lg lg-glass lg-pop lg-menu",
    style: {
      position: "absolute",
      left: 80,
      top: "50%",
      transform: "translateY(-90px)",
      width: 280,
      zIndex: 9000,
      padding: 8,
      gap: 4,
      transformOrigin: "left center"
    }
  }, items.map(([id, ic, l, sub, fn], i) => /*#__PURE__*/React.createElement("button", {
    key: id,
    type: "button",
    className: "lg-menu__item",
    style: {
      height: 60,
      gap: 12,
      animationDelay: i * 30 + "ms"
    },
    onClick: fn
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 14,
      display: "grid",
      placeItems: "center",
      background: "var(--glass-well)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: ic,
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--glass-ink-2)"
    }
  }, sub)))));
}
function PublishButton({
  pending,
  onPublish
}) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);
  return /*#__PURE__*/React.createElement("button", {
    className: "lg-pill lg-pill--brand",
    "data-done": done || undefined,
    style: {
      marginLeft: 4,
      minWidth: 112,
      justifyContent: "center"
    },
    onClick: () => {
      if (!pending) return;
      onPublish();
      setDone(true);
    },
    "aria-disabled": !pending || undefined
  }, done ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(G.Icon, {
    name: "check",
    size: 15
  }), /*#__PURE__*/React.createElement("span", {
    key: "d",
    className: "lg-swap"
  }, "Publicado")) : /*#__PURE__*/React.createElement(React.Fragment, null, "Publicar", pending > 0 && /*#__PURE__*/React.createElement("span", {
    key: pending,
    className: "lg-badge"
  }, pending)));
}
function LiquidShell(b) {
  const {
    st,
    sel,
    panel,
    setPanel,
    H,
    th,
    setTheme,
    pending,
    addOpen,
    setAddOpen
  } = b;
  const [dropOver, setDropOver] = React.useState(false);
  const rail = [{
    id: "select",
    icon: "pointer",
    tip: "Seleccionar   V"
  }, {
    id: "add",
    icon: "plus",
    tip: "Agregar   A"
  }, {
    id: "layers",
    icon: "layers",
    tip: "Capas   L"
  }, {
    id: "room",
    icon: "room",
    tip: "Tu sala"
  }];
  const act = addOpen ? "add" : panel === "layers" ? "layers" : panel === "room" ? "room" : "select";
  const dockOpen = panel === "layers" || panel === "room" || panel === "inspector" && sel;
  const onDrop = e => {
    e.preventDefault();
    setDropOver(false);
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const r = b.rootRef.current.getBoundingClientRect();
    b.add("image", {
      url: URL.createObjectURL(f),
      name: f.name
    }, {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: b.rootRef,
    className: "mn-root lg",
    style: {
      position: "fixed",
      inset: 0,
      overflow: "hidden"
    },
    onDragOver: e => {
      if ([...e.dataTransfer.types].includes("Files")) {
        e.preventDefault();
        setDropOver(true);
      }
    },
    onDragLeave: e => {
      if (e.target === e.currentTarget || !e.relatedTarget) setDropOver(false);
    },
    onDrop: onDrop
  }, /*#__PURE__*/React.createElement(Canvas, {
    st: st,
    sel: sel,
    onSelect: s => {
      b.setSel(s);
      b.setCtx(null);
    },
    cardObj: b.cardObj,
    inspector: panel === "inspector" && !!sel,
    docW: dockOpen ? 300 : 0,
    onPart: id => {
      b.setCardObj(id);
      setPanel("inspector");
    },
    openInspector: () => b.openInspector(),
    begin: H.begin,
    set: b.setEl,
    change: b.changeEl,
    onContext: b.onContext,
    echo: b.echo,
    playing: b.playing,
    setPlaying: b.setPlaying,
    toolbarFor: b.toolbarFor
  }), dropOver && /*#__PURE__*/React.createElement("div", {
    className: "ml-dropveil"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass lg-hint",
    style: {
      color: "var(--glass-ink)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 99,
      display: "grid",
      placeItems: "center",
      background: "var(--glass-accent)",
      color: "var(--glass-accent-ink)"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "image",
    size: 14
  })), "Solt\xE1 para agregar a tu sala")), /*#__PURE__*/React.createElement("div", {
    "data-rail": true,
    style: {
      position: "absolute",
      left: 16,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 801
    }
  }, /*#__PURE__*/React.createElement(G.GlassRail, {
    items: rail,
    value: act,
    onSelect: id => {
      if (id === "add") setAddOpen(o => !o);else if (id === "select") {
        setAddOpen(false);
        setPanel(sel ? "inspector" : null);
      } else {
        setAddOpen(false);
        setPanel(p => p === id ? null : id);
      }
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass",
    style: {
      position: "absolute",
      left: 16,
      top: 16,
      zIndex: 800,
      height: 52,
      padding: "0 18px 0 8px",
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo.png",
    alt: "",
    style: {
      width: 34,
      marginLeft: 4
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: "-0.055em"
    }
  }, "myLand"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--glass-ink-2)"
    }
  }, "@mara"), /*#__PURE__*/React.createElement("span", {
    title: pending ? "Cambios sin publicar" : "Todo publicado",
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: pending ? "var(--glass-accent)" : "var(--glass-success)",
      transition: "background 300ms",
      marginLeft: 2
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass",
    style: {
      position: "absolute",
      right: dockOpen ? 376 : 16,
      top: 16,
      zIndex: 800,
      height: 52,
      padding: 6,
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      gap: 2,
      transition: "right 520ms var(--glass-spring)"
    }
  }, /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "undo",
    tip: "Deshacer   \u2318Z",
    tipSide: "bottom",
    size: 40,
    disabled: !H.canUndo,
    onClick: b.undo
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: "redo",
    tip: "Rehacer   \u21E7\u2318Z",
    tipSide: "bottom",
    size: 40,
    disabled: !H.canRedo,
    onClick: b.redo
  }), /*#__PURE__*/React.createElement(G.GlassButton, {
    icon: th[2],
    tip: "Tema: " + th[1],
    tipSide: "bottom",
    size: 40,
    onClick: () => setTheme(th[0] === "dark" ? "light" : "dark")
  }), /*#__PURE__*/React.createElement(PublishButton, {
    pending: pending,
    onPublish: b.publish
  })), dockOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 16,
      top: 16,
      zIndex: 900
    }
  }, /*#__PURE__*/React.createElement(LiquidDock, {
    sel: sel,
    st: st,
    find: b.find,
    cardObj: b.cardObj,
    setCardObj: b.setCardObj,
    changeCard: b.changeCard,
    changeEl: b.changeEl,
    changeRoom: b.changeRoom,
    onClose: () => setPanel(null),
    a: b.actions,
    playing: b.playing,
    setPlaying: b.setPlaying,
    layers: panel === "layers",
    room: panel === "room",
    layersProps: {
      st,
      sel,
      onSelect: b.setSel,
      onToggleLock: b.toggleLock,
      onMove: b.move
    }
  })), !sel && !dockOpen && !addOpen && /*#__PURE__*/React.createElement("div", {
    className: "lg lg-glass lg-hint",
    style: {
      position: "absolute",
      left: "50%",
      bottom: 24,
      transform: "translateX(-50%)",
      zIndex: 700
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 99,
      display: "grid",
      placeItems: "center",
      background: "var(--glass-well)"
    }
  }, /*#__PURE__*/React.createElement(G.Icon, {
    name: "pointer",
    size: 14
  })), "Toc\xE1 algo para editarlo", /*#__PURE__*/React.createElement("kbd", null, "A"), "agregar"), addOpen && /*#__PURE__*/React.createElement(AddMenu, {
    onAdd: b.add,
    onImage: () => {
      setAddOpen(false);
      b.addImage();
    },
    onClose: () => setAddOpen(false)
  }), b.ctxEl, /*#__PURE__*/React.createElement(G.GlassToast, {
    toast: b.toast,
    onAction: b.undo
  }));
}
Object.assign(window, {
  LiquidShell,
  LiquidTB
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/Liquid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/ProfileCard.jsx
try { (() => {
// The ProfileCard as the canvas renders it (cosmetic recreation of
// src/components/canvas/ProfileCard.tsx): photo · name · @handle · descriptor ·
// location · bio · views · links, with the card background and effects.
function roleStyle(r, all) {
  const sh = [];
  if (all.shadow) sh.push("0 2px 6px rgba(0,0,0,0.45)");
  if (all.glow) sh.push(`0 0 10px ${r.color}`);
  return {
    fontFamily: fontFamily(r.font),
    color: r.color,
    fontSize: r.size,
    fontWeight: r.weight,
    letterSpacing: r.ls,
    textTransform: r.upper ? "uppercase" : "none",
    lineHeight: r.lh || 1.15,
    textShadow: sh.join(",") || undefined,
    WebkitTextStroke: all.outline ? `0.6px ${r.color === "#FFFFFF" ? "#2A1630" : "#FFFFFF"}` : undefined,
    filter: all.blur ? `blur(${all.blur}px)` : undefined,
    margin: 0
  };
}
function Part({
  id,
  active,
  onPart,
  children,
  style,
  as = "div"
}) {
  const Tag = as;
  const on = active === id;
  return /*#__PURE__*/React.createElement(Tag, {
    "data-role": id,
    className: "ml-part",
    onClick: onPart ? e => {
      e.stopPropagation();
      onPart(id);
    } : undefined,
    style: {
      position: "relative",
      borderRadius: 6,
      cursor: onPart ? "pointer" : undefined,
      outline: on ? "2px solid var(--glass-accent)" : undefined,
      outlineOffset: 5,
      boxShadow: on ? "0 0 0 8px var(--glass-accent-soft)" : undefined,
      transition: "outline-offset 300ms var(--glass-spring), box-shadow 300ms",
      ...style
    }
  }, children);
}
function ProfileCard({
  card,
  active,
  onPart,
  echo
}) {
  const {
    bg,
    fx,
    roles,
    allText: all,
    photo
  } = card;
  const shadows = [];
  if (fx.shadow.on) shadows.push(`0 ${24 * fx.shadow.intensity}px ${60 * fx.shadow.intensity}px -10px ${fx.shadow.color}`);
  if (fx.glow.on && fx.glow.mode !== "Interior") shadows.push(`0 0 ${40 * fx.glow.intensity}px ${fx.glow.color}`);
  if (fx.glow.on && fx.glow.mode !== "Exterior") shadows.push(`inset 0 0 ${30 * fx.glow.intensity}px ${fx.glow.color}`);
  if (fx.border.on) shadows.push(`inset 0 0 0 ${fx.border.width}px ${hexA(fx.border.color, fx.border.opacity)}`);
  const background = [bg.image ? `url(${bg.image}) center/cover` : null, bg.gradient ? `linear-gradient(${bg.angle}deg, ${hexA(bg.from, bg.gradOpacity)}, ${hexA(bg.to, bg.gradOpacity)})` : null, hexA(bg.color, bg.opacity)].filter(Boolean).join(",");
  const anim = [fx.float.on ? `mlFloat ${fx.float.speed}s ease-in-out infinite` : null, fx.glow.on && fx.glow.pulse ? "mlPulse 1.8s ease-in-out infinite" : null].filter(Boolean).join(",");
  const align = all.align;
  const items = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const photoRadius = {
    circle: "50%",
    rounded: "22%",
    square: "8px",
    none: 0
  }[photo.shape];
  return /*#__PURE__*/React.createElement("div", {
    className: active ? "ml-card ml-card--editing" : "ml-card",
    style: {
      width: card.w,
      height: card.h,
      borderRadius: card.radius,
      background,
      boxShadow: shadows.join(",") || undefined,
      "--ml-float": `-${fx.float.height}px`,
      animation: anim || undefined,
      position: "relative",
      overflow: "hidden",
      backdropFilter: bg.glass ? `blur(${bg.blur || 12}px)` : undefined,
      transform: fx.tilt.on ? `perspective(900px) rotateY(${-fx.tilt.intensity / 2}deg) rotateX(${fx.tilt.intensity / 3}deg)` : undefined,
      display: "flex",
      flexDirection: "column",
      alignItems: items,
      textAlign: align,
      padding: "34px 28px 26px",
      gap: 6
    }
  }, echo > 0 && /*#__PURE__*/React.createElement("div", {
    key: echo,
    className: "ml-echo",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: card.radius,
      pointerEvents: "none"
    }
  }), fx.grain.on && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: fx.grain.amount,
      mixBlendMode: "overlay",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")"
    }
  }), fx.scan.on && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      opacity: fx.scan.amount,
      background: "repeating-linear-gradient(0deg,rgba(0,0,0,0.5) 0 1px,transparent 1px 3px)"
    }
  }), fx.spotlight.on && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(circle at 30% 20%, ${hexA(fx.spotlight.color, 0.35)}, transparent ${fx.spotlight.size}%)`
    }
  }), /*#__PURE__*/React.createElement(Part, {
    id: "photo",
    active: active,
    onPart: onPart,
    style: {
      alignSelf: "center",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: photo.size,
      height: photo.size,
      borderRadius: photoRadius,
      backgroundImage: "url(../../assets/ld-card-user.png)",
      backgroundSize: "460%",
      backgroundPosition: "50% 31%",
      boxShadow: [photo.border ? `0 0 0 3px ${photo.borderColor}` : null, photo.shadow ? "0 10px 24px rgba(0,0,0,0.35)" : null, photo.glow ? `0 0 26px ${photo.glowColor}` : null].filter(Boolean).join(",") || undefined,
      animation: photo.glow && photo.pulse ? "mlPulse 1.8s ease-in-out infinite" : undefined
    }
  })), /*#__PURE__*/React.createElement(Part, {
    id: "name",
    active: active,
    onPart: onPart
  }, /*#__PURE__*/React.createElement("h1", {
    style: roleStyle(roles.name, all)
  }, card.name)), /*#__PURE__*/React.createElement(Part, {
    id: "handle",
    active: active,
    onPart: onPart
  }, /*#__PURE__*/React.createElement("div", {
    style: roleStyle(roles.handle, all)
  }, card.handle)), /*#__PURE__*/React.createElement(Part, {
    id: "descriptor",
    active: active,
    onPart: onPart,
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: roleStyle(roles.descriptor, all)
  }, card.descriptor)), /*#__PURE__*/React.createElement(Part, {
    id: "location",
    active: active,
    onPart: onPart
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...roleStyle(roles.location, all),
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(MY.Icon, {
    name: "pin",
    size: 12
  }), card.location)), /*#__PURE__*/React.createElement(Part, {
    id: "bio",
    active: active,
    onPart: onPart,
    style: {
      marginTop: 8,
      maxWidth: 250
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: roleStyle(roles.bio, all)
  }, card.bio)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), card.showViews && /*#__PURE__*/React.createElement(Part, {
    id: "views",
    active: active,
    onPart: onPart,
    style: {
      alignSelf: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...roleStyle(roles.views, all),
      padding: "6px 14px",
      borderRadius: 999,
      background: "rgba(255,255,255,0.14)",
      backdropFilter: "blur(6px)"
    }
  }, card.views, " views")), /*#__PURE__*/React.createElement(Part, {
    id: "links",
    active: active,
    onPart: onPart,
    style: {
      alignSelf: "center",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      color: card.linkColor
    }
  }, card.links.map(l => /*#__PURE__*/React.createElement(MY.Icon, {
    key: l.id,
    name: l.platform,
    size: card.linkSize
  })))), card.logo.src && /*#__PURE__*/React.createElement("img", {
    src: card.logo.src,
    alt: "",
    style: {
      position: "absolute",
      top: 16,
      right: 16,
      width: card.logo.size,
      opacity: card.logo.opacity,
      transform: `rotate(${card.logo.rotation}deg)`
    }
  }));
}
function hexA(hex, a = 1) {
  const h = (hex || "#000000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
Object.assign(window, {
  ProfileCard,
  roleStyle,
  hexA
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/ProfileCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/data.jsx
try { (() => {
// Fonts the canvas offers (subset of src/lib/fontList CANVAS_FONTS, loaded in globals.css).
const CANVAS_FONTS = [{
  key: "Newsreader",
  label: "Newsreader",
  family: "'Newsreader',serif",
  category: "serif"
}, {
  key: "Playfair Display",
  label: "Playfair",
  family: "'Playfair Display',serif",
  category: "serif"
}, {
  key: "DM Sans",
  label: "DM Sans",
  family: "'DM Sans',sans-serif",
  category: "sans"
}, {
  key: "Archivo",
  label: "Archivo",
  family: "'Archivo',sans-serif",
  category: "sans"
}, {
  key: "Syne",
  label: "Syne",
  family: "'Syne',sans-serif",
  category: "display"
}, {
  key: "Bebas Neue",
  label: "Bebas Neue",
  family: "'Bebas Neue',sans-serif",
  category: "display"
}, {
  key: "Space Mono",
  label: "Space Mono",
  family: "'Space Mono',monospace",
  category: "mono"
}, {
  key: "Pacifico",
  label: "Pacifico",
  family: "'Pacifico',cursive",
  category: "script"
}, {
  key: "Great Vibes",
  label: "Great Vibes",
  family: "'Great Vibes',cursive",
  category: "script"
}];
const fontFamily = k => (CANVAS_FONTS.find(f => f.key === k) || CANVAS_FONTS[2]).family;
const ROLE_DEFAULTS = {
  name: {
    font: "Newsreader",
    color: "#FFFFFF",
    size: 40,
    weight: 400,
    ls: -0.5,
    upper: false
  },
  handle: {
    font: "DM Sans",
    color: "#FFD1E4",
    size: 14,
    weight: 500,
    ls: 0.5,
    upper: false
  },
  descriptor: {
    font: "Space Mono",
    color: "#FFFFFF",
    size: 11,
    weight: 400,
    ls: 1.5,
    upper: true
  },
  location: {
    font: "DM Sans",
    color: "#FFD1E4",
    size: 12,
    weight: 400,
    ls: 0,
    upper: false
  },
  bio: {
    font: "DM Sans",
    color: "#FFFFFF",
    size: 13,
    weight: 400,
    ls: 0,
    upper: false,
    lh: 1.45
  },
  views: {
    font: "Space Mono",
    color: "#FFFFFF",
    size: 11,
    weight: 400,
    ls: 1,
    upper: true
  }
};
const INITIAL = {
  card: {
    x: 0,
    y: 0,
    w: 320,
    h: 470,
    name: "Mara Ríos",
    handle: "@mara",
    descriptor: "fotos, ruido y cosas lindas",
    location: "Buenos Aires",
    bio: "Coleccionista de llaveros, discos rayados y atardeceres desde la terraza.",
    views: 275,
    showViews: true,
    roles: JSON.parse(JSON.stringify(ROLE_DEFAULTS)),
    photo: {
      size: 104,
      shape: "circle",
      border: true,
      borderColor: "#FFFFFF",
      shadow: true,
      glow: false,
      glowColor: "#FF4F94",
      pulse: false
    },
    links: [{
      id: "l1",
      platform: "instagram",
      url: "instagram.com/mara"
    }, {
      id: "l2",
      platform: "youtube",
      url: "youtube.com/@mara"
    }, {
      id: "l3",
      platform: "twitch",
      url: "twitch.tv/mara"
    }],
    linkSize: 20,
    linkColor: "#FFFFFF",
    logo: {
      src: null,
      size: 40,
      opacity: 1,
      rotation: 0
    },
    bg: {
      color: "#3A0F24",
      opacity: 1,
      gradient: true,
      from: "#FF4F94",
      to: "#2A1630",
      angle: 165,
      gradOpacity: 0.9,
      glass: false,
      blur: 0,
      image: null
    },
    radius: 28,
    fx: {
      border: {
        on: true,
        width: 1,
        color: "#FFFFFF",
        opacity: 0.35
      },
      shadow: {
        on: true,
        intensity: 0.6,
        color: "#2A0A1A"
      },
      glow: {
        on: false,
        mode: "Exterior",
        color: "#FF4F94",
        intensity: 0.6,
        pulse: false
      },
      float: {
        on: false,
        height: 8,
        speed: 3
      },
      tilt: {
        on: false,
        intensity: 6
      },
      spotlight: {
        on: false,
        color: "#FFFFFF",
        size: 60
      },
      grain: {
        on: false,
        amount: 0.35
      },
      scan: {
        on: false,
        amount: 0.25
      }
    },
    allText: {
      align: "center",
      shadow: false,
      glow: false,
      outline: false,
      blur: 0
    }
  },
  texts: [{
    id: "t1",
    content: "bienvenidx a mi sala",
    font: "Pacifico",
    size: 34,
    ls: 0,
    upper: false,
    color: "#2A0A1A",
    opacity: 1,
    x: 120,
    y: 120,
    rotation: -6,
    layer: 2,
    locked: false
  }],
  images: [],
  music: [{
    id: "m1",
    title: "Heaven or Las Vegas",
    artist: "Cocteau Twins",
    x: 150,
    y: 330,
    w: 260,
    h: 84,
    volume: 0.8,
    bg: {
      color: "#FFFFFF",
      opacity: 0.72,
      blur: 12,
      glass: true,
      gradient: false,
      from: "#FF4F94",
      to: "#9B85FF",
      angle: 135
    },
    textColor: "#2A0A1A",
    textSize: 12,
    font: "DM Sans",
    fx: {
      outer: false,
      inner: false,
      glowColor: "#FF4F94",
      glowIntensity: 0.5,
      shadow: true,
      shadowIntensity: 0.4,
      borderColor: "#FFFFFF",
      borderWidth: 1,
      radius: 18,
      floating: true,
      floatHeight: 6,
      floatSpeed: 4,
      tilt: false,
      tiltIntensity: 6,
      spotlight: false,
      hoverGlow: false
    },
    layer: 1,
    locked: false
  }]
};
const ROLE_IDS = ["name", "handle", "descriptor", "location", "bio", "views"];
const CONTENT_KEY = {
  name: "name",
  handle: "handle",
  descriptor: "descriptor",
  location: "location",
  bio: "bio"
};
const PLACEHOLDER = {
  name: "Tu nombre",
  descriptor: "Frase corta",
  location: "Ubicación",
  bio: "Contá algo de vos"
};
function setIn(obj, path, v) {
  const [k, ...rest] = path;
  return Array.isArray(obj) ? obj.map((x, i) => i === k ? rest.length ? setIn(x, rest, v) : v : x) : {
    ...obj,
    [k]: rest.length ? setIn(obj[k], rest, v) : v
  };
}
const pct = v => Math.round(v * 100) + "%";
const excerpt = (s, n = 24) => s.length > n ? s.slice(0, n - 1) + "…" : s;
// Opens the OS file picker; resolves { url, name } (object URL) or null.
function pickFile(accept = "image/*") {
  return new Promise(res => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = accept;
    i.onchange = () => {
      const f = i.files && i.files[0];
      res(f ? {
        url: URL.createObjectURL(f),
        name: f.name
      } : null);
    };
    i.click();
  });
}
const DEFAULT_ROOM = {
  from: "#FBE3EE",
  to: "#DCD5F6",
  grain: true
};
const LAYER_NAMES = ["Fondo", "Medio", "Frente"];
function cardColors(card) {
  const set = new Set([card.roles.name.color, card.roles.handle.color, card.bg.from, card.bg.to, card.bg.color, card.fx.glow.color, "#FFFFFF", "#0B0B0C"].map(c => c.toUpperCase()));
  return [...set].slice(0, 6);
}
Object.assign(window, {
  CANVAS_FONTS,
  fontFamily,
  ROLE_DEFAULTS,
  INITIAL,
  LAYER_NAMES,
  cardColors,
  ROLE_IDS,
  CONTENT_KEY,
  PLACEHOLDER,
  setIn,
  pct,
  excerpt,
  pickFile,
  DEFAULT_ROOM
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/ds-loader.js
try { (() => {
// Loads the compiled MYLAND bundle; if it is not built yet, compiles the
// component sources in-browser (same files, same order). Exposes window.MY
// (lazy proxy) and window.MYLAND_READY.
(function () {
  const base = document.currentScript && document.currentScript.dataset.base || "../..";
  const NS = "MYLANDDesignSystem_d61b78";
  const files = ["core/Icon.jsx", "glass/GlassPanel.jsx", "glass/ColorPopover.jsx", "glass/ContextMenu.jsx", "glass/FontSelect.jsx"].map(f => "components/" + f);
  window.MY = new Proxy({}, {
    get: (_, k) => window.MYLAND && window.MYLAND[k]
  });
  async function fallback() {
    const ns = {};
    const get = async (f, n = 3) => {
      try {
        const r = await fetch(base + "/" + f, {
          cache: "no-cache"
        });
        if (!r.ok) throw r.status;
        return await r.text();
      } catch (e) {
        if (n > 0) return get(f, n - 1);
        throw e;
      }
    };
    const srcs = await Promise.all(files.map(f => get(f)));
    for (let fi = 0; fi < files.length; fi++) {
      const src = srcs[fi];
      if (window.__dsDebug) console.log("ds", files[fi]);
      let code = src.replace(/^import[^\n]*$/gm, "");
      const names = [];
      code = code.replace(/export (function|const|class) (\w+)/g, (m, k, n) => {
        names.push(n);
        return k + " " + n;
      });
      const out = Babel.transform(code, {
        presets: ["react"]
      }).code;
      const prelude = "const {useState,useRef,useEffect,useLayoutEffect,useMemo,useCallback,createContext,useContext}=React;" + Object.keys(ns).map(k => `const ${k}=__ns.${k};`).join("");
      Object.assign(ns, new Function("React", "__ns", prelude + out + ";return {" + names.join(",") + "};")(React, ns));
    }
    window.MYLAND = ns;
  }
  // Always compile the component sources: the generated bundle also contains this kit's own App and would mount it twice.
  window.MYLAND_READY = fallback().catch(e => console.error("ds-loader", e));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/ds-loader.js", error: String((e && e.message) || e) }); }

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ColorPopover = __ds_scope.ColorPopover;

__ds_ns.ContextMenu = __ds_scope.ContextMenu;

__ds_ns.GOOGLE_CATALOG = __ds_scope.GOOGLE_CATALOG;

__ds_ns.FontSelect = __ds_scope.FontSelect;

__ds_ns.GlassPanel = __ds_scope.GlassPanel;

__ds_ns.GlassButton = __ds_scope.GlassButton;

__ds_ns.LiquidSlider = __ds_scope.LiquidSlider;

__ds_ns.IconTabs = __ds_scope.IconTabs;

__ds_ns.PartPicker = __ds_scope.PartPicker;

__ds_ns.ColorRibbon = __ds_scope.ColorRibbon;

__ds_ns.LiquidSwitch = __ds_scope.LiquidSwitch;

__ds_ns.ControlTiles = __ds_scope.ControlTiles;

__ds_ns.GlassToolbar = __ds_scope.GlassToolbar;

__ds_ns.GlassRail = __ds_scope.GlassRail;

__ds_ns.GlassToast = __ds_scope.GlassToast;

})();
