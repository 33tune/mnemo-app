// Editor v3 Phase E — Layers: the panel, its wiring in CanvasBoard (one
// writer, persisted and undoable) and the double-click bug fix. Structural
// guards on the real source (no DOM in this repo's tests) + the selection model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { editorSelectionReducer as reduce, INITIAL_EDITOR_SELECTION } from "@/lib/editorSelection";

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const BOARD = read("src/components/canvas/CanvasBoard.tsx");
const PANEL = read("src/components/canvas/LayersPanel.tsx");
const HOST = read("src/components/canvas/EditorHost.tsx");
const RAIL = read("src/components/canvas/EditorRail.tsx");

test("one writer: every stacking change is update_* ops (elementOps) in ONE history step", () => {
  assert.match(BOARD, /function applyLayerPatches\(patches: LayerPatch\[\]\) \{\s*if \(!patches\.length\) return;\s*ownHistoryStep\(\(\) => patches\.forEach\(p => enqueueOpRef\.current\(elementOps\.update\(p\.kind, p\.id, p\.patch\)\)\)\);/);
  for (const call of ["reorderLayers(layerItemsNow(), id, action)", "moveWithinLayer(layerItemsNow(), id, to)", "setElementLayer(layerItemsNow(), id, layer)"]) {
    assert.ok(BOARD.includes(`applyLayerChange(id, ${call})`), call);
  }
});

test("review E: every Capas change is announced (role=status) with where the element ended up", () => {
  assert.ok(BOARD.includes("announceRef.current?.(`${name}${detail ? ` ${detail}` : \"\"}: ${at.position} de ${at.count} en ${LAYER_TITLES[at.layer]}`)"));
  assert.ok(BOARD.includes("layerLabels(elementsRef.current.filter(e => visibleIdsRef.current.has(e.id))).get(id)"), "the announcement uses the row's label (n.º N)");
});

test("bug fix: double click 'traer al frente' persists (no bare zCounter / local-only setElements)", () => {
  assert.ok(!BOARD.includes("zCounter.current++;setElements"), "the old local-only double click is gone");
  assert.ok(BOARD.includes("applyLayerPatches(bringToFront(layerItemsNow(),img.id))"));
  assert.ok(BOARD.includes("applyLayerPatches(bringToFront(layerItemsNow(),card.id))"));
});

test("lock buttons persist through the same writers; Phase G: the image / text layer toolbars are gone (Capas owns layer)", () => {
  assert.ok(!/\{\.\.\.e,layer:l\}/.test(BOARD) && !/\{\.\.\.e,locked:!e\.locked\}/.test(BOARD), "no local-only layer / lock writes");
  assert.ok(!BOARD.includes('aria-label="Opciones de imagen"') && !BOARD.includes('aria-label="Capa del texto"'));
  assert.ok(BOARD.includes('enqueueOp({type:"update_image",id:img.id,patch:{locked:!img.locked}})'));
  assert.ok(BOARD.includes("updateText(txt.id,{locked:!txt.locked})"));
});

test("the list = exactly what the canvas renders, top = front", () => {
  assert.ok(BOARD.includes("visualOrder(items).reverse()"));
  assert.ok(BOARD.includes("toLayerItems(elements.filter(e => visibleIds.has(e.id)))"));
  assert.ok(BOARD.includes('locked: el.elementType === "profile" ? undefined'), "the ProfileCard has no lock");
});

test("opens from the rail (Capas, L — canvas focus only) and from the narrow '+' menu; hosted in the dock", () => {
  assert.ok(RAIL.includes("onClick={onLayers}") && !RAIL.includes("Capas · próximamente"));
  assert.ok(BOARD.includes('if (key === "l")'));
  assert.ok(BOARD.includes("openLayers();}}><Icon name=\"layers\" size={16} />Capas</button>"));
  assert.ok(HOST.includes('target?.kind === "layers" && layers') && HOST.includes("<LayersPanel"));
  assert.ok(BOARD.includes("if ((roomOpen || layersOpen) && sheetMode)"), "the canvas does not move for Capas");
});

test("Capas survives any selection (you select FROM it); Tu sala still needs an empty one", () => {
  let s = reduce(INITIAL_EDITOR_SELECTION, { type: "select", ids: new Set(["a"]) });
  s = reduce(s, { type: "open", target: { kind: "layers" } });
  assert.equal(s.target?.kind, "layers");
  s = reduce(s, { type: "select", ids: new Set(["b", "c"]) });
  assert.equal(s.target?.kind, "layers");
  s = reduce(s, { type: "select", ids: new Set() });
  assert.equal(s.target?.kind, "layers");
});

test("panel a11y: lists named by their layer heading, real buttons, keyboard path for every move", () => {
  assert.ok(PANEL.includes('role="list" aria-labelledby={`${headingBase}-${ri}`}'));
  assert.ok(PANEL.includes('className="mn-layer__grip" aria-hidden="true"'), "dragging is a pointer shortcut");
  for (const label of ["Al frente", "Subir", "Bajar", "Al fondo"]) assert.ok(PANEL.includes(`label: "${label}"`), label);
  assert.ok(PANEL.includes("aria-disabled={!avail?.[b.action] || undefined}"), "never `disabled`: focus stays");
  assert.ok(PANEL.includes("p.onSetLayer(single.id, Number(t.id) as LayerIndex)"), "the layer changes only through the selector");
  assert.ok(PANEL.includes('className="mn-layerseg__btn" aria-pressed=') && !PANEL.includes("<Tabs"), "review E-M1: toggle buttons, no per-arrow writes");
  assert.ok(!/ocultar|hidden:/i.test(PANEL), "no hiding (out of scope)");
});

test("public render untouched: nothing outside the editor knows about Layers", () => {
  for (const f of ["src/components/canvas/PublicCanvas.tsx", "src/components/canvas/MobilePublicCanvas.tsx", "src/components/canvas/ProfileCard.tsx", "src/lib/hitStack.ts"]) {
    const src = read(f);
    assert.ok(!src.includes("layerOrder") && !src.includes("LayersPanel"), f);
  }
});
