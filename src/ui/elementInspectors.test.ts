// Editor v3 Phase G — Texto, Imagen y Música in the dock (D8): the three
// inspectors, their host, the canvas openers that replaced the floating
// toolbars / Music's MenuPanel, and the writers they use. Structural guards
// on the real source (no DOM in this repo's tests) + the pure helpers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { CANVAS_TEXT_DEFAULTS, CANVAS_TEXT_SIZE_RANGE } from "@/lib/canvasText";
import { nudgeResize } from "@/lib/canvasNudge";
import { imageCornerValue, isCornerActive, IMAGE_CORNERS } from "@/components/canvas/ImageInspector";
import { excerpt, normalizeRotation } from "@/components/canvas/ElementInspectorParts";
import type { CanvasText } from "@/types";

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const BOARD = read("src/components/canvas/CanvasBoard.tsx");
const HOST = read("src/components/canvas/EditorHost.tsx");
const TEXT = read("src/components/canvas/TextInspector.tsx");
const IMAGE = read("src/components/canvas/ImageInspector.tsx");
const MUSIC = read("src/components/canvas/MusicInspector.tsx");
const WIDGET = read("src/components/canvas/MusicCardWidget.tsx");
const PARTS = read("src/components/canvas/ElementInspectorParts.tsx");

test("the host mounts Texto / Imagen / Música for their target only, with the same shell as every inspector", () => {
  for (const c of ["<TextInspector", "<ImageInspector", "<MusicInspector"]) assert.ok(HOST.includes(c), c);
  assert.ok(HOST.includes('el.kind === "text" && text?.text.id === el.id'));
  assert.ok(HOST.includes('el.kind === "image" && image?.image.id === el.id'));
  assert.ok(HOST.includes('el.kind === "music" && music?.card.id === el.id'));
  assert.ok(HOST.includes("returnFocusTo: () => document.getElementById(elementEditButtonId(el.id))"), "focus returns to that element's Editar");
  for (const f of [TEXT, IMAGE, MUSIC]) assert.ok(f.includes("<InspectorShell"), "dock / sheet like the card's inspector");
});

test("D8: Music leaves its floating MenuPanel — the pencil opens the dock; the panel's dark lock (A7) is gone", () => {
  assert.ok(!WIDGET.includes("<MenuPanel") && !WIDGET.includes("createPortal"), "no anchored panel left");
  assert.ok(WIDGET.includes('label="Editar Music"') && WIDGET.includes("onActivate={() => onEdit()}"));
  assert.ok(WIDGET.includes("id={elementEditButtonId(card.id)}"), "focus returns to it when the inspector closes");
  assert.ok(BOARD.includes('onEdit={() => handleElementEdit("music", mc.id)}'));
  assert.ok(!MUSIC.includes('theme="dark"') && !/\bT\.border\b/.test(MUSIC), "follows the editor theme");
  // Liquid glass: cards (no ad-hoc dividers) and the pinned element footer.
  assert.ok(MUSIC.includes('<MenuSection label="Canción" pinned>') && MUSIC.includes("footer={<ElementFooter"));
});

test("Music keeps EXACTLY its writes: effect owner model, pause-instead-of-erase, O2 / O4", () => {
  for (const w of [
    'const owner: EffectOwner = { kind: "music", raw, effective: effectiveEffects, write: setEffects };',
    'fx.setEnabled("gradient", v)', 'fx.setEnabled("shadow", on)', "fx.setGlowFlag(flag, on)", "fx.setHoverGlow(on)",
    "updateCard(card.id, { audioUrl: publicUrl })", 'updateCard(card.id, { audioUrl: "" })',
    "updateCard(card.id, { title: v })", "updateCard(card.id, { artist: v })", "updateCard(card.id, { volume: v })",
    "updateCard(card.id, { textColor: v })", "updateCard(card.id, { textSize: v })", "updateCard(card.id, { textSize: undefined })",
    "bg: mergePatch(raw?.bg, { image: undefined })", "const effectiveEffects: CardEffects = getMusicCardEffects(card);",
    "const D = EFFECT_DISPLAY_DEFAULTS.music;", "displayScale={100 / MUSIC_TEXT_SIZE_DEFAULT}",
  ]) assert.ok(MUSIC.includes(w), w);
  // The rendered (stack-resolved) card, like the widget receives.
  assert.ok(BOARD.includes("card: resolveModuleStyle(inspectorElement),"));
});

