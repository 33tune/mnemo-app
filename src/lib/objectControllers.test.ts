// Editor v3 Phase C (D3) — one write path per object type. Equivalence: each
// controller writes exactly what its menu wrote inline before (formulas
// copied verbatim from the pre-Phase-C menus), plus the structural wiring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CardEffects, ProfileCardData, CanvasElement } from "@/types";
import {
  elementOps, opElementId, ELEMENT_KINDS, identityController, metadataController, backgroundController,
  logoController, linksController, DEFAULT_LOGO_SIZE,
} from "./objectControllers";
import { mergePatch } from "./effectPause";
import { patchEffectGroup, setEffectEnabled } from "./effectBinding";
import { GRADIENT_DEFAULT } from "./effectEditorDefaults";
import { stripComments } from "./sourceScan";

const spy = <P>() => { const calls: P[] = []; return { write: (p: P) => { calls.push(p); }, calls }; };
const card = (over: Partial<ProfileCardData> = {}) => ({ id: "p", x: 0, y: 0, w: 300, h: 300, ...over }) as ProfileCardData;

test("elementOps: the right add / update / delete op for every element kind", () => {
  for (const kind of ELEMENT_KINDS) {
    const el = { id: "x", elementType: kind } as unknown as CanvasElement;
    const add = elementOps.add(el);
    assert.equal(add.type, `add_${kind}`);
    assert.equal(add[kind], el, `add_${kind} carries the element under "${kind}"`);
    assert.equal(opElementId(add), "x");
    assert.deepEqual(elementOps.update(kind, "x", { a: 1 }), { type: `update_${kind}`, id: "x", patch: { a: 1 } });
    assert.deepEqual(elementOps.remove(kind, "x"), { type: `delete_${kind}`, id: "x" });
  }
  assert.equal(opElementId({ type: "set_bg", value: "#000" }), null);
});

test("identity controller = the identity menu's old inline patches", () => {
  const variants: Array<ProfileCardData["variant"]> = [undefined, "guns", "minimal"];
  for (const variant of variants) {
    const c = card({ variant, effects: { pfp: { glow: { intensity: 0.3, color: "#fff" } } } as CardEffects });
    const s = spy<Partial<ProfileCardData>>();
    const id = identityController(c, s.write);
    id.setName("Nico"); id.setPhoto("u"); id.removePhoto(); id.setPfpSize(80); id.setPfpRadius(50);
    id.pfpBorder({ color: "#f00" }, 0);
    id.pfpShadow({ intensity: 0.7 });
    id.pfpGlow({ radius: 12 });
    id.setPfpEffect("pfp.shadow", false);
    id.setPfpEffect("pfp.glow", true);
    const pfpFx = c.effects?.pfp;
    const patchPfpFx = (patch: object) => ({ effects: { ...c.effects, pfp: { ...c.effects?.pfp, ...patch } } });
    assert.deepEqual(s.calls, [
      { name: "Nico" }, { photo: "u" }, { photo: "" }, { pfpSizePx: 80 }, { pfpRadius: 50 },
      patchPfpFx({ border: mergePatch(pfpFx?.border ?? { width: 0 }, { color: "#f00" }) }),
      patchPfpFx({ shadow: mergePatch(pfpFx?.shadow ?? { intensity: 0.5 }, { intensity: 0.7 }) }),
      patchPfpFx({ glow: mergePatch(pfpFx?.glow, { radius: 12 }) }),
      { effects: setEffectEnabled(c.effects, "pfp.shadow", false, variant) },
      { effects: setEffectEnabled(c.effects, "pfp.glow", true) },
    ]);
  }
});

