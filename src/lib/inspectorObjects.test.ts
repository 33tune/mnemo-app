// Menu redesign Phase 2 — the inspector's object model, its chips, the
// routing table (ProfileConfigMenu.tsx's OBJECT_SECTIONS) and the session
// memory. Also ties the capability matrix to the objects: every ProfileCard
// route names an object and its evidence lives in a file that object mounts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProfileCardData, TextRole } from "@/types";
import {
  INSPECTOR_OBJECTS, OBJECT_IDS, OBJECT_FILES, DEFAULT_OBJECT, chipAccessibleName, nextTabIndex, formatViewCount,
  countActiveCardEffects, objectForRoute, filesMountedBy, inspectorObject, type ObjectId,
} from "./inspectorObjects";
import { createSelectionMemory as createInspectorSession } from "./editorSelection";
import { capabilityMatrix, P, LIENZO } from "./editorCapabilities";
import { getProfileCardEffects } from "./profileCardEffects";
import { cardBaseColor } from "./cardColors";
import { stripComments } from "./sourceScan";

const root = process.cwd();
const read = (f: string) => stripComments(readFileSync(join(root, f), "utf8"));

const card = (over: Partial<ProfileCardData> = {}): ProfileCardData => ({
  id: "p1", x: 0, y: 0, w: 320, h: 300, zIndex: 0, layer: 1, depth: 0, rotation: 0,
  handle: "nico", ...over,
} as ProfileCardData);
const ctx = (c: ProfileCardData, viewCount?: number) => {
  const effective = getProfileCardEffects(c);
  return { card: c, effective, baseColor: cardBaseColor(c, effective), viewCount };
};
const chip = (id: ObjectId, c: ProfileCardData, viewCount?: number) => inspectorObject(id).chip(ctx(c, viewCount));

// ── Model ───────────────────────────────────────────────────────────────────

test("objects: order and captions of design-direction.md §B", () => {
  assert.deepEqual(INSPECTOR_OBJECTS.map(o => o.caption), [
    "Nombre", "@usuario", "Frase", "Ubicación", "Bio", "Visitas", "Foto", "Links", "Logo",
    "Fondo de la card", "Efectos de la card", "Todos los textos",
  ]);
  assert.equal(new Set(OBJECT_IDS).size, OBJECT_IDS.length);
  assert.equal(DEFAULT_OBJECT, "name");
});

test("role objects use the TextRole as their id (Phase 5 data-role / Phase 3 specimen)", () => {
  const roles: TextRole[] = ["name", "handle", "descriptor", "location", "bio", "views"];
  for (const r of roles) {
    const o = inspectorObject(r);
    assert.equal(o.kind, "role");
    assert.equal(o.role, r);
  }
  assert.equal(INSPECTOR_OBJECTS.filter(o => o.kind === "role").length, roles.length);
});

// ── Chips (real content, never a bare label) ────────────────────────────────

test("text chips show the user's own text, or the placeholder (marked) when empty", () => {
  assert.deepEqual(chip("name", card({ name: "Nico" })), { text: "Nico" });
  assert.deepEqual(chip("name", card({ name: "  " })), { text: "Tu nombre", placeholder: true });
  assert.equal(chip("handle", card()).text, "@nico");
  assert.equal(chip("descriptor", card({ status: "diseño" })).text, "diseño");
  assert.equal(chip("descriptor", card()).text, "Frase corta");
});

test("Visitas: the count when known, 'visible' when not, 'oculto' when hidden — never a bare 'Oculto'", () => {
  assert.equal(chip("views", card({ showViews: true }), 1234).text, "Visitas · 1,2 k");
  assert.equal(chip("views", card({ showViews: true })).text, "Visitas · visible");
  assert.equal(chip("views", card({ showViews: false }), 99).text, "Visitas · oculto");
  assert.equal(formatViewCount(999), "999");
  assert.equal(formatViewCount(1000), "1 k");
  assert.equal(formatViewCount(2_500_000), "2,5 M");
});

test("Foto/Logo chips carry the real thumbnail (decorative) and say 'imagen'", () => {
  const f = chip("photo", card({ photo: "https://x/p.png" }));
  assert.equal(f.thumb, "https://x/p.png");
  assert.equal(chipAccessibleName(inspectorObject("photo"), f), "Foto: imagen");
  assert.equal(chip("logo", card()).thumb, undefined);
});

