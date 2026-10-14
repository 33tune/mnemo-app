// Editor v3 Phase I — snapping to the editor grid: the pure delta adjusters,
// their composition with the UNCHANGED writers (computeResize /
// applyGroupDragDelta / nudge), and structural guards on the real source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "./sourceScan";
import { snapValue, snapDragDelta, snapResizeDelta, snapNudgeDelta } from "./gridSnap";
import { computeResize, resizeMinimums } from "./resizeMath";
import { nudgeResize } from "./canvasNudge";

// CRLF-safe: a Windows checkout (core.autocrlf) must read the same source.
const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8").replace(/\r\n/g, "\n"));
const S = 24;
const onGrid = (v: number) => Math.abs(v / S - Math.round(v / S)) < 1e-9;

test("snapValue rounds to the nearest line; step 0 = off", () => {
  assert.equal(snapValue(35, S), 24);
  assert.equal(snapValue(37, S), 48);
  assert.equal(snapValue(-13, S), -24);
  assert.equal(snapValue(35, 0), 35);
});

test("drag: the lead element's top-left lands on the grid; the delta is shared by the group", () => {
  const start = { x: 101, y: 77 };
  for (const [dx, dy] of [[0, 0], [13, -40], [250, 3], [-90, 61]]) {
    const d = snapDragDelta(start, dx, dy, S);
    assert.ok(onGrid(start.x + d.dx) && onGrid(start.y + d.dy), `${dx},${dy}`);
    assert.ok(Math.abs(d.dx - dx) <= S / 2 && Math.abs(d.dy - dy) <= S / 2, "never more than half a cell from the pointer");
  }
  assert.deepEqual(snapDragDelta(start, 13, 5, 0), { dx: 13, dy: 5 }, "off: untouched");
});

test("resize: the edge the handle moves lands on the grid, through the SAME computeResize", () => {
  const box = { x: 50, y: 70, w: 200, h: 130 };
  const { minW, minH } = resizeMinimums("music");
  const cases: Array<[Parameters<typeof computeResize>[0], number, number]> = [["se", 17, 33], ["e", -29, 0], ["w", 41, 0], ["n", 0, -15], ["nw", -7, 22], ["s", 0, 9]];
  for (const [h, dx, dy] of cases) {
    const d = snapResizeDelta(h, dx, dy, box, S, false);
    const r = computeResize(h, d.dx, d.dy, box.w, box.h, box.x, box.y, 0, false, minW, minH);
    if (h.includes("e")) assert.ok(onGrid(r.nx + r.nw), `${h} right edge`);
    if (h.includes("w")) assert.ok(onGrid(r.nx), `${h} left edge`);
    if (h.includes("s")) assert.ok(onGrid(r.ny + r.nh), `${h} bottom edge`);
    if (h.includes("n")) assert.ok(onGrid(r.ny), `${h} top edge`);
    // The opposite edge never moves.
    if (h.includes("e")) assert.equal(r.nx, box.x);
    if (h.includes("s")) assert.equal(r.ny, box.y);
  }
});

test("resize of an image keeps its ratio: only the driving side snaps", () => {
  const box = { x: 30, y: 40, w: 180, h: 120 }, ratio = 120 / 180;
  const d = snapResizeDelta("se", 19, 50, box, S, true);
  assert.equal(d.dy, 50, "corner: height follows the ratio, its delta is not touched");
  const r = computeResize("se", d.dx, d.dy, box.w, box.h, box.x, box.y, ratio, true, 40, 1);
  assert.ok(onGrid(r.nx + r.nw));
  assert.equal(r.nh, Math.round(r.nw * ratio), "ratio kept");
  const s = snapResizeDelta("s", 0, 11, box, S, true);
  assert.ok(onGrid(box.y + box.h + s.dy), "n/s: height drives");
});

test("nudge: an arrow goes to the next line (a whole cell from a line); Ctrl/⌘ grows the edge to it", () => {
  assert.equal(snapNudgeDelta(30, 1, S), 18);
  assert.equal(snapNudgeDelta(30, -1, S), -6);
  assert.equal(snapNudgeDelta(48, 1, S), 24);
  assert.equal(snapNudgeDelta(48, -1, S), -24);
  assert.equal(snapNudgeDelta(30, 1, 0), 1, "off: the plain 1px step");
  // Right edge 50 + 200 = 250 → next line 264: +14 through the same nudgeResize.
  const el = { id: "m", elementType: "music", x: 50, y: 70, w: 200, h: 64 };
  const r = nudgeResize(el, snapNudgeDelta(el.x + el.w, 1, S), 0, { w: 1440, h: 900, topOffset: 44 });
  assert.ok(r && r.kind === "box" && onGrid(r.x + r.w));
});