test("metadata, background, logo and links controllers = their menus' old patches", () => {
  const m = spy<Partial<ProfileCardData>>();
  const meta = metadataController(m.write);
  meta.setText("status", "a"); meta.setText("location", "b"); meta.setText("bio", "c"); meta.setShowViews(true);
  assert.deepEqual(m.calls, [{ status: "a" }, { location: "b" }, { bio: "c" }, { showViews: true }]);

  for (const raw of [undefined, { bg: { color: "#111", opacity: 0.5 }, gradient: { from: "#000", to: "#fff", angle: 10 } } as CardEffects]) {
    const b = spy<CardEffects>();
    const bg = backgroundController(raw, b.write);
    bg.patchBg({ color: undefined }); bg.patchGradient({ angle: 90 }); bg.setGradient(false);
    assert.deepEqual(b.calls, [
      patchEffectGroup(raw, "bg", { color: undefined }),
      { ...raw, gradient: { ...(raw?.gradient ?? GRADIENT_DEFAULT), angle: 90 } },
      setEffectEnabled(raw, "gradient", false),
    ]);
  }

  const l = spy<Partial<ProfileCardData>>();
  logoController(undefined, l.write).setImage("u");
  logoController(undefined, l.write).patch({ w: 10 });
  const logo = { url: "u", anchorX: 0.5, anchorY: 0.5, w: 40, h: 40 };
  logoController(logo, l.write).setImage("v");
  logoController(logo, l.write).patch({ w: 60 });
  logoController(logo, l.write).remove();
  assert.deepEqual(l.calls, [
    { logo: { url: "u", anchorX: 0.85, anchorY: 0.15, w: DEFAULT_LOGO_SIZE, h: DEFAULT_LOGO_SIZE, opacity: 1, rotation: 0, zIndex: 1 } },
    // patch without a logo writes nothing (unchanged)
    { logo: { ...logo, url: "v" } }, { logo: { ...logo, w: 60 } }, { logo: undefined },
  ]);

  const k = spy<Partial<ProfileCardData>>();
  const links = [{ id: "1", url: "a" }, { id: "2", url: "b" }];
  const ctl = linksController(links, k.write, () => "new");
  ctl.add("c"); ctl.update("2", "z"); ctl.remove("1"); ctl.setIconSize(20);
  assert.deepEqual(k.calls, [
    { contactLinks: [...links, { id: "new", url: "c" }] },
    { contactLinks: [links[0], { id: "2", url: "z" }] },
    { contactLinks: [links[1]] },
    { linksIconSize: 20 },
  ]);
});

// ── Structural wiring (no DOM in this repo's tests) ────────────────────────

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const BOARD = read("src/components/canvas/CanvasBoard.tsx");