test("Texto: only CanvasText's fields, written through updateText (update_text, the old toolbar's op)", () => {
  const keys = [...TEXT.matchAll(/set\(\{ (\w+):/g)].map(m => m[1]);
  const canvasText: Array<keyof CanvasText> = ["content", "font", "size", "letterSpacing", "uppercase", "color", "opacity"];
  assert.deepEqual([...new Set(keys)].sort(), [...canvasText].sort());
  assert.ok(TEXT.includes("const set = (patch: Partial<CanvasText>) => updateText(t.id, patch);"));
  assert.ok(BOARD.includes("text: inspectorElement, updateText,"));
  // Same size bounds as the old −/+ and the Ctrl/⌘+arrow resize.
  const t = { elementType: "text", size: 299, x: 0, y: 0 } as unknown as Parameters<typeof nudgeResize>[0];
  assert.deepEqual(nudgeResize(t, 50, 0, { w: 1000, h: 800, topOffset: 44 }), { kind: "text", size: CANVAS_TEXT_SIZE_RANGE.max });
  assert.deepEqual(nudgeResize({ ...t, size: 11 } as typeof t, -50, 0, { w: 1000, h: 800, topOffset: 44 }), { kind: "text", size: CANVAS_TEXT_SIZE_RANGE.min });
});

test("a new text is created with the inspector's defaults (one source)", () => {
  assert.ok(BOARD.includes("...CANVAS_TEXT_DEFAULTS,"));
  assert.deepEqual(CANVAS_TEXT_DEFAULTS, { content: "text", font: "DM Sans", size: 48, color: "#ffffff", opacity: 1, letterSpacing: 0, uppercase: false });
});

test("Imagen: corners keep the toolbar's stored values; link; replace; NO opacity (CanvasImage has no such field)", () => {
  assert.deepEqual(IMAGE_CORNERS.map(c => c.value), [0, 8, 20, 999]);
  assert.equal(imageCornerValue({ isTransparent: true }), 0);
  assert.equal(imageCornerValue({ isTransparent: false }), 8);
  assert.equal(imageCornerValue({ borderRadius: 64, isTransparent: false }), 64);
  assert.ok(isCornerActive(64, 999) && isCornerActive(999, 999) && !isCornerActive(20, 999) && isCornerActive(20, 20));
  assert.ok(IMAGE.includes("updateImage(img.id, { borderRadius: c.value })"));
  assert.ok(IMAGE.includes("updateImage(img.id, { linkUrl: v || undefined })"));
  assert.ok(!/opacity/i.test(IMAGE.replace(/No opacity[^\n]*/g, "")), "no opacity control (would be a new data field)");
  assert.ok(BOARD.includes('updateImage: (id: string, patch: Partial<CanvasImageType>) => enqueueOp({ type: "update_image", id, patch }),'));
});

test("Reemplazar = upload, then ONE update_image in ONE undo step (src, storage path, natural size, ratio-keeping height)", () => {
  const fn = BOARD.slice(BOARD.indexOf("function replaceImage("), BOARD.indexOf("function measuresFor("));
  assert.ok(fn.includes("uploadToStorage(file).then("));
  assert.equal((fn.match(/ownHistoryStep\(/g) ?? []).length, 1);
  for (const k of ["src: publicUrl", "storage_path: storagePath", "naturalW: nw", "naturalH: nh", "Math.round(cur.w * nh / nw)"]) assert.ok(fn.includes(k), k);
  assert.ok(fn.includes("file.size > MAX_FILE_BYTES"), "same size limit as a drop");
});

test("Eliminar / Quitar = the Delete key's path (element controller, one history entry, focus to the canvas, announced)", () => {
  const fn = BOARD.slice(BOARD.indexOf("function deleteFromInspector("), BOARD.indexOf("function toggleLockFromInspector("));
  assert.match(fn, /historyRef\.current\?\.close\(\);\s*enqueueOpRef\.current\(elementOps\.remove\(el\.elementType, el\.id\)\);\s*historyRef\.current\?\.close\(\);/);
  assert.ok(fn.includes("canvasWrapperRef.current?.focus({ preventScroll: true })") && fn.includes("para deshacer"));
  const lock = BOARD.slice(BOARD.indexOf("function toggleLockFromInspector("), BOARD.indexOf("function replaceImage("));
  assert.ok(lock.includes("ownHistoryStep(() => enqueueOpRef.current(elementOps.update(el.elementType, id, { locked:"));
});

test("canvas: 'Editar' openers replace the image toolbar, the Link chip and the text format popover", () => {
  assert.ok(BOARD.includes('label="Editar imagen"') && BOARD.includes('onActivate={()=>handleElementEdit("image",img.id)}'));
  assert.ok(BOARD.includes('label="Editar texto"') && BOARD.includes('onActivate={()=>handleElementEdit("text",txt.id)}'));
  for (const gone of ['aria-label="Formato del texto"', 'aria-label="Opciones de imagen"', 'aria-label="Capa del texto"', "Link toggle button", "linkEditId"]) {
    assert.ok(!BOARD.includes(gone), `${gone} is gone`);
  }
  // Lock / rotate / resize stay on the canvas.
  assert.ok(BOARD.includes('<LockBtn name="imagen"') && BOARD.includes('<LockBtn name="texto"'));
  assert.ok(BOARD.includes('<RotateHandle name="imagen"') && BOARD.includes('<RotateHandle name="texto"'));
  // Same "Editar" contract as the card's (open / expand / focus the h2; never close).
  const fn = BOARD.slice(BOARD.indexOf("const handleElementEdit = useCallback("), BOARD.indexOf("const handleInspectorClose"));
  assert.ok(fn.includes("openElement(kind, id)") && fn.includes("expandInspectorRef.current()") && fn.includes("INSPECTOR_TITLE_ID") && !fn.includes("closeInspector"));
});

test("pending from Phase B: rotate measures against the DOM center (the view offset moves the canvas)", () => {
  assert.ok(BOARD.includes('const r=imgElRefs.current.get(img.id)?.getBoundingClientRect();if(r)startRotate(img.id,"image",e,r.left+r.width/2,r.top+r.height/2)'));
  assert.ok(WIDGET.includes("const r = cardRef.current?.getBoundingClientRect(); onRotateMD(e, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);"));
  assert.ok(BOARD.includes('(e, c) => startRotate(mc.id, "music", e, c?.x ?? mc.x + mc.w / 2, c?.y ?? mc.y + mc.h / 2)'));
});

test("the view offset keeps the edited element visible (its own box; a free text's rendered box) — sticky, minimal (review G-R MAYOR 1)", () => {
  assert.ok(BOARD.includes('inspectorElement.elementType === "text" ? textChromeBox(inspectorElement)'));
  assert.ok(BOARD.includes("stickyElementOffset({ prev, start: inspectorBox.x, size: inspectorBox.w, visibleStart: railW,"));
  assert.ok(BOARD.includes("stickyElementOffset({ prev, start: inspectorBox.y, size: inspectorBox.h, visibleStart: UIT.ui.size.editorTopbarH + SHEET_OPENER_RESERVE,"));
  // Closure G-R: during a gesture the previous offset is the applied one and nothing is remembered.
  assert.ok(BOARD.includes("const prev = viewGesture") && BOARD.includes("const remember = (d: number) => { if (!viewGesture) elementOffsetRef.current = { key, d }; };"));
  assert.ok(BOARD.includes("box: { x: inspectorBox.x, w: inspectorBox.w }") && BOARD.includes("const box = { y: inspectorBox.y, h: inspectorBox.h };"));
});

test("Medidas: the drag's writers, real ranges (topOffset 44, R1); rotation for images and texts; none in space_mobile", () => {
  assert.ok(BOARD.includes('if (target.rotation !== undefined && (el.elementType === "music" || el.elementType === "image" || el.elementType === "text")) {'));
  const fn = BOARD.slice(BOARD.indexOf("function measuresFor("), BOARD.indexOf("function openLayersFromInspector("));
  assert.ok(fn.includes('if (canvasMode === "space_mobile") return undefined;'));
  assert.ok(fn.includes("const top = CANVAS_TOP_OFFSET;") && fn.includes("onGeometry: g => setElementGeometry(el.id, g)"));
  for (const k of ["m.onGeometry({ x: v })", "m.onGeometry({ y: v })", "m.onGeometry({ w: v })", "m.onGeometry({ h: v })", "m.onGeometry({ rotation: v })"]) assert.ok(PARTS.includes(k), k);
  assert.equal(normalizeRotation(270), -90);
  assert.equal(normalizeRotation(-190), 170);
});

test("layer: the footer sets it ONLY through Capas' own writer (setElementLayer), and opens Capas (selection kept)", () => {
  for (const f of [TEXT, IMAGE, MUSIC]) {
    assert.ok(f.includes("<ElementFooter") && f.includes("onOpenLayers={p.onOpenLayers}") && f.includes("onSetLayer={p.onSetLayer}"));
    assert.ok(!/layer:\s*\d/.test(f) && !f.includes("layer: l"), "no direct layer writes");
  }
  assert.equal((BOARD.match(/onSetLayer: \(layer: 0 \| 1 \| 2\) => applyLayerChange\(inspectorElement\.id, setElementLayer\(layerItemsNow\(\), inspectorElement\.id, layer\)\)/g) ?? []).length, 3);
  assert.ok(PARTS.includes("Ordenar en Capas"));
  // Closing Capas opened from an inspector returns to that element's "Editar".
  assert.ok(BOARD.includes("layersFromElementRef.current = inspectorTargetElIdRef.current;"));
  assert.ok(BOARD.includes("(from ? document.getElementById(elementEditButtonId(from)) : null)"));
  assert.match(BOARD, /function openLayersFromInspector\(\) \{\s*layersFromElementRef\.current = inspectorTargetElIdRef\.current;\s*setMenuOpen\(false\);\s*openLayers\(\);\s*\}/);
});

test("header helpers", () => {
  assert.equal(excerpt("  notas   de\nverano  "), "notas de verano");
  assert.equal(excerpt("a".repeat(40), 10), `${"a".repeat(9)}…`);
});
