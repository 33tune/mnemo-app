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
  assert.ok(SHELL.includes('className={`mn-panel mn-panel--docked'), "same .mn-panel surface, docked modifier");
});

test("Esc in the inspector closes it unless a popover / draft input already handled it", () => {
  assert.match(SHELL, /if \(e\.key !== "Escape" \|\| e\.defaultPrevented\) return;[\s\S]*onClose\(\)/);
});

test("ProfileCard: no floating-panel anchoring formula left; the inspector is portaled to <body>", () => {
  assert.ok(!CARD.includes("MENU_W"), "the duplicated anchoring formula is gone");
  assert.ok(!CARD.includes("MenuPanel"), "ProfileCard no longer opens a floating MenuPanel");
  assert.match(CARD, /createPortal\(\s*<ProfileInspector[\s\S]*?, document\.body\)/);
  assert.ok(!/inspector[\s\S]{0,80}updateProfile\(card\.id, \{ x/.test(CARD), "the inspector never writes x/y");
});

test("CanvasBoard: the view offset is a translate of the canvas wrapper, frozen per gesture", () => {
  assert.ok(BOARD.includes("transform: !canEdit ? `scale(${viewerScale})` : viewDx ? `translate3d(${-viewDx}px,0,0)` : undefined"));
  assert.ok(BOARD.includes("freezeViewOffset(appliedDxRef.current, inspectorOffset.dx, viewGesture)"));
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
  assert.match(BOARD, /if \(inspectorCardIdRef\.current\) \{\s*setInspectorCardId\(null\);\s*return;\s*\}/);
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
  assert.ok(BOARD.includes("shouldFreezeOnPointerDown(!!inspectorCardIdRef.current, appliedDxRef.current)"));
  const css = read("src/ui/editor.css");
  assert.match(css, /\.mn-canvas\[data-mnemo-canvas\]\[data-view-gesture\]\s*\{\s*transition:\s*none/);
});

test("r2: the overlay collapses when focus enters ANYTHING inside the canvas", () => {
  assert.ok(BOARD.includes("canvasWrapperRef.current?.contains(e.target as Node)"));
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