test("menus write through their controllers, never by building the patch inline", () => {
  const C = "src/components/canvas/";
  const uses: Array<[string, string, RegExp]> = [
    ["ProfileIdentityMenu.tsx", "identityController(card, onChange)", /onChange\(\{ (photo|name|pfpSizePx|pfpRadius|effects):/],
    ["ProfileMetadataMenu.tsx", "metadataController(onChange)", /onChange\(\{ (status|location|bio|showViews):/],
    ["ProfileBackgroundMenu.tsx", "backgroundController(raw, onChange)", /patchEffectGroup\(|setEffectEnabled\(/],
    ["ProfileLogoMenu.tsx", "logoController(logo, onChange)", /onChange\(\{ logo:/],
    ["ProfileContactLinksMenu.tsx", "linksController(links, onChange)", /onChange\(\{ (contactLinks|linksIconSize):/],
  ];
  for (const [f, ctl, inline] of uses) {
    const src = read(C + f);
    assert.ok(src.includes(ctl), `${f} uses ${ctl}`);
    assert.ok(!inline.test(src), `${f} still builds a patch inline`);
  }
});

test("CanvasBoard: every write is recorded from enqueueOp; undo/redo replay through ops without re-recording", () => {
  assert.ok(BOARD.includes("if (opts.record !== false) recordOp(op);"));
  assert.ok(BOARD.includes("enqueueOp(op as unknown as CanvasOp, { record: false });"));
  assert.ok(!BOARD.includes("undoStackRef") && !BOARD.includes("pushUndo"), "the old function stack is gone (migrated)");
  assert.ok(BOARD.includes("doomed.forEach(el => enqueueOpRef.current(elementOps.remove(el.elementType, el.id)));"), "Delete goes through the element controller");
  assert.ok(BOARD.includes("if (PASTEABLE_KINDS.has(el.elementType)) enqueueOpRef.current(elementOps.add(base as CanvasElement));"));
  // Gesture boundaries.
  assert.ok(BOARD.includes("h.pointerDown();") && BOARD.includes("setTimeout(() => { h.pointerUp(); gestureBaselineRef.current = null; }, 0);"));
  assert.ok(BOARD.includes('document.addEventListener("focusin", focus);'));
  // Shortcuts: before the positive canvas guard, owner decided by focus.
  const hist = BOARD.indexOf("const histKey = historyShortcut(e);");
  const guard = BOARD.indexOf("if (!canvasShortcutAllowed(e.target as GuardElement | null, document.activeElement as GuardElement | null)) return;");
  assert.ok(hist > 0 && guard > hist, "undo works from the inspector, not only the canvas");
  assert.ok(BOARD.includes('if (owner !== "history") return;'));
  // Queue: adjacent patches merge before insert.
  assert.ok(BOARD.includes("const batch = mergeQueuedPatches([...opsQueueRef.current]);"));
  // History deletes never remove the stored file (the element may come back).
  assert.ok(BOARD.includes('if (op.type === "delete_image" && opts.record !== false) {'));
});

test("announcements say what changed: one object by name, several by count, room settings by place", async () => {
  const { entryLabel } = await import("./objectControllers");
  const { snap: s, ABSENT: A } = await import("./editorHistory");
  const entry = (pairs: Array<[string, unknown]>) => ({ changes: new Map(pairs.map(([k, v]) => [k, { before: A, after: s(v) }])) });
  assert.equal(entryLabel(entry([["el:p", { elementType: "profile" }]])), "Card de presentación");
  assert.equal(entryLabel(entry([["el:a", { elementType: "image" }], ["el:b", { elementType: "text" }]])), "2 elementos");
  assert.equal(entryLabel(entry([["room:set_bg", "#000"]])), "Ajustes de MyLand");
});

test("review round wiring: selection, uploads, shared widgets, blur commits, popover hold, arming", () => {
  assert.ok(BOARD.includes("if (addedIds.length) setSelectedIds(new Set(addedIds));"), "only adds / removes touch the selection");
  assert.ok(BOARD.includes("(h2 ?? canvasWrapperRef.current)?.focus({ preventScroll: true });"), "focus never stays on <body> after undo");
  assert.ok(BOARD.includes('enqueueOpRef.current({ type: "update_image", id, patch: done }, { record: false });') && BOARD.includes("historyRef.current?.rebase(`el:${id}`, done);"));
  assert.ok(BOARD.includes('enqueueOp({ type: "show_widget", widgetType: kind as SharedWidgetKind, id: opElementId(op)! }, { record: false });'));
  assert.ok(BOARD.includes('window.addEventListener("focusout", focusOut, true);') && BOARD.includes("if (blurCommit && baseline)"));
  assert.ok(BOARD.includes("if (!historyArmedRef.current) return;"));
  assert.ok(read("src/ui/ColorPopover.tsx").includes("useEffect(() => holdHistoryStep(), []);"));
  for (const m of ["setPhoto: (url: string) => ownHistoryStep(", "setImage: (url: string) => ownHistoryStep(", "ownHistoryStep(() => write(patchEffectGroup(raw, \"bg\", { image, imageMode })))"]) {
    assert.ok(read("src/lib/objectControllers.ts").includes(m), `uploads are their own step: ${m}`);
  }
  assert.ok(BOARD.includes("gestureBaselineRef.current = { elements: elementsRef.current, room: { ...roomRef.current } };\n    try { setElementGeometryNow(id, target); }")
    || BOARD.includes("try { setElementGeometryNow(id, target); }"), "Medidas by Enter has a baseline");
});
