// Menu redesign Phase 1 — capability → UI route matrix (implementation-plan.md,
// "Matriz capacidad→ruta: test que falla si un campo editable queda sin UI").
//
// Two halves:
// - Compile time: editorCapabilities.ts's maps are Record<every leaf path of
//   the data types, Capability>, so a new field without a decided place
//   fails `tsc`.
// - Here: every declared route is PROVEN against the real source (the
//   control that writes the field is still there), every superseded field
//   points at a real route, and every reason is written down. Moving a
//   control in Phases 2–7 means updating its route — never losing it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments, squash } from "./sourceScan";
import { capabilityAt, capabilityMatrix, MUSIC_CARD_CAPS, PROFILE_CARD_CAPS, type Capability } from "./editorCapabilities";

const root = process.cwd();
const sources = new Map<string, string>();
/** Source with comments removed — a control mentioned only in a comment
 * is not a control. */
function source(file: string): string {
  if (!sources.has(file)) {
    const raw = readFileSync(join(root, file), "utf8");
    sources.set(file, squash(stripComments(raw)));
  }
  return sources.get(file)!;
}

const rows = capabilityMatrix();

test("matrix covers both owners and every kind is explained", () => {
  assert.ok(rows.filter(r => r.owner === "profile").length > 150);
  assert.ok(rows.filter(r => r.owner === "music").length > 60);
  for (const { owner, path, cap } of rows) {
    if (cap.kind === "route") {
      assert.ok(cap.ui.trim().length > 0, `${owner}:${path} route without a UI path`);
      assert.ok(cap.evidence.length > 0, `${owner}:${path} route without evidence`);
    } else {
      assert.ok(cap.why.trim().length > 8, `${owner}:${path} (${cap.kind}) needs a reason`);
    }
  }
});

test("every route is proven: its control still writes the field in the real source", () => {
  const missing: string[] = [];
  for (const { owner, path, cap } of rows) {
    if (cap.kind !== "route") continue;
    for (const [file, text] of cap.evidence) {
      if (!existsSync(join(root, file))) { missing.push(`${owner}:${path} → ${file} (file not found)`); continue; }
      if (!source(file).includes(squash(text))) missing.push(`${owner}:${path} → ${file} lacks \`${text}\``);
    }
  }
  assert.deepEqual(missing, [], `capabilities without a place in the UI:\n${missing.join("\n")}`);
});

test("every superseded field points at a capability that has a route", () => {
  for (const { owner, path, cap } of rows) {
    if (cap.kind !== "superseded") continue;
    const target = capabilityAt(owner, cap.by);
    assert.ok(target, `${owner}:${path} → ${cap.by} is not in the matrix`);
    assert.equal(target!.kind, "route", `${owner}:${path} → ${cap.by} must be editable (is ${target!.kind})`);
  }
});

test("user content and core look are always routes (cannot be retired by accident)", () => {
  const mustRoute: Array<["profile" | "music", string]> = [
    ["profile", "photo"], ["profile", "name"], ["profile", "status"], ["profile", "location"], ["profile", "bio"],
    ["profile", "showViews"], ["profile", "contactLinks"], ["profile", "logo.url"], ["profile", "w"], ["profile", "h"],
    ["profile", "effects.bg.color"], ["profile", "effects.bg.image"], ["profile", "effects.border.width"],
    ["profile", "effects.shadow.intensity"], ["profile", "effects.glow.outer"], ["profile", "effects.text.glow.intensity"],
    ["profile", "effects.pfp.glow.intensity"], ["profile", "effects.textRoles.name.gradient.colors"],
    ["profile", "effects.textRoles.name.letterAnimation.amplitude"], ["profile", "blockStyle.links.iconColor"],
    ["music", "audioUrl"], ["music", "title"], ["music", "artist"], ["music", "textSize"], ["music", "font"],
    ["music", "effects.glow.outer"], ["music", "effects.shadow.intensity"], ["music", "effects.gradient.from"],
  ];
  for (const [owner, path] of mustRoute) {
    assert.equal(capabilityAt(owner, path)?.kind, "route", `${owner}:${path}`);
  }
});

test("the inspector never owns ProfileCard's position (centerCardPosition)", () => {
  const x: Capability = PROFILE_CARD_CAPS.x;
  assert.equal(x.kind, "system");
  assert.equal(PROFILE_CARD_CAPS.y.kind, "system");
  // Music, a free element, does expose its position.
  assert.equal(MUSIC_CARD_CAPS.x.kind, "route");
});

test("capabilityAt resolves every row (lookup used by superseded links)", () => {
  for (const { owner, path, cap } of rows) assert.equal(capabilityAt(owner, path), cap, `${owner}:${path}`);
});

test("evidence is specific: each text identifies one control (no shared substring that survives its deletion)", () => {
  const ambiguous: string[] = [];
  for (const { owner, path, cap } of rows) {
    if (cap.kind !== "route") continue;
    for (const [file, text] of cap.evidence) {
      const src = source(file);
      const needle = squash(text);
      const hits = src.split(needle).length - 1;
      if (hits !== 1) ambiguous.push(`${owner}:${path} → \`${text}\` appears ${hits}× in ${file}`);
    }
  }
  assert.deepEqual(ambiguous, [], ambiguous.join("\n"));
});
