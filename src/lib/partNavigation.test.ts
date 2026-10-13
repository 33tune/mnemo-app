// Editor v3 Phase H (D4/D5) — navigating the ProfileCard by its parts: the
// pure decision, the DOM resolution (closest [data-role]) and structural
// guards on the real source (no DOM in this repo's tests).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "./sourceScan";
import {
  PART_ROLES, PART_CLICK_SLOP, isPartRole, partFromTarget, movedBeyondSlop, resolvePartClick, type PartClick,
} from "./partNavigation";
import { OBJECT_IDS } from "./inspectorObjects";

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const CARD = read("src/components/canvas/ProfileCard.tsx");
const BOARD = read("src/components/canvas/CanvasBoard.tsx");

const click = (c: Partial<PartClick> = {}): PartClick => ({ role: "bio", wasSelected: true, moved: false, ...c });
const base = { canInteract: true, shiftKey: false, soleSelected: true };

test("click 2 on a part of the selected card (no drag) opens that part", () => {
  assert.equal(resolvePartClick({ ...base, click: click() }), "bio");
  assert.equal(resolvePartClick({ ...base, click: click({ role: "photo" }) }), "photo");
});

test("never: click 1 (card not selected yet), after a drag, with Shift, in multi-select, outside the editor, on the card surface", () => {
  assert.equal(resolvePartClick({ ...base, click: click({ wasSelected: false }) }), null, "click 1 only selects");
  assert.equal(resolvePartClick({ ...base, click: click({ moved: true }) }), null, "a block drag is not a part click");
  assert.equal(resolvePartClick({ ...base, shiftKey: true, click: click() }), null);
  assert.equal(resolvePartClick({ ...base, soleSelected: false, click: click() }), null);
  assert.equal(resolvePartClick({ ...base, canInteract: false, click: click() }), null, "public view / touch: nothing");
  assert.equal(resolvePartClick({ ...base, click: click({ role: null }) }), null, "the card's own surface keeps select / click-through");
  assert.equal(resolvePartClick({ ...base, click: undefined }), null);
});

test("a press-release within the slop is still a click (the drags react to 1px jitter)", () => {
  assert.equal(movedBeyondSlop({ x: 10, y: 10 }, { x: 10 + PART_CLICK_SLOP, y: 10 }), false);
  assert.equal(movedBeyondSlop({ x: 10, y: 10 }, { x: 14, y: 14 }), true);
  assert.equal(movedBeyondSlop(null, { x: 0, y: 0 }), false);
});

test("closest [data-role] inside the card resolves the part; anything else is not a part", () => {
  const card = { contains: (n: unknown) => n === nameEl || n === stray };
  const nameEl = { getAttribute: (k: string) => (k === "data-role" ? "name" : null) };
  const stray = { getAttribute: () => "cardBg" };
  const target = (hit: unknown) => ({ closest: (sel: string) => (sel === "[data-role]" ? hit : null) });
  assert.equal(partFromTarget(target(nameEl), card), "name");
  assert.equal(partFromTarget(target(stray), card), null, "only canvas parts");
  assert.equal(partFromTarget(target({ getAttribute: () => "bio" }), card), null, "outside the card");
  assert.equal(partFromTarget(target(null), card), null);
  assert.equal(partFromTarget(null, card), null);
});

test("every part is an inspector object; no card-level object is a part", () => {
  for (const r of PART_ROLES) assert.ok(OBJECT_IDS.includes(r), r);
  for (const r of ["cardBg", "cardFx", "allText"]) assert.equal(isPartRole(r), false);
});

test("ProfileCard: data-role on every part wrapper it already renders (composed and free), no new hot controls", () => {
  for (const r of ["name", "handle", "descriptor", "bio"]) assert.ok(CARD.includes(`<div {...partProps("${r}")} style={{ position: "absolute", left: boxes.`), r);
  for (const r of ["photo", "location", "views", "links", "logo"]) assert.ok(CARD.includes(`{...partProps("${r}")}`), r);
  assert.ok(CARD.includes("{...partProps(elemKey as PartRole)}"), "free layout wrappers");
  // The hit-stack is unchanged: text lines are NOT marked hot (only the
  // existing photo / links / logo / chrome markers).
  assert.equal((CARD.match(/data-canvas-hot=""/g) ?? []).length, 3);
});

