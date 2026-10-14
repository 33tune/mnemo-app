// Editor v3 Phase F — the ProfileCard inspector with the new design: header
// (route · title · "de la tarjeta" · measures), one row of object chips with
// the "modified" dot, numbered sections, effect rows, the font field and the
// loaded-weights Peso. Structural guards on the real source (no DOM in this
// repo's tests) + the pure "modified" model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProfileCardData } from "@/types";
import { stripComments } from "@/lib/sourceScan";
import { OBJECT_IDS, objectModified, chipLabel, chipAccessibleName, inspectorObject, INSPECTOR_OBJECTS } from "@/lib/inspectorObjects";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { cardBaseColor } from "@/lib/cardColors";

const read = (f: string) => stripComments(readFileSync(join(process.cwd(), f), "utf8"));
const C = "src/components/canvas/";
const INSPECTOR = read(`${C}ProfileInspector.tsx`);
const LIST = read(`${C}ObjectList.tsx`);
const ROLE = read(`${C}RoleTypographyFields.tsx`);
const TYPE = read(`${C}ProfileTypographyMenu.tsx`);
const FX = read(`${C}ProfileEffectsMenu.tsx`);
const CONFIG = read(`${C}ProfileConfigMenu.tsx`);
const ROW = read("src/ui/EffectRow.tsx");
const SECTION = read("src/ui/MenuSection.tsx");
const COLLAPSIBLE = read("src/ui/Collapsible.tsx");
const FONT = read("src/ui/FontField.tsx");
const HEADER = read("src/ui/InspectorHeader.tsx");

const card = (over: Partial<ProfileCardData> = {}): ProfileCardData => ({
  id: "p1", x: 0, y: 0, w: 320, h: 300, zIndex: 0, layer: 1, depth: 0, rotation: 0, handle: "nico", ...over,
} as ProfileCardData);