test("Links chip: up to 3 icons + 'N más' in its name", () => {
  const links = ["instagram.com/a", "x.com/b", "github.com/c", "youtube.com/d", "twitch.tv/e"].map((url, i) => ({ id: `${i}`, url }));
  const d = chip("links", card({ contactLinks: links }));
  assert.equal(d.links!.urls.length, 3);
  assert.equal(d.links!.more, 2);
  const label = (u: string) => u.split(".")[0];
  assert.equal(chipAccessibleName(inspectorObject("links"), d, label), "Links: instagram, x, github y 2 más");
  const two = chip("links", card({ contactLinks: links.slice(0, 2) }));
  assert.equal(chipAccessibleName(inspectorObject("links"), two, label), "Links: instagram y x");
});

test("Efectos chip counts only VISIBLE card effects", () => {
  // The variant's default spotlight IS visible (effective, not raw).
  assert.equal(chip("cardFx", card({ effects: {} })).text, "Efectos · 1 activo");
  const quiet = card({ effects: { interactions: { spotlight: false } } });
  assert.equal(chip("cardFx", quiet).text, "Efectos · 0 activos");
  const c = card({ effects: { interactions: { spotlight: false }, glow: { outer: true, intensity: 0.6, animation: { enabled: true } }, animations: { floating: true }, retro: { noise: { enabled: true } } } });
  const e = getProfileCardEffects(c);
  assert.equal(countActiveCardEffects(c.effects, e), 4, "glow + pulse + floating + noise");
  assert.equal(chipAccessibleName(inspectorObject("cardFx"), chip("cardFx", c)), "Efectos: 4 activos", "contains the visible \"Efectos · 4 activos\"");
  // A glow flag with intensity 0 renders nothing: neither it nor its pulse count.
  const off = card({ effects: { interactions: { spotlight: false }, glow: { outer: true, intensity: 0, animation: { enabled: true } } } });
  assert.equal(countActiveCardEffects(off.effects, getProfileCardEffects(off)), 0);
});

test("Fondo chip shows a swatch of the effective background; Todos los textos the base color 'Aa'", () => {
  const c = card({ effects: { bg: { color: "#223344" } } });
  assert.equal(chip("cardBg", c).swatch!.color, "#223344");
  const t = chip("allText", card({ textColor: "#ff0000" }));
  assert.equal(t.sampleColor, "#ff0000");
  assert.equal(chipAccessibleName(inspectorObject("allText"), t), "Todos los textos");
});

test("accessible names: caption + visible content, capped at ~60 characters", () => {
  assert.equal(chipAccessibleName(inspectorObject("name"), chip("name", card({ name: "Nico" }))), "Nombre: Nico");
  const long = chipAccessibleName(inspectorObject("bio"), chip("bio", card({ bio: "x".repeat(200) })));
  assert.ok(long.length <= 60, `${long.length}`);
  assert.ok(long.startsWith("Bio: "));
});

test("tablist keys: arrows wrap, Home/End, others ignored", () => {
  const n = INSPECTOR_OBJECTS.length;
  assert.equal(nextTabIndex("ArrowRight", n - 1, n), 0);
  assert.equal(nextTabIndex("ArrowLeft", 0, n), n - 1);
  assert.equal(nextTabIndex("ArrowDown", 2, n), 3);
  assert.equal(nextTabIndex("ArrowUp", 2, n), 1);
  assert.equal(nextTabIndex("Home", 5, n), 0);
  assert.equal(nextTabIndex("End", 0, n), n - 1);
  assert.equal(nextTabIndex("Enter", 0, n), -1);
});

// ── Session memory ──────────────────────────────────────────────────────────

test("session: remembers the active object and each object's scroll, per card", () => {
  const s = createInspectorSession();
  assert.equal(s.activeObject("a"), "name");
  s.setActiveObject("a", "cardFx");
  s.setScroll("a", "cardFx", 240.4);
  s.setScroll("a", "name", -5);
  assert.equal(s.activeObject("a"), "cardFx");
  assert.equal(s.activeObject("b"), "name", "per card");
  assert.equal(s.scrollOf("a", "cardFx"), 240);
  assert.equal(s.scrollOf("a", "name"), 0);
  s.setActiveObject("a", "nope" as ObjectId);
  assert.equal(s.activeObject("a"), "cardFx", "unknown ids are ignored");
});

// ── Routing table ↔ OBJECT_FILES ───────────────────────────────────────────

const CONFIG = "src/components/canvas/ProfileConfigMenu.tsx";

function importsOf(src: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of src.matchAll(/import\s+([^;]+?)\s+from\s+"\.\/(\w+)";/g)) {
    const file = `src/components/canvas/${m[2]}.tsx`;
    for (const name of m[1].replace(/[{}]/g, " ").split(/[\s,]+/).filter(n => n && n !== "type" && /^[A-Z]/.test(n))) map.set(name, file);
  }
  return map;
}

