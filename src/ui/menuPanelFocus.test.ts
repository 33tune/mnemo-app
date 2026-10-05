// Iteration 0: where focus returns when an editor panel closes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePanelReturnFocus } from "./MenuPanel";

const el = (name: string, isConnected = true) => ({ name, isConnected, focus: () => {} });
const root = (inside: object[] = []) => ({ contains: (n: never) => inside.includes(n as object) });

test("returns to the explicit opener ('Editar') when it is still in the document", () => {
  const edit = el("edit"), canvas = el("canvas");
  assert.equal(resolvePanelReturnFocus(edit, el("mounted"), root(), canvas), edit);
});

test("opener gone (card deselected / module deleted) -> canvas, never <body>", () => {
  const canvas = el("canvas");
  assert.equal(resolvePanelReturnFocus(el("edit", false), null, root(), canvas), canvas);
});

test("without an explicit opener: the element focused at mount, unless it is inside the panel", () => {
  const mounted = el("mounted"), canvas = el("canvas");
  assert.equal(resolvePanelReturnFocus(null, mounted, root(), canvas), mounted);
  assert.equal(resolvePanelReturnFocus(null, mounted, root([mounted]), canvas), canvas);
  assert.equal(resolvePanelReturnFocus(null, el("gone", false), root(), canvas), canvas);
});
