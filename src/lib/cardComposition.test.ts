// Card composition engine (rewrite 2026-10-15): fixed spacing, shape chosen
// from the photo anchor (never from the height), group anchoring, icons and
// buttons flowing under the texts, nothing compressed, and the content floor
// (computeCardMinSize). The sweep tests are the audit that found the old
// engine's bugs, kept as regressions.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeComposition, computeBlockLayout, computeCardMinSize, CONTENT_ROW_GAP, FLOW_GAP, pfpContentGap,
  type CompositionContentInput, type CompositionInput, type ElementBox, type BlockOverrides,
  type LinksBlockInput, type ButtonsBlockInput,
} from "./cardComposition";

function content(overrides: Partial<CompositionContentInput> = {}): CompositionContentInput {
  return {
    name:       { present: true, length: 8 },
    handle:     { present: true, length: 10 },
    bio:        { present: false, length: 0 },
    descriptor: { present: false, length: 0 },
    location:   { present: false, length: 0 },
    views:      { present: false, length: 0 },
    ...overrides,
  };
}

const FULL = content({
  name: { present: true, length: 11 }, handle: { present: true, length: 5 },
  bio: { present: true, length: 68 }, descriptor: { present: true, length: 13 },
  location: { present: true, length: 14 }, views: { present: true },
});

const TYPO = { nameFontSize: 15, bioFontSize: 8 };

function input(o: Partial<CompositionInput> & { ax?: number; ay?: number; size?: number } = {}): CompositionInput {
  const { ax = 0.5, ay = 0.5, size = 80, ...rest } = o;
  return {
    format: "vertical", boxW: 320, boxH: 520, padding: 20,
    pfp: { anchorX: ax, anchorY: ay, size },
    content: FULL, typography: TYPO, textAlign: "center",
    ...rest,
  };
}

const LINKS: LinksBlockInput = { size: { width: 80, height: 20 } };
const BUTTONS: ButtonsBlockInput = { size: { width: 280, height: 130 } };

function boxOverlap(a: ElementBox, b: ElementBox): boolean {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox > 0.5 && oy > 0.5;
}

function inBounds(b: ElementBox, i: CompositionInput): boolean {
  return b.x >= i.padding - 0.5 && b.y >= i.padding - 0.5
    && b.x + b.w <= i.boxW - i.padding + 0.5 && b.y + b.h <= i.boxH - i.padding + 0.5;
}

const TEXT_ROLES = ["name", "handle", "descriptor", "location", "bio", "views"] as const;

/** Every gap between consecutive text rows, top to bottom. */
function rowGaps(boxes: Partial<Record<string, ElementBox>>): number[] {
  const rows = TEXT_ROLES.map(r => boxes[r]).filter((b): b is ElementBox => !!b).sort((a, b) => a.y - b.y);
  return rows.slice(1).map((b, i) => b.y - (rows[i].y + rows[i].h));
}

// ── The audit's sweep, as a regression ──────────────────────────────────────

const ANCHORS = [0, 0.5, 1];
const WIDTHS = [260, 320, 420, 600];

function* sweepConfigs() {
  for (const boxW of WIDTHS) for (const ax of ANCHORS) for (const ay of ANCHORS)
    for (const links of [undefined, LINKS]) for (const buttons of [undefined, { size: { width: boxW - 40, height: 130 } }])
      yield { boxW, ax, ay, links, buttons };
}

test("growing the card never drops a text, never hides the icons or buttons, never switches the shape", () => {
  for (const c of sweepConfigs()) {
    let prev: { strategy: string; dropped: number; links: boolean; buttons: boolean } | undefined;
    for (let boxH = 220; boxH <= 760; boxH += 8) {
      const i = input({ boxW: c.boxW, boxH, ax: c.ax, ay: c.ay });
      const r = computeBlockLayout(i, {}, c.links, undefined, c.buttons);
      const cur = {
        strategy: r.strategy, dropped: r.dropped.length,
        links: !!r.boxes.links && inBounds(r.boxes.links, i),
        buttons: !!r.boxes.buttons && inBounds(r.boxes.buttons, i),
      };
      if (prev) {
        const tag = `${JSON.stringify({ ...c, links: !!c.links, buttons: !!c.buttons })} h=${boxH}`;
        assert.equal(cur.strategy, prev.strategy, `shape switched while growing: ${tag}`);
        assert.ok(cur.dropped <= prev.dropped, `a text disappeared while growing: ${tag}`);
        if (prev.links) assert.ok(cur.links, `icons hidden while growing: ${tag}`);
        if (prev.buttons) assert.ok(cur.buttons, `buttons hidden while growing: ${tag}`);
      }
      prev = cur;
    }
  }
});

