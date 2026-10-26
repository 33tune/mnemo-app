// Editor v3 Phase D — the editor shell: rail, editor topbar, floating dock,
// "Tu sala" and the visual grid. Structural guards on the real source (no DOM
// in this repo's tests) + the pure view-offset math with the rail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "@/lib/sourceScan";
import { T } from "./tokens";
import { inspectorViewOffset, INSPECTOR_GUTTER } from "@/lib/inspectorViewOffset";
import { centerCardPosition, getFreeformCardBounds } from "@/lib/cardGeometry";
import { editorSelectionReducer as reduce } from "@/lib/editorSelection";

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const BOARD = read("src/components/canvas/CanvasBoard.tsx");
const TOPBAR = read("src/components/canvas/Topbar.tsx");
const ROOM = read("src/components/canvas/RoomInspector.tsx");
const RAIL = read("src/components/canvas/EditorRail.tsx");
const GRID = read("src/components/canvas/CanvasGrid.tsx");
const CARD = read("src/components/canvas/ProfileCard.tsx");

test("grid: editor-only, inside the canvas wrapper, no pointer events — never in any public render", () => {
  assert.ok(BOARD.includes("{canEdit && <CanvasGrid visible={gridOn} />}"));
  const start = BOARD.indexOf("<div ref={canvasWrapperRef}");
  const end = BOARD.indexOf("if(!cardMenuId||!cardMenuRect)return null;", start);
  assert.ok(BOARD.slice(start, end).includes("<CanvasGrid"), "inside the wrapper: it follows the view offset");
  assert.match(GRID, /pointerEvents: "none"/);
  assert.ok(GRID.includes('aria-hidden="true"'));
  for (const f of ["src/app/[handle]/page.tsx", "src/lib/mobileFit.ts", "src/components/canvas/ProfileCard.tsx"]) {
    const src = read(f);
    assert.ok(!src.includes("CanvasGrid") && !src.includes("data-mnemo-grid"), `${f} must never draw the editor grid`);
  }
  assert.ok(GRID.includes('export const GRID_PREF_KEY = "myland.editorGrid";'), "a local preference, never room data");
});

test("topbar: the editor variant only while the owner edits the canvas; visitors keep the classic bar", () => {
  assert.ok(BOARD.includes("const editorShell = canEdit;"));
  assert.ok(BOARD.includes("editor={editorShell ? {"));
  assert.ok(TOPBAR.includes("if (editor) {"), "the classic bar's JSX is untouched below the early return");
  const ed = TOPBAR.slice(TOPBAR.indexOf("function EditorTopbar("));
  assert.ok(ed.includes("[EDITOR_UI_ATTR]"), "an editor UI surface (themed, keyboard guards)");
  for (const keep of ["tabs.map(", "onLogout &&", "onPublish"]) assert.ok(ed.includes(keep), `keeps ${keep}`);
  for (const add of ['aria-label="Deshacer"', 'aria-label="Rehacer"', "Vista previa", "PUBLISH_LABEL[publishState]"]) assert.ok(ed.includes(add), `adds ${add}`);
  assert.ok(!/sin publicar|unpublished/i.test(ed), "no unpublished-change count (out of scope)");
  assert.ok(ed.includes('target="_blank" rel="noopener noreferrer"'), "Vista previa opens the existing public profile");
  // R1: the taller glass topbar overlays the canvas — the offset never changes.
  assert.ok(CARD.includes("export const CANVAS_TOP_OFFSET = 44;"));
  assert.equal(T.ui.size.editorTopbarH, 60);
});

test("Tu sala: the room settings moved out of the + menu with IDENTICAL operations", () => {
  assert.ok(!BOARD.includes("Ajustes de MyLand"), "no longer in the + menu");
  for (const op of [
    'enqueue({ type: "set_bg", value: v })',
    'enqueue({ type: "set_wallpaper", value: "" })',
    'enqueue({ type: "set_bg", value: ROOM_DEFAULT_BG })',
    'enqueue({ type: "set_wallpaper_blur", value: 0 })',
    'enqueue({ type: "set_wallpaper_brightness", value: 100 })',
    'enqueue({ type: "set_wallpaper_vignette", value: 0 })',
    'enqueue({ type: "set_wallpaper_blur", value: v })',
    'enqueue({ type: "set_wallpaper_brightness", value: v })',
    'enqueue({ type: "set_wallpaper_vignette", value: v })',
    'enqueue({ type: "set_space_music", value: undefined })',
    'enqueue({ type: "set_space_font", value: undefined })',
    'enqueue({ type: "set_space_cursor", value: undefined })',
  ]) assert.ok(ROOM.includes(op), `Tu sala sends ${op}`);
  assert.ok(ROOM.includes('export const ROOM_DEFAULT_BG = "#0a0a0c";'));
  assert.ok(BOARD.includes("enqueue: (op: RoomOp) => enqueueOp(op as CanvasOp),"), "through the same enqueueOp (history, persistence)");
  // Liquid glass: the "Tocá algo para editarlo" hint lives on the canvas (L5).
  for (const s of ["Mostrar cuadrícula", "Tema del editor", "Apariencia del editor"]) assert.ok(ROOM.includes(s));
  assert.ok(ROOM.includes("useEditorTheme()"), "Apariencia: Light / Dark / OG");
});