test("D5: the outline is editor-only (menuOpen = inspector open AND canInteract) and the memo compares activePart", () => {
  assert.ok(CARD.includes("menuOpen && activePart === role"));
  // Review H-V M1: the dash rides on a dark + light ring (>= 3:1 on any background).
  assert.ok(CARD.includes("outlineOffset: 4, boxShadow: UIT.ui.chrome.partRing"));
  assert.ok(CARD.includes("const menuOpen = inspectorOpen && !!canInteract;"));
  assert.ok(CARD.includes("prev.activePart        === next.activePart"));
  assert.ok(BOARD.includes('activePart={inspectorEnabled && inspectorCardId===prof.id && editorSel.target?.kind==="profile" ? editorSel.target.objectId : undefined}'));
  for (const f of ["src/components/canvas/PublicCanvas.tsx", "src/components/canvas/MobilePublicCanvas.tsx"]) {
    assert.ok(!read(f).includes("activePart"), `${f} never highlights`);
  }
});

test("the drags are untouched: the press is recorded in the CAPTURE phase; the click only reports", () => {
  assert.ok(CARD.includes("onMouseDownCapture={e => { partDownRef.current = { x: e.clientX, y: e.clientY, wasSelected: isSel }; }}"));
  assert.ok(CARD.includes("onMouseDown={menuOpen ? e => e.stopPropagation() : onMouseDown}"), "same mousedown as before");
  assert.ok(CARD.includes("role: partFromTarget(e.target, cardRef.current),"));
});

test("CanvasBoard: click 2 opens / switches the part; a block drag's trailing click is swallowed; else select / click-through", () => {
  assert.ok(BOARD.includes("onClick={(e,part)=>handleProfileClick(prof.id,e,part)}"));
  const fn = BOARD.slice(BOARD.indexOf("function handleProfileClick("), BOARD.indexOf("function onGlobalMouseMove("));
  assert.ok(fn.includes("const sel = selIdsRef.current;") && fn.includes("soleSelected: sel.size === 1 && sel.has(id)"), "the current selection, not a stale closure");
  assert.ok(fn.includes("didDrag.current = resolveClickAfterDrag(didDrag.current).nextDidDrag;"), "consume-and-clear like every click");
  assert.ok(fn.includes("handleElementClick(id, e);"), "the old path for everything else");
  const open = BOARD.slice(BOARD.indexOf("function openProfilePart("), BOARD.indexOf("function handleProfileClick("));
  assert.ok(open.includes("setInspectorObject(role)") && open.includes("editorSel.memory.setActiveObject(cardId, role); openProfile(cardId);"));
  assert.ok(open.includes("de la tarjeta. Escape para volver.`)"), "a switch is announced (role=status); opening focuses the h2");
  assert.ok(open.includes("setPartNav({ cardId, role });"));
});

test("the 'Editando … · esc volver' pill: editor chrome, visual only, only while a part is open, outside the canvas wrapper", () => {
  const i = BOARD.indexOf('className="mn-partpill"');
  assert.ok(i > 0);
  const tag = BOARD.slice(BOARD.lastIndexOf("<div", i), i + 40);
  assert.ok(tag.includes('data-mnemo-ui=""') && tag.includes('aria-hidden="true"'));
  assert.ok(BOARD.includes("isPartRole(editorSel.target.objectId)"));
  // Review H-V M2: only after a part was opened by clicking it, until it changes.
  assert.ok(BOARD.includes("canInteract && !!inspectorProfile && partNavShown &&"));
  assert.ok(BOARD.includes("editorSel.target.id === partNav.cardId && editorSel.target.objectId === partNav.role"));
  const wrapperStart = BOARD.indexOf("<div ref={canvasWrapperRef}");
  const wrapperEnd = BOARD.indexOf("{showSignals && (", wrapperStart);
  assert.ok(i < wrapperStart || i > wrapperEnd, "not inside the transformed canvas wrapper");
  const css = read("src/ui/editor.css");
  assert.match(css, /\.mn-partpill \{[^}]*pointer-events: none/);
});
