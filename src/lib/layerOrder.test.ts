// Editor v3 Phase E — Layers: the stacking order the canvas paints and the
// patches a reorder / layer change writes.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CanvasElement } from "@/types";
import {
  toLayerItems, visualOrder, layerRun, reorder, moveWithinLayer, setLayer, bringToFront, reorderAvailability,
  layerItemLabel, layerLabels, visualZ, positionAfter, type LayerItem, type LayerPatch,
} from "./layerOrder";

const el = (elementType: CanvasElement["elementType"], id: string, zIndex: number, layer: 0 | 1 | 2, extra: object = {}) =>
  ({ elementType, id, zIndex, layer, x: 0, y: 0, w: 10, h: 10, depth: 0.5, rotation: 0, ...extra }) as unknown as CanvasElement;

/** Applies patches the way update_* ops do (merge). */
function apply(items: LayerItem[], patches: LayerPatch[]): LayerItem[] {
  return items.map(i => {
    const p = patches.find(x => x.id === i.id);
    return p ? { ...i, ...p.patch } : i;
  });
}
const ids = (items: LayerItem[]) => items.map(i => i.id);

test("visual order = zIndex + layer × 100, ties broken by CanvasBoard's render order", () => {
  const items = toLayerItems([
    el("card", "card", 5, 1), el("image", "img", 5, 1), el("profile", "prof", 3, 1), el("text", "bg", 50, 0), el("music", "front", 1, 2),
  ]);
  // img and card tie at 105: images render before cards → card paints above.
  assert.deepEqual(ids(visualOrder(items)), ["bg", "prof", "img", "card", "front"]);
  assert.equal(visualZ(items.find(i => i.id === "front")!), 201);
});

test("reorder stays inside the layer and touches only the span it changes", () => {
  const items = toLayerItems([el("image", "a", 10, 1), el("image", "b", 120, 1), el("text", "c", 40, 1), el("image", "f", 2, 2)]);
  // Medio back → front: a(110), c(140), b(220 — crosses into Frente's band).
  assert.deepEqual(ids(layerRun(items, 1)), ["a", "c", "b"]);
  const patches = reorder(items, "a", "front");
  assert.deepEqual(patches.map(p => [p.id, p.patch]), [["a", { zIndex: 121 }]], "Al frente = highest + 1, one element");
  const next = apply(items, patches);
  assert.deepEqual(ids(layerRun(next, 1)), ["c", "b", "a"]);
  assert.ok(reorder(next, "a", "front").length === 0, "already at the front: no write");
});

test("review E-B1: 'Al frente' never sends anything behind the ProfileCard (old data, zIndex >= 100)", () => {
  // The reviewer's case: card Frente z11 (211); two Medio images above it (220, 230).
  const items = toLayerItems([el("profile", "prof", 11, 2), el("image", "imgA", 120, 1), el("image", "imgB", 130, 1)]);
  const z = (list: LayerItem[], id: string) => visualZ(list.find(i => i.id === id)!);
  const next = apply(items, bringToFront(items, "imgA"));
  assert.ok(z(next, "imgA") > z(next, "imgB") && z(next, "imgB") > z(next, "prof"), "both images stay above the card, imgA on top");
  // Subir / Bajar / drag keep the span's own values: nobody else changes band.
  const down = apply(items, reorder(items, "imgB", "backward"));
  assert.ok(z(down, "imgA") > z(down, "prof") && z(down, "imgB") > z(down, "prof"));
  assert.deepEqual(ids(layerRun(down, 1)), ["imgB", "imgA"]);
});

test("Al fondo goes just below the lowest value; never under the canvas's own layers (z >= 1)", () => {
  const items = toLayerItems([el("image", "a", 5, 0), el("image", "b", 9, 0)]);
  assert.deepEqual(reorder(items, "b", "back").map(p => [p.id, p.patch]), [["b", { zIndex: 4 }]]);
  const low = toLayerItems([el("image", "a", 1, 0), el("image", "b", 1, 0), el("image", "c", 3, 0)]);
  const next = apply(low, reorder(low, "c", "back"));
  assert.deepEqual(ids(layerRun(next, 0)), ["c", "a", "b"]);
  assert.ok(next.every(i => i.zIndex >= 1));
});

test("Subir / Bajar move one step; availability reflects the bounds", () => {
  const items = toLayerItems([el("image", "a", 1, 0), el("image", "b", 2, 0), el("image", "c", 3, 0)]);
  assert.deepEqual(ids(layerRun(apply(items, reorder(items, "a", "forward")), 0)), ["b", "a", "c"]);
  assert.deepEqual(ids(layerRun(apply(items, reorder(items, "c", "backward")), 0)), ["a", "c", "b"]);
  assert.deepEqual(ids(layerRun(apply(items, reorder(items, "c", "back")), 0)), ["c", "a", "b"]);
  assert.deepEqual(reorderAvailability(items, "c"), { front: false, forward: false, backward: true, back: true });
  assert.deepEqual(reorderAvailability(items, "a"), { front: true, forward: true, backward: false, back: false });
});

