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
import { T, uiCssVars, uiCssVarsStylesheet, UI_VARS_SCOPE } from "./tokens";
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
  for (const name of used) assert.ok(name in vars, `${name} is referenced but not generated from T.ui`);
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

test("the injected stylesheet defines every variable under the editor/canvas scope", () => {
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

// ── No second source ────────────────────────────────────────────────────────

test("editor.css carries no literal colors (only var(--ui-*) and system colors)", () => {
  // The one exception: a CSS var cannot reach inside a data: URI. The select
  // chevron's stroke is pinned to T.ui.text.secondary instead.
  const DATA_URI = /url\("data:image\/svg\+xml,[^"]*"\)/g;
  const uris = css.match(DATA_URI) ?? [];
  assert.equal(uris.length, 1, "only the select chevron may use a data: URI");
  // Its ONLY color is T.ui.text.secondary (any other fill/stroke fails).
  assert.deepEqual(uris[0].replace(`stroke='${T.ui.text.secondary}'`, "").match(COLOR_LITERAL) ?? [], []);
  assert.ok(uris[0].includes(`stroke='${T.ui.text.secondary}'`), "select chevron stroke == T.ui.text.secondary");
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
  "src/components/canvas/ProfileIdentityMenu.tsx": 5,
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

test("inherited text (tertiary) is at least .50 alpha (4.5:1 on the control fill)", () => {
  const alpha = Number(/rgba\(255,255,255,([\d.]+)\)/.exec(T.ui.text.tertiary.replace(/\s+/g, ""))?.[1]);
  assert.ok(alpha >= 0.5, `tertiary alpha ${alpha}`);
});

test("placeholder text is at least .52 alpha (A11Y-12)", () => {
  const alpha = Number(/rgba\(255,255,255,([\d.]+)\)/.exec(T.ui.text.placeholder)?.[1]);
  assert.ok(alpha >= 0.52, `placeholder alpha ${alpha}`);
});

// ── Review round (Phase 1): scope, contract rules, render isolation ────────

test("every T.ui group is emitted as variables", () => {
  for (const g of Object.keys(T.ui)) {
    const prefix = `--ui-${g.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}-`;
    assert.ok(Object.keys(vars).some(k => k.startsWith(prefix)), `group ${g} not emitted`);
  }
});

test("variables are defined on every editor root AND the canvas (its focus ring reads them)", () => {
  for (const attr of ["[data-mnemo-editor]", "[data-mnemo-ui]", "[data-mnemo-canvas]"]) {
    assert.ok(UI_VARS_SCOPE.includes(attr), `${attr} missing from UI_VARS_SCOPE`);
  }
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

test("overlay breakpoint leaves room for the widest card beside the docked inspector", () => {
  // inspectorW + the widest ProfileCard + a 16px gutter on each side: above
  // the breakpoint, the view offset can always uncover the whole card.
  const need = T.ui.size.inspectorW + getFreeformCardBounds().maxW + 2 * 16;
  assert.ok(T.ui.breakpoint.inspectorOverlay >= need, `${T.ui.breakpoint.inspectorOverlay} < ${need}`);
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
