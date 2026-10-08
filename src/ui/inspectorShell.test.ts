// Menu redesign Phase 2 — structural guards on the real source of the docked
// inspector and its integration (no DOM in this repo's tests: these read the
// components the way uiTokens/editorCapabilities tests do).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments } from "@/lib/sourceScan";

const root = process.cwd();
const read = (f: string) => stripComments(readFileSync(join(root, f), "utf8"));
const SHELL = read("src/ui/InspectorShell.tsx");
const PANEL = read("src/ui/MenuPanel.tsx");
const CARD = read("src/components/canvas/ProfileCard.tsx");
const BOARD = read("src/components/canvas/CanvasBoard.tsx");
const LIST = read("src/components/canvas/ObjectList.tsx");
const INSPECTOR = read("src/components/canvas/ProfileInspector.tsx");
const HOST = read("src/components/canvas/EditorHost.tsx");
const CONFIG = read("src/components/canvas/ProfileConfigMenu.tsx");
const ROLE = read("src/components/canvas/RoleTypographyFields.tsx");

test("the inspector is a stable-named landmark and an editor root — not a dialog", () => {
  assert.match(SHELL, /<aside/);
  assert.ok(SHELL.includes('aria-label="Inspector"'), "stable name (the h2 changes per object)");
  assert.ok(SHELL.includes("[EDITOR_ATTR]"), "data-mnemo-editor: keyboard guards treat it as editor territory");
  assert.ok(!SHELL.includes('role="dialog"') && !SHELL.includes("aria-modal"), "non-modal, no dialog role");
  assert.ok(SHELL.includes("onMouseDown={e => e.stopPropagation()}") && SHELL.includes("onClick={e => e.stopPropagation()}"),
    "nothing inside starts a canvas drag or selects the card");
  assert.match(SHELL, /<h2[^>]*id=\{INSPECTOR_TITLE_ID\}[^>]*tabIndex=\{-1\}/, "visible h2, focus target of Editar/F6");
});

test("one focus contract for both panels (usePanelFocus) — no parallel panel system", () => {
  assert.ok(PANEL.includes("export function usePanelFocus("));
  assert.ok(PANEL.includes("usePanelFocus(rootRef"), "MenuPanel uses it");
  assert.ok(SHELL.includes("usePanelFocus(rootRef, { focusOnMount: () => titleRef.current, returnFocusTo })"), "the shell focuses its h2 and returns focus");
  assert.ok(SHELL.includes('className={`mn-panel ${sheet ? "mn-panel--sheet" : "mn-panel--docked"}`}'), "same .mn-panel surface, docked / sheet modifier");
});

test("Esc in the inspector closes it unless a popover / draft input already handled it", () => {
  assert.match(SHELL, /if \(e\.key !== "Escape" \|\| e\.defaultPrevented\) return;[\s\S]*onClose\(\)/);
});

