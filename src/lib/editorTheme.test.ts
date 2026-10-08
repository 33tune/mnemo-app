// MYLAND Editor v3 — Phase A: editor theme preference (A8).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EDITOR_THEME, EDITOR_THEMES, EDITOR_THEME_ATTR, EDITOR_THEME_KEY,
  applyEditorTheme, editorThemeBootScript, isEditorTheme, parseEditorTheme, readEditorTheme, writeEditorTheme,
} from "./editorTheme";

const memory = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m };
};
const throwing = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

test("contract: key, attribute, themes, default dark", () => {
  assert.equal(EDITOR_THEME_KEY, "myland.editorTheme");
  assert.equal(EDITOR_THEME_ATTR, "data-editor-theme");
  assert.deepEqual([...EDITOR_THEMES], ["light", "dark", "og"]);
  assert.equal(DEFAULT_EDITOR_THEME, "dark");
});

test("parse: only light|dark|og; anything else is dark", () => {
  for (const t of EDITOR_THEMES) assert.equal(parseEditorTheme(t), t);
  for (const bad of [null, undefined, "", "Dark", "LIGHT", "sepia", 1, {}, " og"]) {
    assert.equal(parseEditorTheme(bad), "dark", String(bad));
    assert.equal(isEditorTheme(bad), false);
  }
});

test("read: missing / invalid / absent / throwing storage -> dark", () => {
  assert.equal(readEditorTheme(memory()), "dark");
  assert.equal(readEditorTheme(memory({ [EDITOR_THEME_KEY]: "neon" })), "dark");
  assert.equal(readEditorTheme(null), "dark");
  assert.equal(readEditorTheme(undefined), "dark"); // node: no window -> default storage is null
  assert.equal(readEditorTheme(throwing), "dark");
  assert.equal(readEditorTheme(memory({ [EDITOR_THEME_KEY]: "og" })), "og");
  assert.equal(readEditorTheme(memory({ [EDITOR_THEME_KEY]: "light" })), "light");
});

test("write: stores valid themes, never throws", () => {
  const s = memory();
  assert.equal(writeEditorTheme("light", s), true);
  assert.equal(s.m.get(EDITOR_THEME_KEY), "light");
  assert.equal(writeEditorTheme("og", throwing), false);
  assert.equal(writeEditorTheme("og", null), false);
  assert.equal(writeEditorTheme("sepia" as never, s), false);
  assert.equal(s.m.get(EDITOR_THEME_KEY), "light");
});

test("apply: sets the html attribute (invalid -> dark)", () => {
  const attrs: Record<string, string> = {};
  const root = { setAttribute: (k: string, v: string) => { attrs[k] = v; } };
  applyEditorTheme("og", root);
  assert.equal(attrs[EDITOR_THEME_ATTR], "og");
  applyEditorTheme("bogus" as never, root);
  assert.equal(attrs[EDITOR_THEME_ATTR], "dark");
});

/** Runs the inline boot script against a fake window/document. */
function boot(storage: unknown): string | undefined {
  const attrs: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
  const window = storage === "absent" ? {} : { localStorage: storage };
  new Function("window", "document", editorThemeBootScript())(window, document);
  return attrs[EDITOR_THEME_ATTR];
}

test("boot script: applies the stored theme before hydration, dark on any failure", () => {
  assert.equal(boot(memory({ [EDITOR_THEME_KEY]: "light" })), "light");
  assert.equal(boot(memory({ [EDITOR_THEME_KEY]: "og" })), "og");
  assert.equal(boot(memory({ [EDITOR_THEME_KEY]: "<script>" })), "dark");
  assert.equal(boot(memory()), "dark");
  assert.equal(boot(throwing), "dark");
  assert.equal(boot("absent"), "dark");
  const src = editorThemeBootScript();
  assert.ok(!src.includes("</"), "safe to inline in a <script> tag");
});