test("only changed elements get a patch; a reorder never writes `layer`", () => {
  const items = toLayerItems([el("image", "a", 1, 1), el("image", "b", 2, 1), el("image", "c", 3, 1)]);
  const patches = moveWithinLayer(items, "c", 1);
  assert.deepEqual(patches.map(p => [p.id, p.patch]), [["c", { zIndex: 2 }], ["b", { zIndex: 3 }]]);
  assert.ok(patches.every(p => p.patch.layer === undefined));
});

test("setLayer is the only layer change: ONE patch, on top of the new layer", () => {
  const items = toLayerItems([el("image", "a", 1, 0), el("text", "m1", 7, 1), el("image", "m2", 9, 1)]);
  const patches = setLayer(items, "a", 1);
  assert.deepEqual(patches.map(p => [p.id, p.patch]), [["a", { layer: 1, zIndex: 10 }]]);
  assert.deepEqual(ids(layerRun(apply(items, patches), 1)), ["m1", "m2", "a"]);
  assert.deepEqual(setLayer(items, "a", 0), [], "same layer: nothing");
  // Into an empty layer it keeps its value, clamped into that layer's band.
  assert.deepEqual(setLayer(toLayerItems([el("image", "x", 140, 1)]), "x", 2)[0].patch, { layer: 2, zIndex: 99 });
});

test("double click 'traer al frente' = the same reorder (persistable patches, not a bare zCounter)", () => {
  const items = toLayerItems([el("image", "a", 400, 1), el("card", "b", 401, 1)]);
  const patches = bringToFront(items, "a");
  assert.deepEqual(ids(layerRun(apply(items, patches), 1)), ["b", "a"]);
  assert.ok(patches.every(p => p.kind === "image" || p.kind === "card"));
});

test("row labels name the object and add its content", () => {
  assert.deepEqual(layerItemLabel(el("text", "t", 1, 1, { content: "notas   de verano" })), { name: "Texto", detail: "notas de verano" });
  assert.equal(layerItemLabel(el("image", "i", 1, 1, { src: "https://x/a.GIF" })).name, "GIF");
  assert.deepEqual(layerItemLabel(el("profile", "p", 1, 1, { name: "Mara" })), { name: "Tarjeta", detail: "Mara" });
  assert.equal(layerItemLabel(el("stats", "s", 1, 1)).name, "Visitas");
});

test("positionAfter: where the element ends up, counted from the front of its layer", () => {
  const items = toLayerItems([el("image", "a", 1, 1), el("image", "b", 2, 1), el("text", "c", 3, 2)]);
  assert.deepEqual(positionAfter(items, reorder(items, "a", "front"), "a"), { position: 1, count: 2, layer: 1 });
  assert.deepEqual(positionAfter(items, setLayer(items, "a", 2), "a"), { position: 1, count: 2, layer: 2 });
  assert.deepEqual(positionAfter(items, [], "b"), { position: 1, count: 2, layer: 1 });
});

test("layerLabels: identical names get n.º N (front-most = 1), shared by rows and announcements", () => {
  const labels = layerLabels([el("image", "back", 1, 0, { src: "" }), el("image", "front", 5, 2, { src: "" }), el("text", "t", 3, 1, { content: "hola" })]);
  assert.deepEqual(labels.get("front"), { name: "Imagen", detail: "n.º 1" });
  assert.deepEqual(labels.get("back"), { name: "Imagen", detail: "n.º 2" });
  assert.deepEqual(labels.get("t"), { name: "Texto", detail: "hola" });
});

test("review E closure: repeated zIndex values in a layer — the element still lands in the requested slot", () => {
  // The reviewer's case (Fondo): e5:5, e1:14, e2:14, e0:32, e3:32 — move e5 to slot 1.
  const items = toLayerItems([el("image", "e5", 5, 0), el("image", "e1", 14, 0), el("image", "e2", 14, 0), el("image", "e0", 32, 0), el("image", "e3", 32, 0)]);
  const next = apply(items, moveWithinLayer(items, "e5", 1));
  assert.equal(ids(layerRun(next, 0))[1], "e5");
  const zs = layerRun(next, 0).map(i => i.zIndex);
  assert.ok(zs.every((z, i) => i === 0 || z > zs[i - 1]), "strictly increasing afterwards");
});
