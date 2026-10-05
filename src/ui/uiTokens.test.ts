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

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const css = stripComments(read("src/ui/editor.css"));
const vars = uiCssVars();

/** A literal color: a hex, or rgb()/rgba()/hsl() with numeric arguments
 * (`rgba(${r},…)` built from the user's own color is not a literal). */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/g;
/** Legacy (pre-Block 2) color tokens — kept only because cards render with
 * them; the editor reads T.ui. */
const LEGACY_TOKEN = /\bT\.(?:surface|text|border|accent|shadow)\b/g;

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
  for (const uri of css.match(DATA_URI) ?? []) {
    assert.ok(uri.includes(`stroke='${T.ui.text.secondary}'`), "select chevron stroke == T.ui.text.secondary");
  }
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
];
const MENU_LEGACY_BASELINE: Record<string, number> = {
  "src/components/canvas/ProfileConfigMenu.tsx": 2,
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