test("OBJECT_SECTIONS mounts every object, only from the files OBJECT_FILES lists for it (and all of them)", () => {
  const src = read(CONFIG);
  const imports = importsOf(src);
  const table = src.slice(src.indexOf("export const OBJECT_SECTIONS"), src.indexOf("interface ProfileConfigMenuProps"));
  // Helpers used inside the table (identity(...), metadata(...), roleText(...)) resolve to their component.
  const helper: Record<string, string> = {
    identity: "ProfileIdentityMenu", metadata: "ProfileMetadataMenu", roleText: "RoleTextSection",
  };
  for (const id of OBJECT_IDS) {
    const m = new RegExp(`\\n  ${id}: \\[([\\s\\S]*?)\\n  \\],`).exec(table);
    assert.ok(m, `OBJECT_SECTIONS has no entry for ${id}`);
    const body = m![1];
    const used = new Set<string>();
    for (const [h, comp] of Object.entries(helper)) if (new RegExp(`\\b${h}\\(`).test(body)) used.add(imports.get(comp)!);
    for (const t of body.matchAll(/<([A-Z]\w+)/g)) {
      if (t[1] === "ProfileMeasures") { used.add(CONFIG); continue; }
      if (t[1] === "ObjectLink") continue; // navigation only, no capability
      assert.ok(imports.has(t[1]), `${id}: <${t[1]}> is not imported from ./`);
      used.add(imports.get(t[1])!);
    }
    assert.deepEqual([...used].sort(), [...OBJECT_FILES[id]].sort(), `${id} mounts ${[...used].join(", ")}`);
  }
});