test("useDragDrop: only the INPUT delta changes — same applyGroupDragDelta / computeResize calls; the card, text size and groups never snap", () => {
  const src = read("src/hooks/useDragDrop.ts");
  assert.ok(src.includes('if (snapStep > 0 && !e.shiftKey && dragging.type !== "profile") ({ dx, dy } = snapDragDelta(sp, dx, dy, snapStep));'));
  assert.ok(src.includes("setElements(p => applyGroupDragDelta(p, dragStartPos.current, dx, dy, canvasBounds));"), "same writer");
  assert.ok(src.includes("computeResize(handle, snapped.dx, snapped.dy, w, h, ex, ey, ratio, isImage, minW, minH)"));
  // The profile / text / group branches return before the snapped call and never mention snapping.
  const profile = src.slice(src.indexOf('if (resizing.type === "profile")'), src.indexOf("const { minW, minH } = resizeMinimums(resizing.type);"));
  const text = src.slice(src.indexOf('if (resizing.type === "text")'), src.indexOf('if (resizing.type === "profile")'));
  const group = src.slice(src.indexOf('if (resizing.type === "group")'), src.indexOf('if (resizing.type === "text")'));
  for (const part of [profile, text, group]) assert.ok(!part.includes("snap"), "untouched branch");
  assert.ok(profile.includes("centerCardPosition(bounds.w, bounds.h, nw, nh, bounds.topOffset)"), "the card stays centered");
});

test("CanvasBoard: a local preference, editor-only (never space_mobile / touch); nudge snaps the lead / the edge; Shift = free", () => {
  const board = read("src/components/canvas/CanvasBoard.tsx");
  assert.ok(board.includes('const snapStep = gridSnapOn && canEdit && canInteract && canvasMode !== "space_mobile" ? GRID_STEP : 0;'));
  assert.ok(board.includes("    snapStep,\n  });"), "passed to useDragDrop");
  assert.ok(board.includes("const lead = snapStepRef.current > 0 && !e.shiftKey"));
  assert.ok(board.includes('if (snapStepRef.current > 0 && !e.shiftKey && el.elementType !== "profile" && el.elementType !== "text") {'));
  const grid = read("src/components/canvas/CanvasGrid.tsx");
  assert.ok(grid.includes('export const GRID_SNAP_PREF_KEY = "myland.editorGridSnap";'));
  const room = read("src/components/canvas/RoomInspector.tsx");
  assert.ok(room.includes('<SwitchRow label="Ajustar a la cuadrícula" icon="move" value={p.snap} onChange={v => p.onSnap(v)} hintId="mnemo-room-snap-note" />'));
  // Typed Medidas are never snapped (an explicit value is kept).
  const geo = board.slice(board.indexOf("function setElementGeometryNow("), board.indexOf("const chromeCanvas: ChromeCanvas"));
  assert.ok(!geo.includes("snap"));
});

test("review I: Mayús counts while dragging (note), the canvas help follows the mode, parallax is dropped while grid / snap are on", () => {
  const room = read("src/components/canvas/RoomInspector.tsx");
  assert.ok(room.includes("Mientras arrastrás, mantené Mayús para hacerlo libre."));
  assert.ok(room.includes('hintId="mnemo-room-snap-note"') && room.includes('<MenuNote id="mnemo-room-snap-note">'), "the note describes the switch");
  assert.ok(read("src/ui/Toggle.tsx").includes("<FieldDescProvider value={hintId}>"), "SwitchRow wires hintId to the switch");
  assert.ok(room.includes("{p.snap && !p.grid &&"), "a hint when snapping with the grid hidden");
  const board = read("src/components/canvas/CanvasBoard.tsx");
  assert.ok(board.includes("con ajuste a la cuadrícula las flechas saltan a la próxima línea (Mayús más flechas mueve 10 px libre)"));
  assert.ok(board.includes("const parallaxNeutral = canEdit && (gridOn || gridSnapOn);"), "editor only — the public view keeps its parallax");
  assert.ok(board.includes("parallaxNeutral ? { transform: \"translate(0px, 0px)\""));
});