test("header: route in mono, the object as title, 'de la tarjeta', the card's measures; chips fixed under it", () => {
  assert.ok(INSPECTOR.includes("path={`tarjeta / ${chipLabel(obj).toLowerCase()}`}"));
  assert.ok(INSPECTOR.includes('aside="de la tarjeta"'));
  assert.ok(INSPECTOR.includes("title={chipLabel(obj)}"));
  assert.ok(/meta=\{`X \$\{Math\.round\(card\.x\)\}.*W \$\{Math\.round\(card\.w\)\}.*H \$\{Math\.round\(card\.h\)\}`\}/.test(INSPECTOR));
  assert.ok(/headerExtra=\{\s*<ObjectList/.test(INSPECTOR), "the chips live in the header, not in the scrolling body");
  assert.ok(HEADER.includes("{children}"), "InspectorHeader renders the fixed extra");
  // Sheet (design screen 10): title + Cerrar on one row, 44px close.
  assert.ok(HEADER.includes("size={sheet ? 44 : 28}"));
});

test("chips: one horizontal row, APG tablist, 44px in the sheet, the active chip kept in view", () => {
  assert.ok(LIST.includes('role="tablist"') && LIST.includes('aria-orientation="horizontal"'));
  assert.ok(LIST.includes("sheet={mode === \"sheet\"}") || INSPECTOR.includes('sheet={mode === "sheet"}'));
  assert.ok(LIST.includes("row.scrollLeft"), "keeps the active chip visible");
  assert.ok(!LIST.includes("mn-objlist__group"), "the grouped map of Phase 2 is gone");
});

test("chip labels are the object's name; the accessible name starts with it (2.5.3) and says 'con cambios'", () => {
  const c = card({ name: "Nico", nameColor: "#ff0000" });
  const effective = getProfileCardEffects(c);
  for (const o of INSPECTOR_OBJECTS) {
    const name = chipAccessibleName(o, o.chip({ card: c, effective, baseColor: cardBaseColor(c, effective) }));
    assert.ok(name.startsWith(chipLabel(o)), `${o.id}: "${name}" starts with "${chipLabel(o)}"`);
  }
  assert.equal(chipLabel(inspectorObject("cardBg")), "Fondo");
  assert.equal(chipLabel(inspectorObject("cardFx")), "Efectos");
});

test("modified dot: only the object's own style values count — content and position never do", () => {
  const plain = card({ name: "Nico", bio: "hola", photo: "https://x/p.png", contactLinks: [{ id: "a", url: "https://x.com/a" }] });
  for (const id of OBJECT_IDS) assert.equal(objectModified(id, plain), false, `${id} untouched`);
  assert.equal(objectModified("name", card({ nameColor: "#fff" })), true);
  assert.equal(objectModified("name", card({ effects: { textRoles: { name: { shimmer: { speed: 1 } } } } })), true);
  assert.equal(objectModified("bio", card({ blockStyle: { identity: { bg: "#000" } } })), true, "identity block style");
  assert.equal(objectModified("location", card({ locationFontSize: 12 })), true);
  assert.equal(objectModified("photo", card({ pfpRadius: 20 })), true);
  assert.equal(objectModified("links", card({ linksIconSize: 20 })), true);
  assert.equal(objectModified("cardBg", card({ effects: { border: { radius: 4 } } })), true, "Esquinas live in Fondo");
  assert.equal(objectModified("cardFx", card({ effects: { border: { radius: 4 } } })), false);
  assert.equal(objectModified("cardFx", card({ effects: { animations: { floating: true } } })), true);
  assert.equal(objectModified("allText", card({ textAlign: "center" })), true);
  assert.equal(objectModified("name", card({ effects: { textRoles: { name: {} } } })), false, "an empty override is not a change");
  // Review F: an effect toggled on and off again looks exactly like the default.
  assert.equal(objectModified("cardFx", card({ effects: { animations: { floating: false }, retro: { scanlines: { enabled: false } } } })), false);
  assert.equal(objectModified("cardFx", card({ effects: { interactions: { tilt3d: false, hoverGlow: false } } })), false);
});

test("numbered sections: ProfileConfigMenu numbers what it mounts; only the outermost MenuSection takes it", () => {
  assert.ok(CONFIG.includes("<SectionNumber key={s.key} value={s.num ?? null}>"));
  assert.ok(SECTION.includes("const num = numProp ?? inherited?.num;"));
  assert.ok(SECTION.includes("<SectionNumberContext.Provider value={null}>"), "nested sections are never numbered");
  assert.ok(COLLAPSIBLE.includes("<SectionNumber value={null}>"), "nor sections inside a disclosure");
  assert.ok(ROW.includes("<SectionNumber value={null}>"), "nor inside an effect row");
  // Review F: Color takes tone 1 (tone 3 = the "modified" orange, next to "N cambios").
  for (const [label, tone] of [["Tipografía", 2], ["Color", 1], ["Efectos del texto", 4]] as const) {
    assert.ok(new RegExp(`label="${label}" num=\\{pad2\\([^)]*\\)\\} tone=\\{${tone}\\}`).test(ROLE), `${label} is numbered, tone ${tone}`);
  }
});

test("role text: every value the user set shows the dot and its reset DELETES the key", () => {
  for (const key of ["nameFont", "nameFontSize", "nameFontWeight", "nameLetterSpacing", "nameLineHeight",
    "handleFontSize", "statusFontSize", "descriptorFontWeight", "locationLetterSpacing", "bioLineHeight", "viewsFont"]) {
    assert.ok(TYPE.includes(`card.${key} !== undefined`), `${key}: modified`);
    assert.ok(TYPE.includes(`onChange({ ${key}: undefined })`), `${key}: reset deletes the key`);
  }
  assert.ok(ROLE.includes('<Collapsible label="Espaciado" modified={spacingModified}'), "Espaciado › with its dot");
});

test("Peso offers only the loaded weights (fontWeights.ts); the font field writes the font in itself", () => {
  assert.ok(ROLE.includes("weightOptions(font, weight)"));
  assert.ok(!ROLE.includes("min={100} max={900}"), "no free 100–900 slider over fonts that do not load those weights");
  assert.ok(FONT.includes("fontFamily: current?.style") && FONT.includes("<select"), "native select under the specimen");
  assert.ok(FONT.includes("aria-label={label}"));
});

test("Liquid glass tiles: the tile is a switch, \"Ajustes de X\" a separate button; one tile open at a time", () => {
  // DS ControlTiles: the tile carries role="switch" (or a disclosure button
  // when the effect has no switch, e.g. Borde); the chevron is its own
  // <button aria-expanded> named "Ajustes de …".
  assert.ok(ROW.includes('role={toggleable ? "switch" : "button"}'));
  assert.ok(ROW.includes("aria-checked={toggleable ? !!on : undefined}"));
  assert.ok(ROW.includes("aria-label={`Ajustes de ${label}`} aria-expanded={open}"));
  assert.ok(ROW.includes("list.open === id"), "EffectList keeps a single open tile");
  assert.ok(ROW.includes("{open && hasDetail && ("), "closed tiles mount no hidden controls");
  for (const id of ["border", "shadow", "glow", "float", "tilt", "hover", "spotlight", "scanlines", "noise", "flicker", "chroma"]) {
    assert.ok(FX.includes(`<EffectRow id="${id}"`), `card effect row ${id}`);
  }
  // Borde has no switch (no real pause for it — CLAUDE.md).
  assert.ok(/<EffectRow id="border"[^>]*active=/.test(FX) && !/<EffectRow id="border"[^>]*onToggle=/.test(FX));
  // The Brillo switch turns both flags off in ONE write.
  assert.ok(FX.includes("patchGlow({ outer: false, inner: false })"));
});

test("review F: tone 3 (= the 'modified' orange) never sits next to 'N cambios'; effect sections say 'N activos'", () => {
  for (const f of ["RoleTypographyFields.tsx", "ProfileTypographyMenu.tsx", "ProfileEffectsMenu.tsx", "ProfileBackgroundMenu.tsx", "ProfileIdentityMenu.tsx"]) {
    const src = read(`${C}${f}`);
    for (const m of src.match(/<MenuSection[^>]*>/g) ?? []) {
      assert.ok(!(m.includes("tone={3}") && m.includes("changed=")), `${f}: ${m}`);
      if (/label="Efectos/.test(m)) assert.ok(m.includes("active=") && !m.includes("changed="), `${f}: effect sections count active effects`);
    }
  }
  assert.ok(SECTION.includes("`${active} activos`"));
});

test("Liquid glass: every switch keeps an edge ring at rest (1.4.11, A3) and the focus ring; Retro is a named group", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/editor.css"), "utf8");
  assert.match(css, /\.mn-switch \{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--ui-line-field\)/);
  assert.match(css, /\.mn-switch:focus-visible\s*\{\s*box-shadow:\s*var\(--ui-shadow-ring\)/, "focus ring (2.4.7)");
  assert.ok(FX.includes('<div role="group" aria-labelledby={retroId}'));
});