test("every ProfileCard route names an inspector object whose files hold its evidence (or the canvas / Music)", () => {
  const bad: string[] = [];
  for (const { owner, path, cap } of capabilityMatrix()) {
    if (cap.kind !== "route") continue;
    if (owner === "music") { assert.ok(cap.ui.startsWith("Music") || cap.ui.startsWith(LIENZO) || cap.ui.startsWith("handles de resize") || cap.ui.startsWith("Rotar"), `music:${path} → ${cap.ui}`); continue; }
    if (cap.ui.startsWith(LIENZO)) continue;
    const o = objectForRoute(cap.ui, P);
    if (!o) { bad.push(`${path}: "${cap.ui}" names no object`); continue; }
    const files = filesMountedBy(o.id);
    for (const [file] of cap.evidence) if (!files.includes(file)) bad.push(`${path}: evidence ${file} is not mounted by ${o.caption}`);
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("Color de todos los textos is a live route again (Phase 2)", () => {
  const row = capabilityMatrix().find(r => r.owner === "profile" && r.path === "textColor")!;
  assert.equal(row.cap.kind, "route");
  assert.equal(objectForRoute((row.cap as { ui: string }).ui, P)?.id, "allText");
});

// ── r2: section-level routing (not just files) ─────────────────────────────
// A file can hold several objects' sections (ProfileTypographyMenu has one
// RoleTextSection case per role + GlobalTextSection; ProfileIdentityMenu one
// `only` part per object; ProfileEffectsMenu Esquinas + Efectos). Evidence
// is attributed to the SECTION ("unit") it sits in — the last marker before
// it — and the route's object must mount that unit. Evidence before any
// marker (shared hooks/handlers) only needs the file to be mounted.

const C = "src/components/canvas/";
const MARKERS: Record<string, Array<[RegExp, (m: RegExpMatchArray) => string]>> = {
  [`${C}ProfileIdentityMenu.tsx`]: [[/only === "(\w+)"/g, m => `only:${m[1]}`]],
  [`${C}ProfileMetadataMenu.tsx`]: [[/only === "(\w+)"/g, m => `only:${m[1]}`]],
  [`${C}ProfileTypographyMenu.tsx`]: [[/case "(\w+)":/g, m => `role:${m[1]}`], [/export function GlobalTextSection/g, () => "global"]],
  [`${C}ProfileEffectsMenu.tsx`]: [[/export function CardCornersSection/g, () => "corners"], [/export function CardEffectsSection/g, () => "effects"]],
};
const squashed = (f: string) => read(f).replace(/\s+/g, " ");

function unitAt(file: string, text: string): string | null {
  const src = squashed(file);
  const at = src.indexOf(text.replace(/\s+/g, " "));
  assert.ok(at >= 0, `${file} lacks ${text}`);
  let best: { pos: number; unit: string } | null = null;
  for (const [re, name] of MARKERS[file] ?? []) {
    for (const m of src.matchAll(re)) if (m.index! < at && (!best || m.index! > best.pos)) best = { pos: m.index!, unit: name(m) };
  }
  return best?.unit ?? null;
}

/** The units each object's OBJECT_SECTIONS entry mounts. */
function unitsOf(id: ObjectId): Set<string> {
  const src = read(CONFIG);
  const table = src.slice(src.indexOf("export const OBJECT_SECTIONS"), src.indexOf("interface ProfileConfigMenuProps"));
  const body = new RegExp(String.raw`\n  ${id}: \[([\s\S]*?)\n  \],`).exec(table)![1];
  const units = new Set<string>();
  for (const m of body.matchAll(/identity\("(\w+)"\)/g)) units.add(`${C}ProfileIdentityMenu.tsx#only:${m[1]}`);
  for (const m of body.matchAll(/metadata\("(\w+)"\)/g)) units.add(`${C}ProfileMetadataMenu.tsx#only:${m[1]}`);
  for (const m of body.matchAll(/roleText\("(\w+)"\)/g)) units.add(`${C}ProfileTypographyMenu.tsx#role:${m[1]}`);
  if (body.includes("<GlobalTextSection")) units.add(`${C}ProfileTypographyMenu.tsx#global`);
  if (body.includes("<CardCornersSection")) units.add(`${C}ProfileEffectsMenu.tsx#corners`);
  if (body.includes("<CardEffectsSection")) units.add(`${C}ProfileEffectsMenu.tsx#effects`);
  return units;
}

test("r2: every route's evidence sits in a SECTION its object mounts (textAlign under Nombre or border.color under Fondo would fail)", () => {
  const bad: string[] = [];
  for (const { owner, path, cap } of capabilityMatrix()) {
    if (owner !== "profile" || cap.kind !== "route" || cap.ui.startsWith(LIENZO)) continue;
    const o = objectForRoute(cap.ui, P)!;
    const units = unitsOf(o.id);
    for (const [file, text] of cap.evidence) {
      if (!MARKERS[file]) continue; // single-object files: the file check above covers them
      const u = unitAt(file, text);
      if (u && !units.has(`${file}#${u}`)) bad.push(`${path}: "${text}" is in ${file}#${u}, not mounted by ${o.caption}`);
    }
  }
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("r2: the unit check catches a mis-routed control", () => {
  assert.equal(unitAt(`${C}ProfileTypographyMenu.tsx`, "onChange({ textAlign: v"), "global");
  assert.ok(!unitsOf("name").has(`${C}ProfileTypographyMenu.tsx#global`), "textAlign routed to Nombre would fail");
  assert.equal(unitAt(`${C}ProfileEffectsMenu.tsx`, "patchBorder({ color: v })"), "effects");
  assert.ok(!unitsOf("cardBg").has(`${C}ProfileEffectsMenu.tsx#effects`), "border.color routed to Fondo would fail");
  assert.equal(unitAt(`${C}ProfileIdentityMenu.tsx`, "id.setPfpSize(v)"), "only:photo");
  assert.ok(!unitsOf("name").has(`${C}ProfileIdentityMenu.tsx#only:photo`));
});

test("r2: clusters — texts · blocks · card, contiguous and in that order", () => {
  const groups = INSPECTOR_OBJECTS.map(o => o.group);
  assert.deepEqual(groups, ["text", "text", "text", "text", "text", "text", "block", "block", "block", "card", "card", "card"]);
});

test("r2 (WCAG 2.5.3): every chip's accessible name contains its visible text", () => {
  const fixtures = [
    card(), card({ name: "Nico", status: "diseño", location: "La Plata", bio: "hola", showViews: true, photo: "p.png",
      contactLinks: [{ id: "1", url: "instagram.com/a" }], logo: { url: "l.png", anchorX: 0.5, anchorY: 0.5, w: 40, h: 40 },
      effects: { interactions: { spotlight: false }, retro: { noise: { enabled: true } } } } as Partial<ProfileCardData>),
    card({ showViews: false }),
  ];
  for (const c of fixtures) for (const o of INSPECTOR_OBJECTS) for (const vc of [undefined, 1234]) {
    const d = o.chip(ctx(c, vc));
    if (!d.text) continue;
    const visible = d.text.replace(" · ", ": ");
    const name = chipAccessibleName(o, d);
    assert.ok(name.includes(visible), `${o.id}: "${name}" lacks visible "${visible}"`);
  }
  assert.equal(chipAccessibleName(inspectorObject("name"), chip("name", card())), "Nombre: vacío, Tu nombre");
  assert.equal(chipAccessibleName(inspectorObject("photo"), chip("photo", card())), "Foto: vacío");
  assert.equal(chip("photo", card()).emptyThumb, true);
  assert.equal(chip("logo", card()).placeholder, true);
});

test("r2: Fondo and 'Aa' share the background layers (drawn over the checker in the chip)", () => {
  const c = card({ effects: { bg: { image: "bg.png" } } });
  assert.deepEqual(chip("allText", c).swatch, chip("cardBg", c).swatch);
  assert.equal(chip("cardBg", card({ effects: { bg: { glass: true } } })).spoken, "transparente");
});
