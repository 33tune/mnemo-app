// Free layout engine (2026-10-15): the collision solver on synthetic blocks.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  solveLayout, solveMinHeight, snapRect, guidesFor, priorityFor, BLOCK_GAP,
  type BlockKey, type BlockSpec, type Rect, type SolveInput, type Desired,
} from "./cardSolver";

const fixed = (w: number, h: number): BlockSpec => ({ minW: w, natW: w, heightAt: () => h });
/** A text-like block: area ~ constant, so narrower = taller. */
const text = (natW: number, minW: number, lineH: number, chars: number): BlockSpec =>
  ({ natW, minW, heightAt: w => Math.ceil(chars * 6 / w) * lineH });

function input(desired: Partial<Record<BlockKey, Desired>>, specs: Partial<Record<BlockKey, BlockSpec>>, o: Partial<SolveInput> = {}): SolveInput {
  return { boxW: 320, boxH: 480, pad: 20, specs, desired, order: priorityFor(o.dragged), ...o };
}

function overlap(a: Rect, b: Rect): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
}
function noOverlaps(rects: Partial<Record<BlockKey, Rect>>): boolean {
  const r = Object.values(rects) as Rect[];
  return r.every((a, i) => r.every((b, j) => i >= j || !overlap(a, b)));
}

const SPECS = {
  pfp: fixed(80, 80),
  identity: text(240, 80, 20, 120),
  location: fixed(120, 12),
  buttons: { minW: 112, natW: 280, heightAt: () => 120 } as BlockSpec,
};
const DESIRED: Partial<Record<BlockKey, Desired>> = {
  pfp: { x: 120, y: 30, w: 80 },
  identity: { x: 40, y: 130, w: 240 },
  location: { x: 100, y: 200, w: 120 },
  buttons: { x: 20, y: 240, w: 280 },
};

test("no conflict: every block stays exactly where it is", () => {
  const r = solveLayout(input(DESIRED, SPECS));
  assert.ok(r.fits);
  for (const k of Object.keys(DESIRED) as BlockKey[]) {
    assert.deepEqual({ x: r.rects[k]!.x, y: r.rects[k]!.y }, { x: DESIRED[k]!.x, y: DESIRED[k]!.y }, k);
  }
});

test("the photo is the core: a block dropped on it moves, the photo never does", () => {
  const r = solveLayout(input({ ...DESIRED, identity: { x: 40, y: 40, w: 240 } }, SPECS, { dragged: "identity" }));
  assert.deepEqual(r.rects.pfp, { x: 120, y: 30, w: 80, h: 80 });
  assert.ok(!overlap(r.rects.identity!, r.rects.pfp!));
  assert.ok(noOverlaps(r.rects));
});

test("dragging the photo onto the texts pushes them, and the push chains", () => {
  const r = solveLayout(input({ ...DESIRED, pfp: { x: 120, y: 120, w: 80 } }, SPECS, { dragged: "pfp" }));
  assert.deepEqual({ x: r.rects.pfp!.x, y: r.rects.pfp!.y }, { x: 120, y: 120 }, "the dragged photo is where the cursor put it");
  assert.ok(noOverlaps(r.rects));
});

test("blocks stacked under a pushed block follow it (relations kept)", () => {
  const r = solveLayout(input({ ...DESIRED, pfp: { x: 120, y: 120, w: 80 } }, SPECS, { dragged: "pfp", growTo: 900, push: { dx: 0, dy: 90 } }));
  const dy = r.rects.identity!.y - DESIRED.identity!.y;
  assert.ok(dy > 0, "identity pushed down");
  assert.ok(Math.abs(r.rects.location!.y - DESIRED.location!.y - dy) < 1, "location moved by the same amount");
  assert.ok(r.rects.location!.y > r.rects.identity!.y && r.rects.buttons!.y > r.rects.location!.y, "order kept");
});

test("the user's own move carries nothing: blocks resting on the dragged one stay", () => {
  const r = solveLayout(input({ ...DESIRED, identity: { x: 40, y: 330, w: 240 } }, SPECS, { dragged: "identity", growTo: 900 }));
  assert.deepEqual({ x: r.rects.location!.x, y: r.rects.location!.y }, { x: 100, y: 200 }, "location unaffected (no collision)");
});

