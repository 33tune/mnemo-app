// Iteration 0 (DS review): tokens.ts <-> editor.css parity. The editor's
// --ui-* custom properties are hand-written in editor.css; T.ui in
// tokens.ts is what inline styles read. They must not drift (the .46 -> .50
// tertiary change had to be made in both).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { T } from "./tokens";

const css = readFileSync(join(process.cwd(), "src/ui/editor.css"), "utf8");
function cssVar(name: string): string {
  const m = css.match(new RegExp(`${name}:\s*([^;]+);`));
  assert.ok(m, `missing ${name} in editor.css`);
  return m![1].trim().replace(/\s+/g, "");
}
const norm = (v: string) => v.replace(/\s+/g, "").toLowerCase();

const PAIRS: Array<[string, string]> = [
  ["--ui-text-1", T.ui.text.primary],
  ["--ui-text-2", T.ui.text.secondary],
  ["--ui-text-3", T.ui.text.tertiary],
  ["--ui-text-dis", T.ui.text.disabled],
  ["--ui-group", T.ui.surface.group],
  ["--ui-group-hover", T.ui.surface.groupHover],
  ["--ui-control", T.ui.surface.control],
  ["--ui-line", T.ui.line.control],
  ["--ui-line-strong", T.ui.line.strong],
  ["--ui-fill", T.ui.accent.fill],
  ["--ui-track", T.ui.accent.track],
  ["--ui-on", T.ui.accent.on],
  ["--ui-danger", T.ui.accent.danger],
  ["--ui-fast", `${T.motion.fast}ms`],
  ["--ui-base", `${T.motion.base}ms`],
  ["--ui-panel", `${T.motion.panel}ms`],
  ["--ui-seg", `${T.motion.segment}ms`],
  ["--ui-ease", T.motion.ease],
];

test("editor.css --ui-* custom properties match T.ui / T.motion", () => {
  for (const [name, value] of PAIRS) assert.equal(norm(cssVar(name)), norm(value), name);
});

test("inherited text (tertiary) is at least .50 alpha (4.5:1 on the control fill)", () => {
  const alpha = Number(/rgba\(255,255,255,([\d.]+)\)/.exec(norm(T.ui.text.tertiary))?.[1]);
  assert.ok(alpha >= 0.5, `tertiary alpha ${alpha}`);
});
