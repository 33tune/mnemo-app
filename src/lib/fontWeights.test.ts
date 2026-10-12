// Editor v3 Phase F — the Peso control offers only loaded weights.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOADED_FONT_WEIGHTS, weightOptions, isLoadedFont } from "./fontWeights";
import { CANVAS_FONTS } from "./fontList";

/** family -> weights from the Google Fonts css2 @import URLs. */
function parseGlobals(): Map<string, number[]> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const out = new Map<string, number[]>();
  for (const url of css.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^')]+/g) ?? []) {
    for (const fam of url.split("?")[1].split("&").filter(p => p.startsWith("family="))) {
      const [rawName, axes] = fam.slice("family=".length).split(":");
      const name = rawName.replace(/\+/g, " ");
      if (!axes) { out.set(name, [400]); continue; }
      const [keys, values] = axes.split("@");
      const names = keys.split(",");
      const wi = names.indexOf("wght");
      const ii = names.indexOf("ital");
      const ws = new Set<number>();
      for (const tuple of values.split(";")) {
        const parts = tuple.split(",");
        if (ii >= 0 && parts[ii] === "1") continue; // italics are not a Peso
        ws.add(Number(parts[wi]));
      }
      out.set(name, [...ws].sort((a, b) => a - b));
    }
  }
  return out;
}

test("loaded weights match the Google Fonts imports of globals.css, for every canvas font", () => {
  const loaded = parseGlobals();
  for (const f of CANVAS_FONTS) {
    const fromCss = loaded.get(f.key);
    if (fromCss) assert.deepEqual([...(LOADED_FONT_WEIGHTS[f.key] ?? [])], fromCss, `${f.key}`);
    else assert.ok(!isLoadedFont(f.key), `${f.key} is not imported: it is a system font (full range)`);
  }
  for (const k of Object.keys(LOADED_FONT_WEIGHTS)) assert.ok(CANVAS_FONTS.some(f => f.key === k), `${k} is a canvas font`);
});

test("options: loaded weights only; a stored weight that is not loaded is kept, marked synthetic", () => {
  assert.deepEqual(weightOptions("Inter", 500).map(o => o.value), [400, 500, 700]);
  const dm = weightOptions("DM Sans", 700);
  assert.deepEqual(dm.map(o => o.value), [300, 400, 500, 700]);
  assert.equal(dm.find(o => o.value === 700)!.label, "700 · sintético", "CLAUDE.md: '700 · sintético', never rewritten");
  assert.equal(weightOptions("Arial", 400).length, 9, "system fonts keep 100–900");
  assert.equal(weightOptions("Anton", 400).length, 1);
});