test("the spacing between rows is the same constant at every size and in every shape", () => {
  for (const c of sweepConfigs()) {
    for (const boxH of [300, 450, 760]) {
      const r = computeBlockLayout(input({ boxW: c.boxW, boxH, ax: c.ax, ay: c.ay }), {}, c.links, undefined, c.buttons);
      for (const g of rowGaps(r.boxes)) assert.ok(Math.abs(g - CONTENT_ROW_GAP) < 0.01, `gap ${g} at h=${boxH}`);
    }
  }
});

test("from the minimum size up everything fits inside the card, without overlaps", () => {
  for (const c of sweepConfigs()) {
    const min = computeCardMinSize(input({ boxW: c.boxW, ax: c.ax, ay: c.ay }), {}, c.links, c.buttons);
    for (const boxH of [min.h, min.h + 37, min.h + 200]) {
      const i = input({ boxW: c.boxW, boxH, ax: c.ax, ay: c.ay });
      const r = computeBlockLayout(i, {}, c.links, undefined, c.buttons);
      assert.ok(r.fits, `fits at h=${boxH} (min ${min.h})`);
      assert.deepEqual(r.dropped, []);
      const all = Object.entries(r.boxes).filter(([, b]) => b) as [string, ElementBox][];
      for (const [k, b] of all) assert.ok(inBounds(b, i), `${k} in bounds at h=${boxH}`);
      // Every row, the photo and the flow blocks are pairwise disjoint.
      const parts = all.filter(([k]) => k !== "music");
      for (let a = 0; a < parts.length; a++) for (let b = a + 1; b < parts.length; b++) {
        assert.ok(!boxOverlap(parts[a][1], parts[b][1]), `${parts[a][0]}/${parts[b][0]} overlap at h=${boxH}`);
      }
    }
  }
});

test("computeCardMinSize is exact: everything fits at the minimum height and not 2px below it", () => {
  for (const c of sweepConfigs()) {
    const min = computeCardMinSize(input({ boxW: c.boxW, ax: c.ax, ay: c.ay }), {}, c.links, c.buttons);
    assert.ok(computeBlockLayout(input({ boxW: c.boxW, boxH: min.h, ax: c.ax, ay: c.ay }), {}, c.links, undefined, c.buttons).fits);
    assert.ok(!computeBlockLayout(input({ boxW: c.boxW, boxH: min.h - 2, ax: c.ax, ay: c.ay }), {}, c.links, undefined, c.buttons).fits);
  }
});

test("below the minimum size rows are dropped or the bio shortened — never compressed", () => {
  const natural = computeComposition(input({ boxH: 900 }));
  for (const boxH of [120, 160, 200, 240]) {
    const r = computeComposition(input({ boxH, size: 56 }));
    for (const role of TEXT_ROLES) {
      const b = r.boxes[role];
      if (!b || role === "bio") continue;
      assert.equal(b.h, natural.boxes[role]!.h, `${role} keeps its full height at h=${boxH}`);
    }
    if (r.boxes.bio) assert.equal(r.boxes.bio.h, r.boxes.bio.lines! * 8 * 1.6);
  }
});

test("degradation order below the minimum: metadata first, then bio lines, never the name", () => {
  const r = computeComposition(input({ boxH: 230, size: 56 }));
  assert.ok(r.boxes.name, "name kept");
  assert.ok(r.dropped.length > 0);
  assert.equal(r.dropped[0], "views");
  assert.ok(!r.fits);
});

// ── Shape choice ────────────────────────────────────────────────────────────