test("Tu sala opens on demand from the rail (user decision) and only with nothing selected", () => {
  assert.ok(RAIL.includes('<RailButton icon="gear" label="Tu sala" tip="Ajustes de tu sala" id={RAIL_ROOM_BUTTON_ID} expanded={roomOpen}'));
  assert.ok(BOARD.includes("onRoom={() => { if (roomOpen) closeInspector(); else { setMenuOpen(false); openRoom(); } }}"));
  // openRoom = clear the selection, then open the room target.
  const s1 = reduce({ selectedIds: new Set(["a"]), target: null }, { type: "select", ids: new Set() });
  const s2 = reduce(s1, { type: "open", target: { kind: "room" } });
  assert.deepEqual(s2.target, { kind: "room" });
  assert.equal(reduce(s2, { type: "select", ids: new Set(["a"]) }).target, null, "touching an object closes Tu sala");
});

test("rail: wide viewports only; V / A / L only with focus on the canvas; + menu next to it", () => {
  assert.ok(BOARD.includes('const railShown = editorShell && canInteract && inspLayout.mode === "dock";'), "no rail in the narrow layout");
  const guard = BOARD.indexOf("if (!canvasShortcutAllowed(e.target as GuardElement | null, document.activeElement as GuardElement | null)) return;");
  const keys = BOARD.indexOf("railKeyRef.current?.(e.key.toLowerCase())");
  assert.ok(guard > 0 && keys > guard, "plain-letter tools run after the positive canvas guard");
  assert.ok(RAIL.includes('aria-label="Herramientas"') && RAIL.includes("[EDITOR_UI_ATTR]"));
  // Phase E: Capas (L) is live — it opens the Layers panel in the dock.
  assert.ok(RAIL.includes('label="Capas" keys="L" id={RAIL_LAYERS_BUTTON_ID} expanded={layersOpen}'), "Capas opens Layers (Phase E)");
  assert.ok(BOARD.includes("left:RAIL_ADD_MENU_POS.left,top:RAIL_ADD_MENU_POS.top"));
  assert.ok(BOARD.includes("(!railShown || isActive)"), "with the rail the floating + is gone; the trash still shows during a drag");
});

test("dock: the widest card is centered BETWEEN the rail and the floating dock", () => {
  const occ = T.ui.size.inspectorW + T.ui.size.dockMargin;
  const left = T.ui.size.railW;
  const { maxW } = getFreeformCardBounds();
  for (const vw of [T.ui.breakpoint.inspectorSheet, 1280, 1440, 1920]) {
    for (const w of [240, 480, maxW]) {
      const { x } = centerCardPosition(vw, 900, w, 300, 44);
      const r = inspectorViewOffset({ viewportW: vw, inspectorW: occ, left, box: { x, w } });
      assert.equal(r.covered, false, `vw=${vw} w=${w}`);
      assert.ok(x - r.dx >= left + INSPECTOR_GUTTER - 0.5, "never under the rail");
      assert.equal(Math.round(x + w / 2 - r.dx), Math.round((left + vw - occ) / 2), "centered in the visible area");
    }
  }
});

test("Liquid glass: Publicar is the theme accent with its ink (>= 4.5:1 in every theme)", () => {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  assert.equal(T.ui.accent.brand, T.ui.accent.main);
  for (const t of Object.values(T.theme)) {
    const [a, b] = [lum(t.accent), lum(t.accentInk)];
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5);
  }
});

test("Phase G: the image link moved to the image inspector (no canvas dialog / chip left)", () => {
  assert.ok(!BOARD.includes('aria-label="Link de la imagen"') && !BOARD.includes("ImageLinkPortal"));
  assert.ok(read("src/components/canvas/ImageInspector.tsx").includes("updateImage(img.id, { linkUrl: v || undefined })"));
});

test("Phase D: chrome and the sheet keep clear of the 60px editor topbar (view / chrome only, never geometry)", () => {
  assert.ok(CARD.includes("export const EDITOR_CHROME_TOP = 60;"));
  assert.equal(T.ui.size.editorTopbarH, 60, "parity with ProfileCard's EDITOR_CHROME_TOP");
  assert.ok(CARD.includes("topOffset: EDITOR_CHROME_TOP });"), "only the Editar opener uses it");
  assert.ok(CARD.includes("centerCardPosition(viewportW, viewportH, card.w, cardH, CANVAS_TOP_OFFSET)"), "geometry keeps 44 (R1)");
  assert.ok(BOARD.includes("inspectorSheetOffset({ viewportH, topOffset: UIT.ui.size.editorTopbarH, sheetH, box })"));
});

