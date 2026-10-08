// Menu redesign Phase 1 — ONE source for the editor's design values.
//
// T.ui / T.motion (tokens.ts) generate every `--ui-*` custom property
// (uiCssVars), injected once by layout.tsx. editor.css only REFERENCES
// them. These tests replace Iteration 0's hand-kept parity list: instead of
// checking a few mirrored values, they make a second source impossible.
//
// Guard (CLAUDE.md, "Tokens: una sola fuente"): fails on literal colors or
// legacy tokens in src/ui and in the editor menus. The menus scheduled for
// rewrite (Phases 2–4) carry a frozen baseline of legacy usages that may
// only shrink — a new one fails, and so does a removed one until the
// baseline is lowered (so it ratchets down, never back up).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import {
  T, uiCssVars, uiCssVarsStylesheet, UI_VARS_SCOPE, CANVAS_VARS_SCOPE, canvasCssVars, themeCssVars,
  themeSelector, themeLockSelector, EDITOR_THEME_NAMES, LOCKABLE_THEMES, uv,
} from "./tokens";
import { CANVAS_FONTS } from "@/lib/fontList";
import { getFreeformCardBounds } from "@/lib/cardGeometry";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const css = stripComments(read("src/ui/editor.css"));
const vars = uiCssVars();

/** A literal color: a hex, or rgb()/rgba()/hsl() with numeric arguments
 * (`rgba(${r},…)` built from the user's own color is not a literal). */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]|(?<![-\w.'"])(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|lime|cyan|magenta)(?![-\w])/g;
/** Legacy (pre-Block 2) color tokens — kept only because cards render with
 * them; the editor reads T.ui. */
const LEGACY_TOKEN = /\bT\.(?:surface|text|border|accent|shadow)\b|\bT\s*\[|\bT\s+as\s+\w|\{[^}]*\b(?:surface|text|border|accent|shadow)\b[^}]*\}\s*=\s*T\b/g;

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

// ── Generation ──────────────────────────────────────────────────────────────

test("every var(--ui-*) referenced by editor.css or a component is generated from T.ui", () => {
  const sources = [css, ...listSources("src/ui"), ...listSources("src/components/canvas")].join("\n");
  const used = new Set([...sources.matchAll(/var\((--ui-[\w-]+)/g)].map(m => m[1]));
  assert.ok(used.size > 20, "editor.css should reference the generated variables");
  // tokens.ts builds `var(--ui-theme-${key}` references: a template prefix, not a name.
  for (const name of used) if (name !== "--ui-theme-") assert.ok(name in vars, `${name} is referenced but not generated from T.ui`);
});

test("editor.css declares no --ui-* value of its own (tokens.ts is the only source)", () => {
  assert.deepEqual([...css.matchAll(/(--ui-[\w-]+)\s*:/g)].map(m => m[1]), []);
});

test("generated names follow --ui-<group>-<key> and carry the token values", () => {
  assert.equal(vars["--ui-text-primary"], T.ui.text.primary);
  assert.equal(vars["--ui-text-tertiary"], T.ui.text.tertiary);
  assert.equal(vars["--ui-surface-control-hover"], T.ui.surface.controlHover);
  assert.equal(vars["--ui-shadow-ring"], T.ui.shadow.ring);
  assert.equal(vars["--ui-opacity-disabled"], "0.38");
  assert.equal(vars["--ui-radius-panel"], "16px");
  assert.equal(vars["--ui-motion-fast"], `${T.motion.fast}ms`);
  assert.equal(vars["--ui-motion-ease"], T.motion.ease);
});

test("the injected stylesheet defines every variable under the editor scope", () => {
  const sheet = uiCssVarsStylesheet();
  assert.ok(sheet.startsWith(`${UI_VARS_SCOPE}{`));
  for (const [k, v] of Object.entries(vars)) assert.ok(sheet.includes(`${k}:${v};`), k);
  assert.ok(!sheet.includes("<"), "must be safe to inline in a <style> tag");
});

test("layout.tsx injects the generated stylesheet and imports editor.css", () => {
  const layout = read("src/app/layout.tsx");
  assert.ok(layout.includes("uiCssVarsStylesheet()"));
  assert.ok(layout.includes('import "@/ui/editor.css"'));
});

test("layout.tsx: theme boot script BEFORE the tokens, dark default on <html>, next/font editor families", () => {
  const layout = stripComments(read("src/app/layout.tsx"));
  const script = layout.indexOf("editorThemeBootScript()");
  const tokens = layout.indexOf("uiCssVarsStylesheet()", layout.indexOf("<head>"));
  assert.ok(script > 0 && tokens > script, "boot script must run before first paint, ahead of the tokens");
  assert.match(layout, /data-editor-theme=\{DEFAULT_EDITOR_THEME\}/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(layout, /from "next\/font\/google"/);
  for (const v of ["--font-display", "--font-sans", "--font-mono", "--font-serif"]) assert.ok(layout.includes(`variable: "${v}"`), v);
  for (const f of ["Bricolage_Grotesque", "Geist", "Geist_Mono", "Instrument_Serif"]) assert.ok(layout.includes(f), f);
  // r2 (Regression-1): never preloaded on every route (the public page doesn't use them).
  assert.equal((layout.match(/preload: false/g) ?? []).length, 4, "the 4 editor families must not be preloaded");
  // globals.css (the canvas fonts) is untouched: still imported, never replaced.
  assert.ok(layout.includes('import "./globals.css"'));
});

// ── No second source ────────────────────────────────────────────────────────

test("editor.css carries no literal colors (only var(--ui-*) and system colors)", () => {
  // The one exception: a CSS var cannot reach inside a data: URI. The select
  // chevron's stroke is pinned to T.ui.text.secondary instead.
  const DATA_URI = /url\("data:image\/svg\+xml,[^"]*"\)/g;
  const uris = css.match(DATA_URI) ?? [];
  assert.equal(uris.length, 1, "only the select chevron may use a data: URI");
  // v3: a var() cannot reach a data: URI, so the chevron is pinned to ONE
  // theme-neutral grey, T.ui.accent.chevron (>= 3:1 on every field, below).
  const stroke = `stroke='${T.ui.accent.chevron.replace("#", "%23")}'`;
  assert.ok(uris[0].includes(stroke), "select chevron stroke == T.ui.accent.chevron");
  assert.deepEqual(uris[0].replace(stroke, "").match(COLOR_LITERAL) ?? [], []);
  assert.ok(!/%23[0-9a-fA-F]{3,8}/.test(uris[0].replace(stroke, "")), "no other encoded color");
  assert.deepEqual(css.replace(DATA_URI, "").match(COLOR_LITERAL) ?? [], []);
});

function listSources(dir: string): string[] {
  return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter(e => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map(e => stripComments(readFileSync(join(e.parentPath, e.name), "utf8")));
}

test("src/ui components: no literal colors and no legacy color tokens", () => {
  const files = readdirSync(join(root, "src/ui"), { recursive: true, withFileTypes: true })
    .filter(e => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && e.name !== "tokens.ts");
  assert.ok(files.length > 10);
  for (const f of files) {
    const src = stripComments(readFileSync(join(f.parentPath, f.name), "utf8"));
    assert.deepEqual(src.match(COLOR_LITERAL) ?? [], [], `${f.name}: literal color — add a token to T.ui`);
    assert.deepEqual(src.match(LEGACY_TOKEN) ?? [], [], `${f.name}: legacy token — use T.ui`);
  }
});

// Menus: the editor surfaces that Phases 2–4 rewrite. Frozen baseline of
// legacy usages at Phase 1 (all T.border/T.text/T.surface dividers and the
// avatar placeholder) — may only go DOWN. Anything not listed must be 0.
const MENU_FILES = [
  "src/components/canvas/ProfileConfigMenu.tsx",
  "src/components/canvas/ProfileIdentityMenu.tsx",
  "src/components/canvas/ProfileMetadataMenu.tsx",
  "src/components/canvas/ProfileTypographyMenu.tsx",
  "src/components/canvas/ProfileBackgroundMenu.tsx",
  "src/components/canvas/ProfileEffectsMenu.tsx",
  "src/components/canvas/ProfileContactLinksMenu.tsx",
  "src/components/canvas/ProfileLogoMenu.tsx",
  "src/components/canvas/BlockStyleFields.tsx",
  "src/components/canvas/RoleTypographyFields.tsx",
  "src/components/canvas/MusicCardWidget.tsx",
  // Phase 2: the inspector's own canvas-side pieces.
  "src/components/canvas/ObjectList.tsx",
  "src/components/canvas/ProfileInspector.tsx",
];
const MENU_LEGACY_BASELINE: Record<string, number> = {
  // v3 Phase A: Identity's 5 (avatar placeholder + name input) moved to uv().
  "src/components/canvas/MusicCardWidget.tsx": 8,
};

test("editor menus: no literal colors; legacy tokens only within the shrinking baseline", () => {
  for (const f of MENU_FILES) {
    const src = stripComments(read(f));
    assert.deepEqual(src.match(COLOR_LITERAL) ?? [], [], `${f}: literal color — use a token or a named default`);
    const legacy = count(src, LEGACY_TOKEN);
    const allowed = MENU_LEGACY_BASELINE[f] ?? 0;
    assert.ok(legacy <= allowed, `${f}: ${legacy} legacy tokens (baseline ${allowed}) — use T.ui`);
    assert.equal(legacy, allowed, `${f}: legacy tokens went down to ${legacy} — lower MENU_LEGACY_BASELINE`);
  }
});

// ── Values with a contract ──────────────────────────────────────────────────

// Iteration 0's ".50 alpha" / A11Y-12 ".52 alpha" contracts are now the
// per-theme contrast tests below (tertiary/placeholder = ink3, >= 4.5:1 on
// panel AND field in every theme).
test("tertiary and placeholder text are the contrast-tested ink3", () => {
  assert.equal(T.ui.text.tertiary, T.ui.text.placeholder);
  assert.match(T.ui.text.tertiary, /^var\(--ui-theme-ink3,/);
});

// ── Review round (Phase 1): scope, contract rules, render isolation ────────

test("every T.ui group is emitted as variables", () => {
  for (const g of Object.keys(T.ui)) {
    const prefix = `--ui-${g.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}-`;
    assert.ok(Object.keys(vars).some(k => k.startsWith(prefix)), `group ${g} not emitted`);
  }
});

test("variables are defined on every editor root; the canvas only gets its neutral focus ring (+ motion)", () => {
  for (const attr of ["[data-mnemo-editor]", "[data-mnemo-ui]"]) {
    assert.ok(UI_VARS_SCOPE.includes(attr), `${attr} missing from UI_VARS_SCOPE`);
  }
  assert.ok(!UI_VARS_SCOPE.includes("[data-mnemo-canvas]"), "the canvas is NOT an editor root (A1)");
  assert.equal(CANVAS_VARS_SCOPE, ":where([data-mnemo-canvas])");
  assert.match(css, /\[data-mnemo-canvas\]:focus-visible::after\s*\{[^}]*var\(--ui-shadow-canvas-ring\)/);
});

test("contrast-carrying rules still use their contract tokens (Iteration 0 fixes)", () => {
  const rule = (sel: string) => {
    const i = css.indexOf(sel);
    assert.ok(i >= 0, `missing rule ${sel}`);
    return css.slice(i, css.indexOf("}", i));
  };
  assert.match(rule(".mn-field[data-inherited] .mn-value"), /color:\s*var\(--ui-text-tertiary\)/);
  assert.match(rule(".mn-field[data-inherited] .mn-hex"), /color:\s*var\(--ui-text-tertiary\)/);
  assert.match(rule(".mn-input::placeholder"), /color:\s*var\(--ui-text-placeholder\)/);
  assert.ok((css.match(/@media \(forced-colors: active\)/g) ?? []).length >= 2, "forced-colors blocks");
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"), "reduced-motion block");
  assert.ok(css.includes("@media (prefers-reduced-transparency: reduce)"), "reduced-transparency block");
});

test("card render never reads editor variables (they only exist inside the editor)", () => {
  for (const f of [
    "src/components/canvas/ProfileCard.tsx", "src/components/canvas/CardLayers.tsx",
    "src/components/canvas/ProfileMusicPlayer.tsx", "src/components/canvas/MusicCardWidget.tsx",
    "src/components/canvas/MobilePublicCanvas.tsx",
  ]) {
    assert.ok(!stripComments(read(f)).includes("--ui-"), `${f} reads --ui-* (undefined on the public page)`);
  }
});

// ── Phase 2: docked inspector tokens ───────────────────────────────────────

test("inspector stacking: under Music's floating menu and ColorPopover, above canvas chrome/topbar", () => {
  assert.equal(T.z.inspector, T.z.menu - 1);
  assert.ok(T.z.inspector < T.z.popover);
  assert.ok(T.z.inspector > 1000, "above the FAB (1000) and the topbar (800)");
});

test("sheet breakpoint leaves room for the widest card beside the docked inspector", () => {
  // inspectorW + the widest ProfileCard + a 16px gutter on each side: above
  // the breakpoint, the view offset can always uncover the whole card.
  const need = T.ui.size.inspectorW + getFreeformCardBounds().maxW + 2 * 16;
  assert.ok(T.ui.breakpoint.inspectorSheet >= need, `${T.ui.breakpoint.inspectorSheet} < ${need}`);
  assert.equal(T.ui.size.inspectorW, 320);
  assert.equal(T.ui.size.objChip, 32);
});

test("the docked inspector and the object chips are styled by editor.css (incl. forced colors / reduced motion)", () => {
  assert.match(css, /\.mn-panel\.mn-panel--docked\[data-mnemo-editor\]\s*\{[^}]*border-radius:\s*0/);
  assert.match(css, /\.mn-objchip\s*\{[^}]*height:\s*var\(--ui-size-obj-chip\)[^}]*border-radius:\s*var\(--ui-radius-chip\)/);
  assert.match(css, /\.mn-objchip\[aria-selected="true"\]\s*\{[^}]*border:\s*2px solid Highlight/);
  assert.match(css, /\*::after\s*\{\s*transition-property/, "reduced motion covers ::after");
  assert.match(css, /\.mn-canvas\[data-mnemo-canvas\]\s*\{\s*transition:\s*none !important/, "view offset is instant with reduced motion");
});

// ── MYLAND Editor v3 — Phase A: themes ─────────────────────────────────────

const sheet = uiCssVarsStylesheet();
/** Every rule of the injected sheet: selector -> declarations. */
const rules = [...sheet.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
const PALETTE_KEYS = Object.keys(T.theme.dark).sort();

test("the 3 palettes (light/dark/og) have the same keys, all non-empty — and every design key", () => {
  assert.deepEqual([...EDITOR_THEME_NAMES], ["light", "dark", "og"]);
  for (const t of EDITOR_THEME_NAMES) {
    assert.deepEqual(Object.keys(T.theme[t]).sort(), PALETTE_KEYS, t);
    for (const [k, v] of Object.entries(T.theme[t])) assert.ok(typeof v === "string" && v.trim().length > 0, `${t}.${k}`);
    assert.deepEqual(Object.keys(T.themeType[t]).sort(), Object.keys(T.themeType.dark).sort());
  }
  const DESIGN_KEYS = ["panel", "field", "fieldHover", "ink", "ink2", "ink3", "track", "track2", "fill", "sel", "selInk",
    "on", "knobOn", "edit", "rail", "railInk", "railSel", "railSelInk", "glass", "glassInk", "glassInk2", "glassEdge",
    "glassBtn", "pop", "popInk", "panelShadow", "seg", "segInk", "segShadow", "n1", "n2", "n3", "n4"];
  for (const k of DESIGN_KEYS) assert.ok(PALETTE_KEYS.includes(k), `design key ${k}`);
});

test("every theme variable is emitted for all 3 themes, ONLY under :root[data-editor-theme] + editor roots", () => {
  const themeVarNames = Object.keys(themeCssVars("dark")).sort();
  for (const t of EDITOR_THEME_NAMES) {
    const r = rules.find(x => x.sel === themeSelector(t));
    assert.ok(r, `rule for ${t}`);
    assert.equal(r.sel, `:root[data-editor-theme="${t}"] :where([data-mnemo-editor], [data-mnemo-ui])`);
    const declared = [...r.body.matchAll(/(--ui-theme-[\w-]+):/g)].map(m => m[1]).sort();
    assert.deepEqual(declared, themeVarNames, t);
    for (const [k, v] of Object.entries(themeCssVars(t))) assert.ok(r.body.includes(`${k}:${v};`), `${t} ${k}`);
  }
  const allowed = new Set([...EDITOR_THEME_NAMES.map(themeSelector), ...LOCKABLE_THEMES.map(themeLockSelector)]);
  for (const r of rules) {
    if (/(?:^|;)\s*--ui-theme-[\w-]+\s*:/.test(r.body)) {
      assert.ok(allowed.has(r.sel), `--ui-theme-* declared outside a theme scope: ${r.sel}`);
      assert.ok(r.sel.startsWith(":root[data-editor-theme"), r.sel);
    }
  }
  // editor.css never declares or reads a theme variable directly.
  assert.ok(!css.includes("--ui-theme-"), "editor.css must go through the semantic --ui-* tokens");
});

test("the dark lock (legacy menus) outranks the html theme and every legacy widget's MenuPanel carries it", () => {
  assert.deepEqual(LOCKABLE_THEMES, ["dark"]);
  const lock = rules.find(x => x.sel === themeLockSelector("dark"));
  assert.ok(lock, "lock rule emitted");
  assert.ok(sheet.indexOf(themeLockSelector("dark")) > sheet.indexOf(themeSelector("og")), "lock comes after the themes");
  // Specificity (0,3,0) — :root + [data-editor-theme] + [data-editor-theme="dark"] (the
  // :where() adds nothing) — vs (0,2,0) for a theme rule.
  for (const part of lock.sel.split(/, (?=:root)/)) {
    const outside = part.replace(/:where\([^)]*\)/g, "");
    assert.equal((outside.match(/\[[^\]]+\]|:root/g) ?? []).length, 3, part);
  }
  assert.match(stripComments(read("src/ui/MenuPanel.tsx")), /data-editor-theme=\{theme\}/);
  // r2: the ColorPopover (portaled to <body>) copies the lock of its anchor.
  const pop = stripComments(read("src/ui/ColorPopover.tsx"));
  assert.match(pop, /closest\("\[data-editor-theme\]"\)/);
  assert.match(pop, /data-editor-theme=\{anchorThemeLock\(anchor\)/);
  for (const f of ["LinksCardWidget", "SocialCardWidget", "StatsCardWidget", "MusicCardWidget"]) {
    const src = stripComments(read(`src/components/canvas/${f}.tsx`));
    const panels = src.match(/<MenuPanel\b[^>]*>/g) ?? [];
    assert.ok(panels.length >= 1, f);
    for (const p of panels) assert.match(p, /\btheme="dark"/, `${f}: legacy MenuPanel must be locked to dark (A7)`);
  }
});

test("the canvas scope only defines theme-neutral values: its focus ring and motion timing (A1/A6)", () => {
  const r = rules.find(x => x.sel === CANVAS_VARS_SCOPE);
  assert.ok(r);
  const names = [...r.body.matchAll(/(--ui-[\w-]+):/g)].map(m => m[1]);
  assert.deepEqual(names.filter(n => !n.startsWith("--ui-motion-")), ["--ui-shadow-canvas-ring"]);
  assert.deepEqual(Object.keys(canvasCssVars()).sort(), [...names].sort());
  assert.ok(!r.body.includes("var("), "no theme reference on the canvas");
  assert.equal(T.ui.shadow.canvasRing.includes("var("), false);
});

test("theme-mapped tokens point at --ui-theme-* with the dark value as fallback; chrome never does (A6)", () => {
  assert.equal(T.ui.text.primary, `var(--ui-theme-ink, ${T.theme.dark.ink})`);
  assert.equal(T.ui.surface.panel, `var(--ui-theme-panel, ${T.theme.dark.panel})`);
  for (const [k, v] of Object.entries(T.ui.chrome)) assert.ok(!String(v).includes("var("), `chrome.${k} must stay fixed`);
  // Chrome rules in editor.css read only chrome values (+ motion timing).
  const chromeRules = [...css.matchAll(/([^{}]*mn-canvas-btn[^{}]*)\{([^}]*)\}/g)];
  assert.ok(chromeRules.length > 5);
  for (const [, sel, body] of chromeRules) {
    for (const v of body.match(/var\(--ui-[\w-]+/g) ?? []) {
      assert.match(v, /--ui-(chrome|motion)-/, `${sel.trim()} reads ${v} (theme-dependent) — chrome must stay neutral`);
    }
  }
  assert.match(css, /\[data-mnemo-chrome\]:focus-visible\s*\{\s*box-shadow:\s*var\(--ui-chrome-ring\)/);
});

test("uv() names exist; no inline T.ui / T.theme COLOR values in src/ui or the editor menus", () => {
  assert.equal(uv("text-primary"), "var(--ui-text-primary)");
  const COLOR_GROUPS = /\bT\.(?:ui\.(?:text|surface|line|accent|shadow|picker|chrome|tone)|theme)\b/g;
  // Legacy widgets (A7: dark-locked, untouched beyond the lock) keep theirs.
  const EXEMPT = new Set(["src/components/canvas/MusicCardWidget.tsx"]);
  const uiFiles = readdirSync(join(root, "src/ui"), { recursive: true, withFileTypes: true })
    .filter(e => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && e.name !== "tokens.ts")
    .map(e => join(e.parentPath, e.name).slice(root.length + 1).replace(/\\/g, "/"));
  assert.ok(uiFiles.length > 10);
  for (const f of [...uiFiles, ...MENU_FILES.filter(f => !EXEMPT.has(f))]) {
    const src = stripComments(read(f));
    assert.deepEqual(src.match(COLOR_GROUPS) ?? [], [], `${f}: inline theme color — use uv("…")`);
    for (const m of src.matchAll(/\buv\("([\w-]+)"\)/g)) assert.ok(`--ui-${m[1]}` in vars, `${f}: uv("${m[1]}") is not generated`);
  }
});

test("editor fonts are NOT canvas fonts (no profile can render with them)", () => {
  const editorFamilies = ["Bricolage Grotesque", "Geist", "Geist Mono", "Instrument Serif"];
  for (const f of CANVAS_FONTS) {
    for (const e of editorFamilies) {
      assert.notEqual(f.key, e);
      assert.ok(!new RegExp(`['"]${e}['"]`).test(f.style), `${f.key} uses ${e}`);
    }
    assert.ok(!/--font-(display|sans|mono|serif)|--ui-/.test(f.style), `${f.key} reads an editor font variable`);
  }
  const globals = read("src/app/globals.css");
  for (const e of editorFamilies) assert.ok(!globals.includes(`family=${e.replace(/ /g, "+")}:`) && !globals.includes(`family=${e.replace(/ /g, "+")}&`), `globals.css loads ${e}`);
  for (const [k, v] of Object.entries(T.uiFont)) assert.match(v, /^var\(--font-/, k);
});

test("render isolation: card / public render never reads editor vars, fonts, the theme attribute or uv()", () => {
  const FORBIDDEN = /--ui-|--font-(?:display|sans|mono|serif)\b|data-editor-theme|editorTheme|\buv\(|\bT\.(?:ui|type|uiFont|theme)\b/;
  for (const f of [
    "src/components/canvas/CardLayers.tsx", "src/components/canvas/ProfileCard.tsx",
    "src/components/canvas/ProfileMusicPlayer.tsx", "src/components/canvas/PublicCanvas.tsx",
    "src/components/canvas/MobilePublicCanvas.tsx", "src/app/[handle]/page.tsx",
    "src/lib/textEffects.ts", "src/lib/cardColors.ts", "src/lib/bgStyle.ts", "src/lib/blockStyle.ts",
    "src/lib/profileCardEffects.ts", "src/lib/cardTypography.ts", "src/lib/mobileMerge.ts",
  ]) {
    const src = stripComments(read(f));
    const m = FORBIDDEN.exec(src);
    assert.equal(m, null, `${f} reads ${m?.[0]} — editor-only`);
  }
});

// ── Contrast (A5) ───────────────────────────────────────────────────────────

type RGBA = [number, number, number, number];
function parse(c: string): RGBA {
  const h = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (h) { const n = parseInt(h[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const r = /^rgba?\(([^)]+)\)$/.exec(c.replace(/\s+/g, ""));
  assert.ok(r, `unparseable color ${c}`);
  const p = r[1].split(",").map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}
const over = (f: RGBA, b: RGBA): RGBA => [f[0] * f[3] + b[0] * (1 - f[3]), f[1] * f[3] + b[1] * (1 - f[3]), f[2] * f[3] + b[2] * (1 - f[3]), 1];
const lum = (c: RGBA) => {
  const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Contrast of `fg` on `bg`; a translucent `bg` is composited over `base`. */
function contrast(fg: string, bg: string, base = "#000000"): number {
  const b = over(parse(bg), parse(base));
  const f = over(parse(fg), b);
  const [x, y] = [lum(f), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

for (const t of EDITOR_THEME_NAMES) {
  test(`contrast — ${t}: text >= 4.5:1, state-carrying non-text >= 3:1`, () => {
    const P = T.theme[t];
    const text: Array<[string, string, string, string?]> = [
      ["ink on panel", P.ink, P.panel], ["ink on field", P.ink, P.field], ["ink on fieldHover", P.ink, P.fieldHover],
      ["ink2 on panel", P.ink2, P.panel], ["ink2 on field", P.ink2, P.field],
      ["ink3 on panel", P.ink3, P.panel], ["ink3 on field", P.ink3, P.field],
      // r2 (A11y-2): placeholder / inherited value on a hovered field.
      ["ink3 on fieldHover", P.ink3, P.fieldHover], ["ink2 on fieldHover", P.ink2, P.fieldHover],
      // r2 (A11y-3): ColorPopover's ink2 labels over any wallpaper.
      ["ink2 on pop / black", P.ink2, P.pop, "#000000"], ["ink2 on pop / white", P.ink2, P.pop, "#FFFFFF"],
      ["selInk on sel", P.selInk, P.sel], ["segInk on seg", P.segInk, P.seg],
      ["primary button label", P.panel, P.ink],
      ["fill value (dragging) on field", P.fill, P.field],
      ["danger on panel", P.danger, P.panel],
      ["n1 on panel", P.n1, P.panel], ["n2 on panel", P.n2, P.panel], ["n3 on panel", P.n3, P.panel], ["n4 on panel", P.n4, P.panel],
      // Translucent surfaces: popovers over anything (black and white
      // backdrops); glass over the theme's page (Phase D re-measures it
      // over real wallpapers when the topbar/rail ship).
      ["popInk on pop / black", P.popInk, P.pop, "#000000"], ["popInk on pop / white", P.popInk, P.pop, "#FFFFFF"],
      ["glassInk on glass / page", P.glassInk, P.glass, P.page], ["glassInk2 on glass / page", P.glassInk2, P.glass, P.page],
    ];
    for (const [name, fg, bg, base] of text) {
      const r = contrast(fg, bg, base);
      assert.ok(r >= 4.5, `${t}: ${name} = ${r.toFixed(2)}:1 (< 4.5)`);
    }
    const nonText: Array<[string, string, string]> = [
      ["switch off track on panel", P.track2, P.panel], ["switch on track on panel", P.on, P.panel],
      ["switch knob (off) on its track", T.ui.accent.knob, P.track2], ["switch knob (on) on its track", P.knobOn, P.on],
      ["slider fill on panel", P.fill, P.panel], ["modified dot on panel", P.edit, P.panel],
      ["focus ring on panel", P.focus, P.panel], ["select chevron on field", T.ui.accent.chevron, P.field],
      // r2: the shared boundary grey (field outline, thumb ring, segment ring).
      ["edge (field outline) on panel", P.edge, P.panel], ["edge (field outline) on field", P.edge, P.field],
    ];
    for (const [name, fg, bg] of nonText) {
      const r = contrast(fg, bg);
      assert.ok(r >= 3, `${t}: ${name} = ${r.toFixed(2)}:1 (< 3)`);
    }
    // r2 (A11y-1): slider thumb boundary vs the panel — the white thumb itself,
    // or its `edge` ring (Light/OG).
    const thumbOk = contrast(T.ui.accent.thumb, P.panel) >= 3 || (P.thumbShadow.includes(P.edge) && contrast(P.edge, P.panel) >= 3);
    assert.ok(thumbOk, `${t}: slider thumb has no >= 3:1 boundary on the panel`);
    // r2 (A11y-4 / Critic-1): selected segment thumb vs its track (field).
    const segOk = contrast(P.seg, P.field) >= 3 || (P.segShadow.includes(P.edge) && contrast(P.edge, P.field) >= 3);
    assert.ok(segOk, `${t}: selected segment has no >= 3:1 boundary on the track`);
    // r2 (Visual-1): ink2 and ink3 stay distinguishable (hierarchy, not just a pass).
    const gap = contrast(P.ink2, P.panel) / contrast(P.ink3, P.panel);
    assert.ok(gap >= 1.3, `${t}: ink2/ink3 too close (${gap.toFixed(2)})`);
    assert.ok(P.segShadow.includes(P.edge) || t === "og", `${t}: segShadow should carry the edge ring`);
  });
}

test("fields: opaque 1px edge BOTTOM line at rest (1.4.11), full edge ring on hover; no italic on mono values", () => {
  const rest = "inset 0 -1px 0 var(--ui-line-field)";
  for (const sel of [".mn-input {", ".mn-value-input.mn-value-input--field {"]) {
    const i = css.indexOf(sel);
    assert.ok(i >= 0, `missing rule ${sel}`);
    const body = css.slice(i, css.indexOf("}", i));
    assert.ok(body.includes(rest), `${sel} must keep the opaque 1px edge bottom line at rest`);
  }
  assert.match(css, /\.mn-input:hover \{[^}]*inset 0 0 0 1px var\(--ui-line-field\)/);
  assert.match(css, /\.mn-value-input--field:hover \{[^}]*inset 0 0 0 1px var\(--ui-line-field\)/);
  assert.ok(contrast(T.theme.light.edge, T.theme.light.panel) >= 3);
  // Geist Mono has no italic face: italic there is a synthetic oblique.
  assert.doesNotMatch(css, /\.mn-(value|hex)[^{]*\{[^}]*font-style:\s*italic/);
});

test("forced colors: NumberField / inline value editor keep a real border (their outline is a box-shadow)", () => {
  const fc = css.slice(css.indexOf("@media (forced-colors: active)"));
  assert.match(fc, /\.mn-value-input \{ border: 1px solid ButtonText; \}/);
});