test("the photo's anchor picks the shape: a side → beside the texts, otherwise above / below", () => {
  assert.equal(computeComposition(input({ ax: 0.5, ay: 0 })).strategy, "column");
  assert.equal(computeComposition(input({ ax: 0.5, ay: 0.5 })).strategy, "column");
  assert.equal(computeComposition(input({ ax: 0.5, ay: 1 })).strategy, "column-reverse");
  assert.equal(computeComposition(input({ boxW: 600, ax: 0, ay: 0.5 })).strategy, "row");
  assert.equal(computeComposition(input({ boxW: 600, ax: 1, ay: 0.5 })).strategy, "row-reverse");
});

test("the other shape is used only when a text would not fit across the preferred one (width), never for height", () => {
  // Photo at the left of a narrow card: a long name does not fit beside it.
  const narrow = computeComposition(input({ boxW: 260, ax: 0, ay: 0, content: { ...FULL, name: { present: true, length: 20 } } }));
  assert.equal(narrow.strategy, "column");
  // A short, wide card keeps the stack the photo asked for and degrades
  // instead of jumping to the side shape.
  const short = computeComposition(input({ boxW: 600, boxH: 230, ax: 0.5, ay: 0.5 }));
  assert.equal(short.strategy, "column");
});

// ── Group anchoring ─────────────────────────────────────────────────────────

test("the anchor positions the whole group: top / centered / bottom, travel = free room", () => {
  const links = LINKS;
  for (const ay of [0, 0.5, 1]) {
    const i = input({ boxH: 640, ay });
    const r = computeBlockLayout(i, {}, links);
    const boxes = Object.values(r.boxes) as ElementBox[];
    const top = Math.min(...boxes.map(b => b.y));
    const bottom = Math.max(...boxes.map(b => b.y + b.h));
    const free = (i.boxH - 2 * i.padding) - (bottom - top);
    assert.ok(Math.abs(r.travel.y - free) < 0.01, "travel.y = room left");
    assert.ok(Math.abs(top - (i.padding + ay * free)) < 0.01, `group top at ay=${ay}`);
  }
});

test("textAlign aligns the photo, the rows and the icons of a stack", () => {
  const left = computeBlockLayout(input({ textAlign: "left" }), {}, LINKS);
  assert.equal(left.boxes.pfp!.x, left.boxes.name!.x);
  assert.equal(left.boxes.links!.x, left.boxes.name!.x);
  const right = computeBlockLayout(input({ textAlign: "right" }), {}, LINKS);
  const end = (b: ElementBox) => b.x + b.w;
  assert.ok(Math.abs(end(right.boxes.pfp!) - end(right.boxes.name!)) < 0.01);
  const center = computeBlockLayout(input({ ax: 0.5, textAlign: "center" }), {}, LINKS);
  const mid = (b: ElementBox) => b.x + b.w / 2;
  assert.ok(Math.abs(mid(center.boxes.pfp!) - 160) < 0.01);
  assert.ok(Math.abs(mid(center.boxes.name!) - 160) < 0.01);
  assert.ok(Math.abs(mid(center.boxes.links!) - 160) < 0.01);
});

test("spacing: photo→texts pfpContentGap(size), texts→icons→buttons FLOW_GAP, whatever the card height", () => {
  for (const boxH of [600, 760]) {
    const r = computeBlockLayout(input({ boxH, ay: 0 }), {}, LINKS, undefined, BUTTONS);
    const b = r.boxes;
    assert.ok(Math.abs(b.name!.y - (b.pfp!.y + b.pfp!.h) - pfpContentGap(80)) < 0.01);
    assert.ok(Math.abs(b.links!.y - (b.views!.y + b.views!.h) - FLOW_GAP) < 0.01);
    assert.ok(Math.abs(b.buttons!.y - (b.links!.y + b.links!.h) - FLOW_GAP) < 0.01);
  }
});

test("side shape: the photo is centered on the texts and the flow goes under both", () => {
  const r = computeBlockLayout(input({ boxW: 600, ax: 0, ay: 0 }), {}, LINKS, undefined, BUTTONS);
  assert.equal(r.strategy, "row");
  const b = r.boxes;
  const textTop = Math.min(...TEXT_ROLES.map(k => b[k]!.y));
  const textBottom = Math.max(...TEXT_ROLES.map(k => b[k]!.y + b[k]!.h));
  assert.ok(Math.abs((b.pfp!.y + b.pfp!.h / 2) - (textTop + textBottom) / 2) < 0.01);
  assert.ok(b.links!.y > Math.max(b.pfp!.y + b.pfp!.h, textBottom));
});