test("Phase D review: narrow viewports get the compact editor topbar (1.4.10) without losing any function", () => {
  assert.ok(BOARD.includes('compact: inspLayout.mode === "sheet",'), "same breakpoint as the bottom sheet");
  const c = TOPBAR.slice(TOPBAR.indexOf("function CompactEditorTopbar("));
  assert.ok(c.includes("[EDITOR_UI_ATTR]"));
  for (const k of ['aria-label="Deshacer"', "PUBLISH_LABEL[publishState]", "mn-topbar__btn--touch"]) assert.ok(c.includes(k), `bar keeps ${k}`);
  const menu = c.slice(c.indexOf("{open && ("));
  for (const k of ["tabs.map(", "editor.onRedo", "editor.previewHref", "onLogout &&"]) assert.ok(menu.includes(k), `"Más" keeps ${k}`);
  assert.ok(c.includes('e.key === "Escape"') && c.includes("moreRef.current?.focus"), "Esc closes and returns focus to Más");
  assert.ok(!c.includes("aria-haspopup"), "a disclosure (group of buttons), not a role=menu popup");
  assert.equal((c.match(/e.key === "Escape"/g) ?? []).length, 2, "Esc closes from the menu and from Más itself");
});

test("Phase D review: \"Tu sala\" opens on touch devices too (room settings were reachable from + before D)", () => {
  assert.ok(BOARD.includes("const roomShown = roomOpen && canEdit;"));
  assert.ok(BOARD.includes('{inspectorEnabled && (canInteract || roomShown) && ('));
  // Phase E: Capas joins the card's inspector on the canInteract side (no touch editing).
  // Phase G: so do the text / image / Music inspectors.
  assert.ok(BOARD.includes("const inspectorShown = ((!!inspectorProfile || !!inspectorElement || layersOpen) && canInteract) || roomShown;"));
});

test("Phase D review: object chrome clears the 60px topbar and the rail (placement only, geometry keeps 44)", () => {
  assert.ok(BOARD.includes("topOffset: editorShell ? EDITOR_CHROME_TOP : 44, left: railW"));
});

test("Liquid glass L5: the wide editor topbar is two floating capsules; nothing of the old bar is dropped", () => {
  const ed = TOPBAR.slice(TOPBAR.indexOf("function EditorTopbar("), TOPBAR.indexOf("function CompactEditorTopbar("));
  for (const k of ['className="mn-capsule mn-capsule--brand"', 'className="mn-capsule mn-capsule--actions"', "myLand", "editor.path"]) assert.ok(ed.includes(k), k);
  assert.ok(ed.includes("right: editor.right ?? T.ui.size.dockMargin"), "the actions capsule clears the dock");
  assert.ok(BOARD.includes("right: UIT.ui.size.dockMargin + fabShift,"));
  // "Más" keeps MY LAND and Salir; Esc returns focus to it.
  const menu = ed.slice(ed.indexOf("{open && ("));
  for (const k of ["tabs.map(", "onLogout &&"]) assert.ok(menu.includes(k), `"Más" keeps ${k}`);
  assert.ok(ed.includes("moreRef.current?.focus"));
  // The editor theme toggle cycles the three themes (Tu sala › Apariencia stays).
  assert.ok(ed.includes("EDITOR_THEMES[(EDITOR_THEMES.indexOf(theme) + 1) % EDITOR_THEMES.length]"));
  // Status is a dot, never a count of unpublished changes.
  assert.ok(ed.includes('className="mn-capsule__status" data-dirty={dirty || undefined}'));
});

test("Liquid glass L5: floating rail capsule, dock 16px from the top, Agregar menu and the empty-canvas hint", () => {
  assert.equal(T.ui.size.railW, 16 + 56, "margin + capsule (44 + 2 x 6)");
  assert.ok(T.ui.size.railW + 16 + getFreeformCardBounds().maxW + 16 + T.ui.size.inspectorW + T.ui.size.dockMargin <= T.ui.breakpoint.inspectorSheet);
  assert.ok(RAIL.includes('className="mn-rail__ind"') && RAIL.includes("translateY(${active * RAIL_STEP}px)"));
  assert.ok(BOARD.includes("top={editorShell ? (sheetMode ? UIT.ui.size.editorTopbarH + UIT.ui.size.dockMargin : UIT.ui.size.dockMargin) : CANVAS_TOP_OFFSET}"));
  for (const k of ['label:"Texto"', 'label:"Imagen"', 'className="mn-addmenu__well"']) assert.ok(BOARD.includes(k), k);
  // Music players are out of the app (2026-10-27): only the room's own music.
  assert.ok(!BOARD.includes('label:"Music"'), "no Music in Agregar");
  // The card always exists (created blank on load), so Agregar never offers it.
  assert.ok(!BOARD.includes('label:"Card de presentación"'), "no 'Card de presentación' in Agregar");
  assert.ok(BOARD.includes('enqueueOp({ type: "add_profile", profile: p }, { record: false })'), "the blank card is not an undo step");
  assert.ok(BOARD.includes("{railShown && selectedIds.size === 0 && !menuOpen && !inspectorShown && !addingText && !isActive && ("), "the hint only with nothing selected");
});