test("Phase B (D2): ProfileCard no longer mounts the inspector — EditorHost does, portaled to <body>", () => {
  assert.ok(!CARD.includes("MENU_W"), "the duplicated anchoring formula is gone");
  assert.ok(!CARD.includes("MenuPanel"), "ProfileCard no longer opens a floating MenuPanel");
  assert.ok(!CARD.includes("ProfileInspector") && !CARD.includes("createPortal"), "no inspector portal inside ProfileCard");
  assert.match(HOST, /createPortal\(\s*<ProfileInspector[\s\S]*?document\.body,?\s*\)/);
  assert.ok(!/\bx:\s/.test(HOST) && !/\{\s*x\b/.test(HOST), "the host never writes x/y");
  // Mounted once, at CanvasBoard level, OUTSIDE the transformed canvas wrapper.
  assert.equal((BOARD.match(/<EditorHost\b/g) ?? []).length, 1);
  const start = BOARD.indexOf("<div ref={canvasWrapperRef}");
  const end = BOARD.indexOf("{showSignals && (", start);
  assert.ok(!BOARD.slice(start, end).includes("<EditorHost"), "never inside the wrapper (its transform)");
});

test("Phase B: the memo comparator no longer carries inspector geometry; its callbacks are stable", () => {
  const cmp = CARD.slice(CARD.indexOf("function areProfilePropsEqual"));
  assert.ok(!cmp.includes("inspectorView"), "width / sheet / collapsed never re-render the card");
  assert.ok(cmp.includes("prev.inspectorOpen     === next.inspectorOpen"), "open still changes the card's own render");
  assert.ok(BOARD.includes("const handleEditActivate = useCallback(") && BOARD.includes("const handleEditorFacts = useCallback("));
});

test("Phase B (D1): ProfileInspector is controlled by the editor selection — no local selection state", () => {
  assert.ok(!INSPECTOR.includes("useState") && !INSPECTOR.includes("inspectorSession"));
  assert.ok(INSPECTOR.includes("object:     ObjectId;") && INSPECTOR.includes("onSelectObject(id);"));
  assert.ok(BOARD.includes("const editorSel = useEditorSelection();") && BOARD.includes("const { selectedIds, setSelectedIds } = editorSel;"));
  assert.ok(!BOARD.includes("useState<Set<string>>(new Set())"), "no second selection state");
  assert.ok(!BOARD.includes("setInspectorCardId"), "no separate inspector-open state");
});

test("Phase B: opening / closing the inspector never writes elements (card.x/y untouched)", () => {
  const a = BOARD.indexOf("const inspectorCardId = profileTargetId(editorSel.target);");
  const block = BOARD.slice(a, BOARD.indexOf("const router = useRouter();", a));
  assert.ok(a > 0 && block.length > 500);
  for (const w of ["setElements", "enqueueOp", "updateProfile", "updateElement"]) assert.ok(!block.includes(w), `inspector block calls ${w}`);
});

test("CanvasBoard: the view offset is a translate of the canvas wrapper, frozen per gesture", () => {
  assert.ok(BOARD.includes("transform: !canEdit ? `scale(${viewerScale})` : (viewDx || viewDy) ? `translate3d(${-viewDx}px,${-viewDy}px,0)` : undefined"));
  assert.ok(BOARD.includes("freezeViewOffset(appliedViewRef.current, computedView, viewGesture)"));
  assert.ok(BOARD.includes('window.addEventListener("pointerdown", down, true)') && BOARD.includes('window.addEventListener("pointerup", up, true)'));
});

test("no position:fixed descendant inside the transformed canvas wrapper except the DROP overlay", () => {
  const start = BOARD.indexOf("<div ref={canvasWrapperRef}");
  const end = BOARD.indexOf("{showSignals && (", start);
  assert.ok(start > 0 && end > start);
  const region = BOARD.slice(start, end);
  const fixed = region.match(/position:\s*"fixed"/g) ?? [];
  assert.equal(fixed.length, 1, "a fixed box under a transform re-anchors to the wrapper");
  const at = region.search(/position:\s*"fixed"/);
  assert.ok(region.slice(at, at + 2000).includes("DROP IMAGES"), "the only one is the DROP IMAGES overlay");
});

test("marquee uses canvas coordinates (still correct while the offset is frozen mid-gesture)", () => {
  assert.ok(BOARD.includes("setSelRect({startX:sc.x,startY:sc.y,currentX:sc.x,currentY:sc.y})"));
  assert.ok(BOARD.includes("setSelRect(p=>p?{...p,currentX:sc.x,currentY:sc.y}:null)"));
  assert.ok(!BOARD.includes("setSelRect({startX:e.clientX"));
});

test("keyboard: F6 toggles canvas ⇄ inspector and is declared; Esc on the canvas closes the inspector first", () => {
  assert.equal((BOARD.match(/Escape F6"/g) ?? []).length, 2, "aria-keyshortcuts (mac + others)");
  assert.ok(BOARD.includes('e.key === "F6" && inspectorCardIdRef.current'));
  assert.match(BOARD, /if \(inspectorCardIdRef\.current\) \{\s*closeInspector\(\);\s*return;\s*\}/);
});

test("ObjectList is an APG tablist controlling a tabpanel labelled by the h2; no live regions", () => {
  assert.ok(LIST.includes('role="tablist"') && LIST.includes('role="tab"') && LIST.includes("aria-selected={selected}"));
  assert.ok(LIST.includes("tabIndex={selected ? 0 : -1}"), "roving tabindex");
  assert.ok(LIST.includes('alt=""') && LIST.includes("draggable={false}"), "decorative thumbnail, not draggable");
  assert.ok(INSPECTOR.includes('role="tabpanel"') && INSPECTOR.includes("aria-labelledby={INSPECTOR_TITLE_ID}"));
  for (const src of [LIST, INSPECTOR, SHELL]) assert.ok(!src.includes("aria-live") && !src.includes('role="status"'));
});

test("the facet tabs are gone as the entry point; role color rows say they inherit from Todos los textos", () => {
  assert.ok(!CONFIG.includes("<Tabs") && !CONFIG.includes("TAB_ITEMS"));
  assert.ok(ROLE.includes('export const ROLE_COLOR_INHERITED = "Todos los textos"'));
  assert.ok(ROLE.includes("inheritedLabel={ROLE_COLOR_INHERITED}"));
});

// ── Review round r2 ─────────────────────────────────────────────────────────

test("r2: widgets rendered inside the transformed wrapper keep position:fixed boxes in a portal", () => {
  const start = BOARD.indexOf("<div ref={canvasWrapperRef}");
  const region = BOARD.slice(start, BOARD.indexOf("{showSignals && (", start));
  const used = new Set([...region.matchAll(/<([A-Z]\w+)/g)].map(m => m[1]));
  const imports = [...BOARD.matchAll(/import (\w+)(?:, \{[^}]*\})? from "\.\/(\w+)";/g)];
  let checked = 0;
  for (const [, name, file] of imports) {
    if (!used.has(name)) continue;
    const src = read(`src/components/canvas/${file}.tsx`);
    for (const m of src.matchAll(/position:\s*"fixed"/g)) {
      const before = src.slice(0, m.index);
      assert.ok(before.lastIndexOf("createPortal(") > before.lastIndexOf("return ("),
        `${file}: position:fixed outside a portal is re-anchored by the canvas transform`);
      checked++;
    }
  }
  assert.ok(checked >= 1, "GalleryWidget's lightbox is checked");
  assert.match(read("src/components/canvas/GalleryWidget.tsx"), /\{lightbox && createPortal\(/);
});

test("r2: a pointer gesture settles the offset transition at once and freezes whenever the inspector is open", () => {
  assert.ok(BOARD.includes('setAttribute("data-view-gesture", "")') && BOARD.includes('removeAttribute("data-view-gesture")'));
  assert.ok(BOARD.includes("shouldFreezeOnPointerDown(!!inspectorCardIdRef.current, applied.dx + applied.dy)"));
  const css = read("src/ui/editor.css");
  assert.match(css, /\.mn-canvas\[data-mnemo-canvas\]\[data-view-gesture\]\s*\{\s*transition:\s*none/);
});

test("r2: the sheet's collapse looks at focus ANYWHERE inside the canvas", () => {
  assert.ok(BOARD.includes("if (!t || !wrapper?.contains(t)) return;"));
});

test("Phase B: narrow viewport = bottom sheet below the element, 44px targets, collapses to a bar; the FAB moves up", () => {
  assert.ok(SHELL.includes("? { left: 0, right: 0, bottom: 0, height: collapsed ? INSPECTOR_SHEET_COLLAPSED_H : height }"));
  assert.ok(SHELL.includes("export const SHEET_TARGET = 44;") && SHELL.includes("size={sheet ? SHEET_TARGET : undefined}"));
  assert.ok(SHELL.includes('className={sheet ? "mn-inspector__bar" : "mn-inspector__tab"}'));
  const css = read("src/ui/editor.css");
  assert.match(css, /\.mn-inspector__bar \{[^}]*min-height: 44px/);
  assert.match(css, /\.mn-panel\.mn-panel--sheet\[data-mnemo-editor\] \{[^}]*border-radius: var\(--ui-radius-sheet\)/);
  assert.ok(BOARD.includes("bottom:20+fabLift,right:20+fabShift"), "the FAB is never under the sheet");
  assert.ok(BOARD.includes("inspectorSheetOffset({ viewportH, topOffset: CANVAS_TOP_OFFSET, sheetH, box })"));
  assert.ok(CARD.includes("export const CANVAS_TOP_OFFSET = 44;") && BOARD.includes('import ProfileCard, { CANVAS_TOP_OFFSET } from "./ProfileCard";'),
    "R1: one topbar offset (44, unchanged), shared by the card and the sheet math");
});

test("Phase B review fixes: collapse only when the sheet hides the focus; FAB hidden under an expanded sheet", () => {
  // B-A11y-1: focus entering the inspector clears a stale collapse request —
  // except the collapsed bar itself (focusing it must not expand the sheet
  // and drop focus to <body>; only activating it does).
  const reset = BOARD.indexOf(`if (t?.closest?.('aside[aria-label="Inspector"]')) { setInspectorCollapseReq(false); return; }`);
  const barGuard = BOARD.indexOf("if (t?.id === INSPECTOR_EXPAND_ID) return;");
  assert.ok(reset > 0 && barGuard > 0 && barGuard < reset, "the bar guard runs before the reset");
  // B-A11y-2: a focused element under the sheet collapses it even when the card is not covered.
  assert.ok(BOARD.includes('setInspectorCollapseReq(underSheet ? "focus" : "card");'));
  assert.ok(BOARD.includes('(inspectorCollapseReq === "focus" || (inspectorCollapseReq === "card" && inspView.covered))'));
  // B-UX-1: FAB + its menus hidden while the sheet is expanded (the trash still shows during a drag).
  assert.ok(BOARD.includes("const fabHidden = inspectorShown && sheetMode && !inspectorCollapsed;"));
  assert.ok(BOARD.includes('view === "canvas" && (!fabHidden || isActive) && ('));
  assert.equal((BOARD.match(/menuOpen( && wallpaperMenuOpen)? && !fabHidden/g) ?? []).length, 2);
  assert.ok(BOARD.includes("if (fabHidden) { setMenuOpen(false); setWallpaperMenuOpen(false); }"), "hidden menus are closed, not left open");
  assert.ok(BOARD.includes("maxHeight:`calc(100vh - ${140+fabLift}px)`"), "B-R2: the MyLand panel never leaves the screen");
  // B-A11y-4: the collapsed state is exposed.
  assert.ok(SHELL.includes("aria-expanded={false}"));
  // B-UX-4/6 + reduced motion; B-A11y-3: the outline stays inside the bar in forced colors.
  const css = read("src/ui/editor.css");
  assert.match(css, /\.mn-panel\.mn-panel--sheet\[data-mnemo-editor\] \{[^}]*env\(safe-area-inset-bottom/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.mn-panel\.mn-panel--sheet\[data-mnemo-editor\] \{ animation: none; transition: none; \}/);
  assert.match(css, /\.mn-inspector__bar \{ border: 1px solid ButtonText; outline-offset: -3px !important; \}/);
});

test("r2: in-section links move focus to the new object's h2 (the link itself unmounts)", () => {
  assert.match(INSPECTOR, /function goTo\(id: ObjectId\) \{\s*select\(id\);\s*requestAnimationFrame\(\(\) => document\.getElementById\(INSPECTOR_TITLE_ID\)\?\.focus/);
  assert.ok(CONFIG.includes('link("allText", TEXT_FX_LINK)'));
  assert.equal((CONFIG.match(/link\("allText", TEXT_FX_LINK\)/g) ?? []).length, 6, "from every text role");
  assert.ok(CONFIG.includes('to="cardBg" label="Esquinas: en Fondo de la card"') && CONFIG.includes('link("cardFx", "Color y grosor del borde: en Efectos de la card")'));
});

test("r2: the 'Color de todos los textos' hint describes its control", () => {
  const typo = read("src/components/canvas/ProfileTypographyMenu.tsx");
  assert.ok(typo.includes("hintId={hintId}") && typo.includes("<MenuNote id={hintId}>"));
  assert.ok(read("src/ui/MenuRow.tsx").includes('[state === "inherited" ? chipId : undefined, hintId].filter(Boolean).join(" ")'));
});

test("r2: one term for block style, scope in the label", () => {
  const block = read("src/components/canvas/BlockStyleFields.tsx");
  assert.ok(block.includes('export const BLOCK_STYLE_LABEL = "Estilo del bloque"'));
  assert.ok(read("src/components/canvas/ProfileIdentityMenu.tsx").includes('scope="afecta Nombre, @usuario, Frase y Bio"'));
  assert.ok(!read("src/components/canvas/ProfileMetadataMenu.tsx").includes("Estilo de bloque"));
});