// ── Measured text ───────────────────────────────────────────────────────────

test("measured widths and bio line counts replace the estimates", () => {
  const measured = input({
    content: { ...FULL, name: { present: true, length: 11, width: 250 }, bio: { present: true, length: 68, width: 400, linesAt: () => 5 } },
  });
  const r = computeComposition(measured);
  assert.ok(r.boxes.name!.w >= 250);
  assert.equal(r.boxes.bio!.lines, 5);
  // A measured width wider than the card: the width floor follows it.
  const wide = computeCardMinSize(input({ content: { ...FULL, name: { present: true, length: 11, width: 420 } } }));
  assert.ok(wide.w >= 420 + 40);
});

// ── Draggable blocks (Stage 3B.3, kept) ─────────────────────────────────────

test("without block arguments the output is the plain composition (identityRect added)", () => {
  const i = input();
  const plain = computeComposition(i);
  const r = computeBlockLayout(i);
  assert.deepEqual(r.boxes, plain.boxes);
  assert.equal(r.strategy, plain.strategy);
});

test("a dragged location / views leaves the stack (the rest closes up) and sits at its anchor", () => {
  const i = input({ boxH: 640 });
  const base = computeBlockLayout(i);
  const moved = computeBlockLayout(i, { location: { x: 0, y: 1 } });
  assert.ok(moved.boxes.bio!.y < base.boxes.bio!.y, "bio moves up into the freed row");
  for (const g of rowGaps({ ...moved.boxes, location: undefined })) assert.ok(Math.abs(g - CONTENT_ROW_GAP) < 0.01);
  assert.ok(inBounds(moved.boxes.location!, i));
  assert.ok(!boxOverlap(moved.boxes.location!, moved.identityRect!));
});

test("dragged icons / buttons leave the flow and resolve at their anchor", () => {
  const i = input({ boxH: 640 });
  const r = computeBlockLayout(i, { links: { x: 1, y: 0 } }, LINKS, undefined, BUTTONS);
  assert.ok(inBounds(r.boxes.links!, i));
  assert.ok(Math.abs(r.boxes.buttons!.y - (r.boxes.views!.y + r.boxes.views!.h) - FLOW_GAP) < 0.01, "buttons close up under the texts");
});

test("blocks never leave the card at extreme anchors, and never cover a higher-priority block", () => {
  const i = input({ boxW: 420, boxH: 640 });
  for (const x of ANCHORS) for (const y of ANCHORS) {
    const ov: BlockOverrides = { identity: { x, y }, location: { x: 1 - x, y }, views: { x, y: 1 - y }, links: { x, y }, buttons: { x: 1 - x, y: 1 - y } };
    const r = computeBlockLayout(i, ov, LINKS, undefined, { size: { width: 200, height: 60 } });
    const ordered = [r.boxes.pfp, r.identityRect, r.boxes.location, r.boxes.views].filter((b): b is ElementBox => !!b);
    for (const b of [...ordered, r.boxes.links!, r.boxes.buttons!]) assert.ok(inBounds(b, i), `in bounds at ${x},${y}`);
    for (let a = 0; a < ordered.length; a++) for (let b = a + 1; b < ordered.length; b++) {
      assert.ok(!boxOverlap(ordered[a], ordered[b]), `no overlap at ${x},${y}`);
    }
  }
});

test("the photo never moves for a dragged text block", () => {
  const i = input({ boxH: 640 });
  const base = computeBlockLayout(i);
  const r = computeBlockLayout(i, { identity: { x: 0.5, y: 0 } });
  assert.deepEqual(r.boxes.pfp, base.boxes.pfp);
  assert.ok(!boxOverlap(r.identityRect!, r.boxes.pfp!));
});

test("the min size counts a dragged block that is bigger than the rest", () => {
  const min = computeCardMinSize(input({ content: content() }), { buttons: { x: 0.5, y: 0.5 } }, undefined, { size: { width: 300, height: 400 } });
  assert.ok(min.h >= 440 && min.w >= 340);
});