test("continuity: pushing in 1px steps moves the pushed block smoothly (no jumps)", () => {
  let prev: Partial<Record<BlockKey, Rect>> | undefined, last: Rect | undefined;
  let maxStep = 0;
  for (let x = 120; x <= 180; x++) {
    const specs = { pfp: fixed(80, 80), location: fixed(80, 20) };
    const r = solveLayout(input({ pfp: { x, y: 100, w: 80 }, location: { x: 210, y: 130, w: 80 } }, specs, { boxW: 480, dragged: "pfp", prev, growTo: 900, push: { dx: x - 120, dy: 0 } }));
    if (last) maxStep = Math.max(maxStep, Math.hypot(r.rects.location!.x - last.x, r.rects.location!.y - last.y));
    last = r.rects.location; prev = r.rects;
    assert.ok(noOverlaps(r.rects));
  }
  assert.ok(maxStep <= 30, `largest step ${maxStep}`);
});

test("elastic: a text block gets narrower (more lines) to fit beside the photo instead of jumping away", () => {
  const specs = { pfp: fixed(80, 80), identity: text(260, 80, 16, 120) };
  const r = solveLayout(input({ pfp: { x: 20, y: 20, w: 80 }, identity: { x: 40, y: 20, w: 260 } }, specs, { dragged: "pfp" }));
  const id = r.rects.identity!;
  assert.ok(!overlap(id, r.rects.pfp!));
  assert.ok(id.w < 260 && id.h > specs.identity.heightAt(260), "narrower and taller");
  assert.ok(id.y < 60, "stays beside the photo, not sent below");
});

test("no room: the card grows downward rather than throwing a block to the far end", () => {
  const specs = { pfp: fixed(80, 80), buttons: fixed(280, 120) };
  const boxH = 260;
  const r = solveLayout(input({ pfp: { x: 120, y: 120, w: 80 }, buttons: { x: 20, y: 120, w: 280 } }, specs, { boxH, dragged: "pfp", growTo: 900 }));
  assert.ok(r.rects.buttons!.y > r.rects.pfp!.y, "below the photo, not above");
  assert.ok(r.neededH > boxH && !r.fits);
});

test("the minimum height packs the blocks: fits at the minimum, not 1px below", () => {
  const build = (h: number) => input({
    pfp: { x: 120, y: 20, w: 80 }, identity: { x: 40, y: 20 + (h - 40) * 0.3, w: 240 },
    location: { x: 100, y: 20 + (h - 40) * 0.6, w: 120 }, buttons: { x: 20, y: h - 140, w: 280 },
  }, SPECS, { boxH: h, compact: true });
  const min = solveMinHeight(build, 100, 900);
  assert.ok(solveLayout(build(min)).fits);
  assert.ok(!solveLayout(build(min - 1)).fits);
  const r = solveLayout(build(min));
  assert.ok(noOverlaps(r.rects));
  const total = 80 + SPECS.identity.heightAt(240) + 12 + 120 + 3 * BLOCK_GAP + 40;
  assert.ok(min <= total + 2, `packed: ${min} <= ${total}`);
});

test("deterministic: the same input always gives the same layout", () => {
  const i = input({ ...DESIRED, pfp: { x: 100, y: 140, w: 80 } }, SPECS, { dragged: "pfp" });
  assert.deepEqual(solveLayout(i), solveLayout(i));
});

test("magnet: snaps within a few px, lets go when dragged on, never blocks", () => {
  const g = guidesFor(320, 480, 20, [{ x: 100, y: 100, w: 120, h: 40 }]);
  const near = snapRect({ x: 117, y: 300, w: 80, h: 80 }, g, {});
  assert.equal(near.x, 120, "snapped to the card center (160 - 40)");
  const held = snapRect({ x: 128, y: 300, w: 80, h: 80 }, g, near.state);
  assert.equal(held.x, 120, "still held within the release radius");
  const free = snapRect({ x: 140, y: 300, w: 80, h: 80 }, g, held.state);
  assert.equal(free.x, 140, "dragging on lets go");
});
