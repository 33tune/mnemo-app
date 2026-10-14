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
import { OBJECT_IDS, objectModified, chipLabel, chipAccessibleName, inspectorObject, INSPECTOR_OBJECTS, PART_GROUPS, PART_ORDER, partGroupOf } from "@/lib/inspectorObjects";
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

test("Liquid glass header: the part's glyph, its name, the route in mono; the part picker fixed under it", () => {
  assert.ok(INSPECTOR.includes("path={`tarjeta / ${chipLabel(obj).toLowerCase()}`}"));
  assert.ok(INSPECTOR.includes("title={chipLabel(obj)}") && INSPECTOR.includes("icon={partIcon(object)}"));
  assert.ok(/headerExtra=\{\s*<ObjectList/.test(INSPECTOR), "the part picker lives in the header, not in the scrolling body");
  assert.ok(HEADER.includes("{!searchRow && children}"), "InspectorHeader renders the fixed extra (hidden while searching)");
  assert.ok(HEADER.includes("const btn = sheet ? 44 : 36;"), "36px filled buttons (DS), 44px in the sheet");
});

test("part picker: groups (Tarjeta / Perfil / Contenido), every part of the group visible with its name", () => {
  assert.ok(LIST.includes('role="tablist"') && LIST.includes('aria-orientation="horizontal"'));
  assert.ok(LIST.includes("sheet={mode === \"sheet\"}") || INSPECTOR.includes('sheet={mode === "sheet"}'));
  assert.ok(LIST.includes('<Tabs label="Grupo de partes" active={group.id} onChange={selectGroup}'), "a segmented control picks the group");
  assert.ok(LIST.includes("{group.parts.map(p => {"), "only the active group's parts; never a scrolling row");
  assert.ok(LIST.includes("onSelect(lastInGroup.current[g.id] ?? g.parts[0]);"), "a group opens its last used part");
  assert.deepEqual(PART_GROUPS.map(g => [g.label, g.parts]), [
    ["Tarjeta", ["cardBg", "cardFx", "allText"]],
    ["Perfil", ["photo", "name", "handle", "descriptor", "location", "bio"]],
    ["Contenido", ["links", "logo", "views"]],
  ]);
  assert.equal(new Set(PART_ORDER).size, INSPECTOR_OBJECTS.length, "every part is in exactly one group");
  assert.ok(PART_GROUPS.every(g => g.parts.length <= 6), "a group fits the 6-column row");
  for (const id of PART_ORDER) assert.equal(partGroupOf(id).parts.includes(id), true);
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

test("Liquid glass cards: one open per part (accordion); an APG heading > button; nested sections are plain groups", () => {
  assert.ok(CONFIG.includes("<Accordion open={openByObject[object] ?? null}"), "one card open per part, remembered per part");
  assert.ok(SECTION.includes('<div role="heading" aria-level={3}') && SECTION.includes("aria-expanded={open}"));
  assert.ok(SECTION.includes("const inCard = useContext(InCardContext);"), "a section inside a card is not a card");
  assert.ok(COLLAPSIBLE.includes("aria-expanded={open}") && ROW.includes("aria-expanded={open}"));
  for (const [label, icon] of [["Tipografía", "case"], ["Color", "palette"], ["Efectos del texto", "sparkles"]] as const) {
    assert.ok(new RegExp(`label="${label}" icon="${icon}"`).test(ROLE), `${label} card with its glyph`);
  }
});

test("role text: every value the user set shows the dot and its reset DELETES the key", () => {
  for (const key of ["nameFont", "nameFontSize", "nameFontWeight", "nameLetterSpacing", "nameLineHeight",
    "handleFontSize", "statusFontSize", "descriptorFontWeight", "locationLetterSpacing", "bioLineHeight", "viewsFont"]) {
    assert.ok(TYPE.includes(`card.${key} !== undefined`), `${key}: modified`);
    assert.ok(TYPE.includes(`onChange({ ${key}: undefined })`), `${key}: reset deletes the key`);
  }
  assert.ok(ROLE.includes('label="Interletrado" icon="spacing"') && ROLE.includes('label="Interlineado" icon="height"'), "spacing sits in Tipografía (DS)");
});

test("Peso offers only the loaded weights (fontWeights.ts) as 'Aa' samples; the font field writes the font in itself", () => {
  assert.ok(ROLE.includes("weightOptions(font, weight)") && ROLE.includes('role="radiogroup"') && ROLE.includes("fontWeight: o.value"));
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

test("effect cards light their glyph with the active effects and summarize them ('Gradiente, Shimmer' / 'Ninguno activo')", () => {
  // (ProfileTypographyMenu.tsx no longer has an effects card: Todos los
  // textos is color + alignment only, 2026-10-14.)
  for (const f of ["RoleTypographyFields.tsx", "ProfileIdentityMenu.tsx"]) {
    const src = read(`${C}${f}`);
    const fx = (src.match(/<MenuSection[^>]*label="Efectos[^>]*>/g) ?? []);
    assert.ok(fx.length > 0, f);
    for (const m of fx) assert.ok(m.includes("active=") && m.includes('"Ninguno activo"'), `${f}: ${m}`);
  }
  assert.ok(SECTION.includes("const lit = modified || (!!active && active > 0);"));
});

test("Liquid glass: every switch keeps an edge ring at rest (1.4.11, A3) and the focus ring; Retro is its own card", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/editor.css"), "utf8");
  assert.match(css, /\.mn-switch \{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--ui-line-field\)/);
  assert.match(css, /\.mn-switch:focus-visible\s*\{\s*box-shadow:\s*var\(--ui-shadow-ring\)/, "focus ring (2.4.7)");
  for (const card of ["Luz", "Movimiento", "Al pasar el cursor", "Retro"]) assert.ok(FX.includes(`<MenuSection label="${card}"`), card);
});
