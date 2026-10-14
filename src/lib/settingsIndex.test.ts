// Liquid glass L6: the search index names what the inspectors really show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SETTINGS_INDEX, settingsOf, searchSettings, normalizeSearch, type SearchObject } from "./settingsIndex";
import { PART_IDS } from "./inspectorObjects";

const dir = (d: string) => readdirSync(join(process.cwd(), d)).filter(f => f.endsWith(".tsx")).map(f => readFileSync(join(process.cwd(), d, f), "utf8"));
const SRC = [...dir("src/components/canvas"), ...dir("src/ui")].join("\n");
const literal = (s: string) => [`"${s}"`, `>${s}<`, `>${s}\n`, `'${s}'`, `\`${s}\``, `"${s} `, ` ${s}"`].some(k => SRC.includes(k));

test("every card and control label of the index is a literal in the inspectors' source", () => {
  const missing: string[] = [];
  for (const [object, cards] of Object.entries(SETTINGS_INDEX)) {
    for (const [card, , labels, tiles] of cards) {
      if (!literal(card)) missing.push(`${object} › ${card}`);
      for (const l of [...labels, ...Object.keys(tiles ?? {}), ...Object.values(tiles ?? {}).flat()]) if (!literal(l)) missing.push(`${object} › ${card} › ${l}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("the index covers every part of the card and every element / room inspector", () => {
  for (const id of PART_IDS) assert.ok(SETTINGS_INDEX[id].length > 0, id);
  for (const id of ["text", "image", "music", "room"] as SearchObject[]) assert.ok(SETTINGS_INDEX[id].length > 0, id);
});

test("search: accent-insensitive, matches control / tile / card / object; empty = everything", () => {
  const all = settingsOf(["name", "cardFx"]);
  const label = (o: SearchObject) => (o === "name" ? "Nombre" : "Efectos");
  assert.equal(normalizeSearch("  Ángulo "), "angulo");
  assert.ok(searchSettings(all, "angulo", label).some(h => h.label === "Ángulo" && h.tile === "Gradiente"));
  assert.ok(searchSettings(all, "spotlight", label).every(h => h.object === "cardFx"));
  assert.ok(searchSettings(all, "nombre", label).every(h => h.object === "name"), "the object's name matches its settings");
  assert.equal(searchSettings(all, "", label, 500).length, all.length);
  assert.equal(searchSettings(all, "zzzz", label).length, 0);
  assert.ok(searchSettings(all, "", label).length <= 40);
});
