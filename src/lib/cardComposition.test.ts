import { test } from "node:test";
import assert from "node:assert/strict";
import { computeComposition, computeBlockLayout, type CompositionContentInput, type CompositionInput, type ElementBox, type BlockOverrides, type LinksBlockInput, type MusicBlockInput } from "./cardComposition";

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

const TYPO = { nameFontSize: 15, bioFontSize: 8 };

function boxOverlap(a: ElementBox, b: ElementBox): boolean {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox > 0.5 && oy > 0.5; // sub-pixel tolerance
}

// ── Regression: reverse-branch content must hug the pfp's resolved position ──
// Before the fix, row-reverse/column-reverse pinned content to the padding
// edge regardless of where the pfp actually landed, which produced a huge
// pfp<->content gap whenever content was short and the box was wide. The
// proximity score term correctly penalized that gap, which made the pfp
// visually unable to reach that side of the card at all (see Stage 3B-fix).
test("pfp tracks the raw anchor with zero compromise across a full left-to-right sweep (wide box)", () => {
  const base: Omit<CompositionInput, "pfp"> = {
    format: "horizontal", boxW: 400, boxH: 180, padding: 20,
    content: content(), typography: TYPO,
  };
  let incumbent: CompositionInput["incumbent"];
  for (let ax = 0; ax <= 1.0001; ax += 0.05) {
    const r = computeComposition({ ...base, pfp: { anchorX: ax, anchorY: 0.5, size: 80 }, incumbent });
    const expectedX = 20 + ax * (400 - 40 - 80);
    assert.ok(r.boxes.pfp, `no pfp box at ax=${ax}`);
    assert.ok(
      Math.abs(r.boxes.pfp!.x - expectedX) < 1,
      `ax=${ax}: pfp.x=${r.boxes.pfp!.x}, expected ~${expectedX} (strategy=${r.strategy})`
    );
    incumbent = r.strategy;
  }
});

test("pfp tracks the raw anchor with zero compromise across a full top-to-bottom sweep (tall box)", () => {
  const base: Omit<CompositionInput, "pfp"> = {
    format: "vertical", boxW: 180, boxH: 400, padding: 20,
    content: content(), typography: TYPO,
  };
  let incumbent: CompositionInput["incumbent"];
  for (let ay = 0; ay <= 1.0001; ay += 0.05) {
    const r = computeComposition({ ...base, pfp: { anchorX: 0.5, anchorY: ay, size: 80 }, incumbent });
    const expectedY = 20 + ay * (400 - 40 - 80);
    assert.ok(
      Math.abs(r.boxes.pfp!.y - expectedY) < 1,
      `ay=${ay}: pfp.y=${r.boxes.pfp!.y}, expected ~${expectedY} (strategy=${r.strategy})`
    );
    incumbent = r.strategy;
  }
});

test("centered strategy always honors the anchor exactly (anchorDistance-free by construction)", () => {
  const input: CompositionInput = {
    format: "square", boxW: 260, boxH: 260, padding: 20,
    pfp: { anchorX: 0.15, anchorY: 0.85, size: 70 },
    content: content({ bio: { present: true, length: 60 } }),
    typography: TYPO,
  };
  const r = computeComposition(input);
  // Whatever strategy wins, re-derive what "centered" itself would have done
  // and confirm it places the pfp at the literal anchor position.
  const expectedX = 20 + 0.15 * (260 - 40 - 70);
  const expectedY = 20 + 0.85 * (260 - 40 - 70);
  if (r.strategy === "centered") {
    assert.ok(Math.abs(r.boxes.pfp!.x - expectedX) < 1);
    assert.ok(Math.abs(r.boxes.pfp!.y - expectedY) < 1);
  }
});

test("no overlap between pfp and any content box across small/large content combinations", () => {
  const scenarios: CompositionInput[] = [
    { format: "vertical", boxW: 180, boxH: 220, padding: 20, pfp: { anchorX: 0.5, anchorY: 0.5, size: 60 },
      content: content({ bio: { present: true, length: 220 }, descriptor: { present: true, length: 14 }, location: { present: true, length: 18 }, views: { present: true } }),
      typography: TYPO },
    { format: "horizontal", boxW: 640, boxH: 160, padding: 20, pfp: { anchorX: 0.1, anchorY: 0.5, size: 90 },
      content: content({ bio: { present: true, length: 40 } }), typography: TYPO },
    { format: "card", boxW: 300, boxH: 260, padding: 20, pfp: { anchorX: 0.9, anchorY: 0.1, size: 70 },
      content: content({ descriptor: { present: true, length: 20 }, location: { present: true, length: 20 }, views: { present: true } }),
      typography: TYPO },
  ];
  for (const input of scenarios) {
    const r = computeComposition(input);
    const boxes = Object.entries(r.boxes) as [string, ElementBox][];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        assert.ok(
          !boxOverlap(boxes[i][1], boxes[j][1]),
          `overlap between ${boxes[i][0]} and ${boxes[j][0]} in ${input.format} scenario (strategy=${r.strategy})`
        );
      }
    }
  }
});

test("no box exceeds the card bounds, even under a tight squeeze", () => {
  const input: CompositionInput = {
    format: "phone", boxW: 140, boxH: 249, padding: 14,
    pfp: { anchorX: 0.5, anchorY: 0.5, size: 52 },
    content: content({
      bio: { present: true, length: 400 },
      descriptor: { present: true, length: 30 },
      location: { present: true, length: 30 },
      views: { present: true },
    }),
    typography: TYPO,
  };
  const r = computeComposition(input);
  for (const [role, b] of Object.entries(r.boxes) as [string, ElementBox][]) {
    assert.ok(b.x >= -0.5 && b.y >= -0.5, `${role} starts outside the box: ${JSON.stringify(b)}`);
    assert.ok(b.x + b.w <= input.boxW + 0.5, `${role} overflows right edge: ${JSON.stringify(b)}`);
    assert.ok(b.y + b.h <= input.boxH + 0.5, `${role} overflows bottom edge: ${JSON.stringify(b)}`);
  }
});

test("degradation drops optional metadata before touching name/handle/pfp, and bio is clamped rather than dropped", () => {
  const input: CompositionInput = {
    format: "phone", boxW: 140, boxH: 249, padding: 14,
    pfp: { anchorX: 0.5, anchorY: 0.2, size: 52 },
    content: {
      name: { present: true, length: 8 },
      handle: { present: true, length: 10 },
      bio: { present: true, length: 500 },
      descriptor: { present: true, length: 30 },
      location: { present: true, length: 30 },
      views: { present: true },
    },
    typography: TYPO,
  };
  const r = computeComposition(input);
  assert.ok(!r.dropped.includes("name"));
  assert.ok(!r.dropped.includes("handle"));
  assert.ok(!r.dropped.includes("pfp" as never));
  assert.ok(!r.dropped.includes("bio"), "bio should be clamped via lines, never fully dropped");
  if (r.boxes.bio) assert.ok((r.boxes.bio.lines ?? 0) >= 1);
});

test("hysteresis: incumbent is kept for a small anchor nudge, but yields once the anchor clearly favors another strategy", () => {
  const base: Omit<CompositionInput, "pfp" | "incumbent"> = {
    format: "horizontal", boxW: 400, boxH: 180, padding: 20,
    content: content(), typography: TYPO,
  };
  const settled = computeComposition({ ...base, pfp: { anchorX: 0.15, anchorY: 0.5, size: 80 } });
  // Tiny nudge in the same neighborhood shouldn't flap away from the settled strategy.
  const nudged = computeComposition({ ...base, pfp: { anchorX: 0.17, anchorY: 0.5, size: 80 }, incumbent: settled.strategy });
  assert.equal(nudged.strategy, settled.strategy);
  // Dragging all the way to the opposite side must eventually win regardless of incumbent.
  const flipped = computeComposition({ ...base, pfp: { anchorX: 0.95, anchorY: 0.5, size: 80 }, incumbent: settled.strategy });
  assert.notEqual(flipped.strategy, settled.strategy);
});

// ── Stage 3B.2-B: PFP authority (regression for the 3B.2-A/B anchor-drag bug) ─
// Before this stage, row/row-reverse/column/column-reverse could silently
// clamp the pfp away from the anchor when heavy content needed the room —
// this is the exact scenario (horizontal format, heavy metadata, anchor
// pushed to an extreme) that produced a real, reported "pfp renders far from
// where it was dragged" bug. The pfp position must now be anchor-exact
// regardless of how much content is present or how badly it has to degrade.
test("PFP position is anchor-exact under heavy content that forces degradation, for every strategy", () => {
  const heavyContent = content({
    bio: { present: true, length: 300 },
    descriptor: { present: true, length: 40 },
    location: { present: true, length: 40 },
    views: { present: true },
  });
  const base: Omit<CompositionInput, "pfp"> = {
    format: "horizontal", boxW: 320, boxH: 150, padding: 20,
    content: heavyContent, typography: TYPO,
  };
  for (const anchorX of [0, 0.05, 0.5, 0.874, 0.95, 1]) {
    const r = computeComposition({ ...base, pfp: { anchorX, anchorY: 0.5, size: 80 } });
    const expectedX = 20 + anchorX * (320 - 40 - 80);
    assert.ok(
      Math.abs(r.boxes.pfp!.x - expectedX) < 1,
      `anchorX=${anchorX}: pfp.x=${r.boxes.pfp!.x}, expected ~${expectedX} (strategy=${r.strategy}, dropped=${r.dropped.join(",")})`
    );
  }
});

// ── Stage 3B.2-B: text alignment ──────────────────────────────────────────────
test("textAlign left/center/right shifts rows within the content block without moving the block itself", () => {
  const base: CompositionInput = {
    format: "vertical", boxW: 240, boxH: 320, padding: 20,
    pfp: { anchorX: 0.5, anchorY: 0.1, size: 70 },
    content: content({ name: { present: true, length: 4 }, handle: { present: true, length: 14 } }),
    typography: TYPO,
  };
  const left   = computeComposition({ ...base, textAlign: "left" });
  const center = computeComposition({ ...base, textAlign: "center" });
  const right  = computeComposition({ ...base, textAlign: "right" });

  // Handle (14 chars) is wider than name (4 chars) in this scenario, so it's
  // the block's own width — under "left" both rows share the same local x=0
  // (flush with the block's left edge); under "right", handle (the widest
  // row) stays put while name shifts right to align its own right edge with
  // the block's; "center" must land strictly between the two.
  assert.equal(left.boxes.name!.x, left.boxes.handle!.x, "left: both rows flush with the block's left edge");
  assert.ok(right.boxes.name!.x > right.boxes.handle!.x, "right: shorter row (name) shifts right of the widest row (handle)");
  assert.ok(
    center.boxes.name!.x > left.boxes.name!.x && center.boxes.name!.x < right.boxes.name!.x,
    "center must land strictly between left and right"
  );

  // The block's own position in the card (driven by anchor/topology, not
  // textAlign) must stay identical across all three — only the row's
  // position WITHIN the block changes.
  assert.equal(left.boxes.pfp!.x, right.boxes.pfp!.x);
  assert.equal(left.strategy, right.strategy);
});

// ── Stage 3B.2-B: text width estimation includes letter-spacing ──────────────
// Regression for "CEO OF MYLAND" -> "CEO OF MYLA..." — the descriptor box the
// engine allocates must be wide enough to include the letter-spacing gaps
// DescriptorLine actually renders with (see TEXT_METRICS in cardComposition.ts),
// not just charCount*fontSize*avgCharWidth.
test("descriptor box width accounts for letter-spacing, not just naive char width", () => {
  const status = "CEO OF MYLAND";
  const naiveWidth = status.length * 9 * 0.6; // old formula, no letter-spacing, no safety margin
  const input: CompositionInput = {
    format: "horizontal", boxW: 500, boxH: 200, padding: 20,
    pfp: { anchorX: 0, anchorY: 0.5, size: 80 },
    content: content({ descriptor: { present: true, length: status.length } }),
    typography: TYPO,
  };
  const r = computeComposition(input);
  assert.ok(r.boxes.descriptor, "descriptor should have a box");
  assert.ok(
    r.boxes.descriptor!.w > naiveWidth,
    `descriptor box (${r.boxes.descriptor!.w}) should be wider than the naive pre-fix estimate (${naiveWidth})`
  );
});

// ── Stage 3B.3: computeBlockLayout (constrained freeform blocks) ─────────────

function fullContent(overrides: Partial<CompositionContentInput> = {}): CompositionContentInput {
  return content({
    bio: { present: true, length: 60 },
    descriptor: { present: true, length: 20 },
    location: { present: true, length: 18 },
    views: { present: true },
    ...overrides,
  });
}

function boxesOverlap(a: ElementBox, b: ElementBox): boolean {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return ox > 0.5 && oy > 0.5;
}

function baseInput(overrides: Partial<CompositionInput> = {}): CompositionInput {
  return {
    format: "card", boxW: 320, boxH: 300, padding: 20,
    pfp: { anchorX: 0.5, anchorY: 0.1, size: 70 },
    content: fullContent(),
    typography: TYPO,
    ...overrides,
  };
}

test("computeBlockLayout matches computeComposition exactly when no overrides are given", () => {
  const input = baseInput();
  const base = computeComposition(input);
  const layout = computeBlockLayout(input);
  assert.deepEqual(layout.boxes, base.boxes);
  assert.equal(layout.strategy, base.strategy);
});

test("PFP stays exactly as computeComposition placed it, unaffected by block overrides", () => {
  const input = baseInput();
  const base = computeComposition(input);
  const overrides: BlockOverrides = { identity: { x: 0.1, y: 0.9 }, location: { x: 0.9, y: 0.9 }, views: { x: 0.9, y: 0.1 } };
  const layout = computeBlockLayout(input, overrides);
  assert.deepEqual(layout.boxes.pfp, base.boxes.pfp);
});

test("identity group never leaves the card bounds, even at extreme override anchors", () => {
  const input = baseInput();
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
    const layout = computeBlockLayout(input, { identity: anchor });
    for (const role of ["name", "handle", "descriptor", "bio"] as const) {
      const b = layout.boxes[role];
      if (!b) continue;
      assert.ok(b.x >= 20 - 0.5 && b.y >= 20 - 0.5, `${role} outside top-left at anchor ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
      assert.ok(b.x + b.w <= input.boxW - 20 + 0.5 && b.y + b.h <= input.boxH - 20 + 0.5, `${role} outside bottom-right at anchor ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
    }
  }
});

test("location never leaves the card bounds, even at extreme override anchors", () => {
  const input = baseInput();
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }]) {
    const layout = computeBlockLayout(input, { location: anchor });
    const b = layout.boxes.location!;
    assert.ok(b.x >= 20 - 0.5 && b.y >= 20 - 0.5);
    assert.ok(b.x + b.w <= input.boxW - 20 + 0.5 && b.y + b.h <= input.boxH - 20 + 0.5);
  }
});

test("views never leaves the card bounds, even at extreme override anchors", () => {
  const input = baseInput();
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }]) {
    const layout = computeBlockLayout(input, { views: anchor });
    const b = layout.boxes.views!;
    assert.ok(b.x >= 20 - 0.5 && b.y >= 20 - 0.5);
    assert.ok(b.x + b.w <= input.boxW - 20 + 0.5 && b.y + b.h <= input.boxH - 20 + 0.5);
  }
});

test("identity cannot overlap the pfp even when dragged directly onto it", () => {
  const input = baseInput();
  const layout = computeBlockLayout(input, { identity: { x: input.pfp.anchorX, y: input.pfp.anchorY } });
  const pfp = layout.boxes.pfp!;
  for (const role of ["name", "handle", "descriptor", "bio"] as const) {
    const b = layout.boxes[role];
    if (b) assert.ok(!boxesOverlap(pfp, b), `${role} overlaps pfp: ${JSON.stringify(b)}`);
  }
});

test("location cannot overlap the identity group even when dragged onto it", () => {
  const input = baseInput();
  const identityAnchor = { x: 0.2, y: 0.7 };
  const layout = computeBlockLayout(input, { identity: identityAnchor, location: identityAnchor });
  const identityUnion = ["name", "handle", "descriptor", "bio"]
    .map(r => layout.boxes[r as "name"])
    .filter((b): b is ElementBox => b != null);
  const loc = layout.boxes.location!;
  for (const b of identityUnion) assert.ok(!boxesOverlap(b, loc), `location overlaps identity role box: ${JSON.stringify(b)}`);
});

test("views cannot overlap identity or location even when dragged onto them", () => {
  const input = baseInput();
  const target = { x: 0.5, y: 0.5 };
  const layout = computeBlockLayout(input, { identity: target, location: target, views: target });
  const views = layout.boxes.views!;
  const others = (["name", "handle", "descriptor", "bio", "location"] as const)
    .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of others) assert.ok(!boxesOverlap(b, views), `views overlaps: ${JSON.stringify(b)}`);
});

test("block anchors survive a resize: still valid (in bounds, non-overlapping) at a different card size", () => {
  const overrides: BlockOverrides = { identity: { x: 0.1, y: 0.6 }, location: { x: 0.8, y: 0.3 }, views: { x: 0.8, y: 0.8 } };
  for (const [boxW, boxH] of [[320, 300], [420, 260], [280, 380]] as [number, number][]) {
    const input = baseInput({ boxW, boxH });
    const layout = computeBlockLayout(input, overrides);
    const all = (["name", "handle", "descriptor", "bio", "location", "views"] as const)
      .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
    for (const b of all) {
      assert.ok(b.x >= 19.5 && b.y >= 19.5 && b.x + b.w <= boxW - 19.5 && b.y + b.h <= boxH - 19.5,
        `out of bounds at ${boxW}x${boxH}: ${JSON.stringify(b)}`);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        assert.ok(!boxesOverlap(all[i], all[j]), `overlap at ${boxW}x${boxH} between boxes ${i} and ${j}`);
      }
    }
    if (layout.boxes.pfp) all.push(layout.boxes.pfp);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        assert.ok(!boxesOverlap(all[i], all[j]), `overlap (incl. pfp) at ${boxW}x${boxH} between boxes ${i} and ${j}`);
      }
    }
  }
});

test("every card format produces a valid (in-bounds, non-overlapping) block layout with overrides applied", () => {
  const overrides: BlockOverrides = { identity: { x: 0.15, y: 0.75 }, location: { x: 0.85, y: 0.15 }, views: { x: 0.85, y: 0.85 } };
  const formats: CompositionInput["format"][] = ["vertical", "horizontal", "square", "phone", "card"];
  for (const format of formats) {
    const input = baseInput({ format, boxW: format === "horizontal" ? 500 : 260, boxH: format === "horizontal" ? 180 : 380 });
    const layout = computeBlockLayout(input, overrides);
    const all = (["name", "handle", "descriptor", "bio", "location", "views", "pfp"] as const)
      .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
    for (const b of all) {
      assert.ok(b.x >= 19.5 && b.y >= 19.5 && b.x + b.w <= input.boxW - 19.5 && b.y + b.h <= input.boxH - 19.5,
        `${format}: box out of bounds: ${JSON.stringify(b)}`);
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        assert.ok(!boxesOverlap(all[i], all[j]), `${format}: overlap between boxes ${i} and ${j}`);
      }
    }
  }
});

test("long text content still gets reasonable room, not dropped or clamped without need, under computeBlockLayout", () => {
  const input = baseInput({ content: fullContent({ bio: { present: true, length: 300 } }) });
  const layout = computeBlockLayout(input);
  assert.ok(!layout.dropped.includes("name"));
  assert.ok(!layout.dropped.includes("handle"));
  if (layout.boxes.bio) assert.ok((layout.boxes.bio.lines ?? 0) >= 1, "bio should be clamped via lines, never fully dropped");
});

test("textAlign does not change the identity block's position, only internal row alignment", () => {
  const overrides: BlockOverrides = { identity: { x: 0.3, y: 0.4 } };
  const left = computeBlockLayout(baseInput({ textAlign: "left" }), overrides);
  const right = computeBlockLayout(baseInput({ textAlign: "right" }), overrides);
  for (const role of ["name", "handle", "descriptor", "bio"] as const) {
    const l = left.boxes[role], r = right.boxes[role];
    if (!l || !r) continue;
    assert.equal(l.y, r.y, `${role}: y should be identical`);
    assert.equal(l.w, r.w, `${role}: w should be identical`);
  }
});

test("all four blocks (pfp, identity, location, views) coexist without drops when there's enough room", () => {
  const input = baseInput({ boxW: 420, boxH: 420, format: "square" });
  const layout = computeBlockLayout(input);
  assert.ok(layout.boxes.pfp);
  assert.ok(layout.boxes.name);
  assert.ok(layout.boxes.handle);
  assert.ok(layout.boxes.location);
  assert.ok(layout.boxes.views);
  assert.equal(layout.dropped.length, 0, `unexpected drops: ${layout.dropped.join(",")}`);
});

// ── Stage 4.2-A: links as an optional 5th, lowest-priority block ─────────────
// Infrastructure only — no caller passes `links` yet outside these tests (see
// CLAUDE.md's Etapa 4 roadmap: the actual Links UI/content is Stage 4.2-B).

const LINKS_SMALL: LinksBlockInput = { size: { width: 60, height: 24 } };

test("regression: computeBlockLayout without a links argument is byte-identical to its pre-4.2-A output", () => {
  const input = baseInput();
  const overrideCombos: (BlockOverrides | undefined)[] = [
    undefined,
    { identity: { x: 0.1, y: 0.9 } },
    { identity: { x: 0.1, y: 0.9 }, location: { x: 0.9, y: 0.9 }, views: { x: 0.9, y: 0.1 } },
    { location: { x: 0.5, y: 0.5 } },
  ];
  for (const overrides of overrideCombos) {
    const withoutLinksArg = overrides ? computeBlockLayout(input, overrides) : computeBlockLayout(input);
    const withUndefinedLinksArg = computeBlockLayout(input, overrides, undefined);
    assert.deepEqual(withoutLinksArg, withUndefinedLinksArg);
    assert.equal(withoutLinksArg.boxes.links, undefined, "no links box should appear when links is not requested");
  }
});

test("links block appears as a 5th box once requested, without disturbing pfp/identity/location/views", () => {
  const input = baseInput();
  const without = computeBlockLayout(input);
  const withLinks = computeBlockLayout(input, undefined, LINKS_SMALL);
  assert.ok(withLinks.boxes.links, "links box should be present");
  assert.equal(withLinks.boxes.links!.w, LINKS_SMALL.size.width);
  assert.equal(withLinks.boxes.links!.h, LINKS_SMALL.size.height);
  for (const role of ["pfp", "name", "handle", "descriptor", "location", "views"] as const) {
    assert.deepEqual(withLinks.boxes[role], without.boxes[role], `${role} should be unaffected by links being present`);
  }
});

test("links block never overlaps pfp, identity, location, or views", () => {
  const input = baseInput();
  const layout = computeBlockLayout(input, undefined, LINKS_SMALL);
  const links = layout.boxes.links!;
  const others = (["pfp", "name", "handle", "descriptor", "bio", "location", "views"] as const)
    .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of others) assert.ok(!boxesOverlap(b, links), `links overlaps: ${JSON.stringify(b)}`);
});

test("links block stays within card bounds, including at extreme override anchors", () => {
  const input = baseInput();
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
    const layout = computeBlockLayout(input, { links: anchor }, LINKS_SMALL);
    const b = layout.boxes.links!;
    assert.ok(b.x >= 20 - 0.5 && b.y >= 20 - 0.5, `links outside top-left at ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
    assert.ok(b.x + b.w <= input.boxW - 20 + 0.5 && b.y + b.h <= input.boxH - 20 + 0.5, `links outside bottom-right at ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
  }
});

test("priority: dragging links onto the pfp/identity/location/views displaces only links, never the others", () => {
  const input = baseInput();
  const target = { x: 0.5, y: 0.5 };
  const withoutLinks = computeBlockLayout(input, { identity: target, location: target, views: target });
  const withLinks = computeBlockLayout(input, { identity: target, location: target, views: target, links: target }, LINKS_SMALL);
  for (const role of ["pfp", "name", "handle", "descriptor", "location", "views"] as const) {
    assert.deepEqual(withLinks.boxes[role], withoutLinks.boxes[role], `${role} moved because links was dragged onto it`);
  }
  const links = withLinks.boxes.links!;
  const others = (["pfp", "name", "handle", "descriptor", "bio", "location", "views"] as const)
    .map(r => withLinks.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of others) assert.ok(!boxesOverlap(b, links), `links overlaps ${JSON.stringify(b)} despite priority resolution`);
});

test("links respects its own anchor override via the same anchorToRect/rectToAnchor contract as other blocks", () => {
  // Small card, no other content, so links has the whole padded area to itself
  // and the anchor maps predictably (same formula blockConstraints.test.ts verifies directly).
  const input = baseInput({ content: { name: { present: false }, handle: { present: false }, bio: { present: false }, descriptor: { present: false }, location: { present: false }, views: { present: false } } });
  const layout = computeBlockLayout(input, { links: { x: 0, y: 0 } }, LINKS_SMALL);
  const b = layout.boxes.links!;
  assert.ok(Math.abs(b.x - input.padding) < 0.5, `links.x should hug the top-left padding edge: ${b.x}`);
  assert.ok(Math.abs(b.y - input.padding) < 0.5, `links.y should hug the top-left padding edge: ${b.y}`);
});

test("links block grows downward without overlap once the card is tall enough to fit it (vertical growth integration)", () => {
  const input = baseInput({ boxH: 500 }); // simulates a card already grown via computeRequiredCardHeight
  const layout = computeBlockLayout(input, undefined, LINKS_SMALL);
  assert.ok(layout.boxes.links, "links should fit once the card has enough height");
  const links = layout.boxes.links!;
  assert.ok(links.y + links.h <= input.boxH - input.padding + 0.5, "links must stay within the taller box");
});

// ── Stage 4.2-C.1: music as an optional 6th, lowest-priority block ───────────
// Infrastructure only — no caller passes `music` in production yet (the
// player UI is Stage 4.2-C.2). Mirrors the links tests above one level down
// the priority chain: PFP -> Identity -> Location -> Views -> Links -> Music.

const MUSIC_SMALL: MusicBlockInput = { size: { width: 200, height: 56 } };

test("regression: computeBlockLayout without a music argument is byte-identical to its pre-4.2-C output", () => {
  const input = baseInput();
  const overrideCombos: (BlockOverrides | undefined)[] = [
    undefined,
    { identity: { x: 0.1, y: 0.9 } },
    { identity: { x: 0.1, y: 0.9 }, location: { x: 0.9, y: 0.9 }, views: { x: 0.9, y: 0.1 } },
    { links: { x: 0.5, y: 0.5 } },
  ];
  for (const overrides of overrideCombos) {
    for (const links of [undefined, LINKS_SMALL]) {
      const withoutMusicArg = computeBlockLayout(input, overrides, links);
      const withUndefinedMusicArg = computeBlockLayout(input, overrides, links, undefined);
      assert.deepEqual(withoutMusicArg, withUndefinedMusicArg);
      assert.equal(withoutMusicArg.boxes.music, undefined, "no music box should appear when music is not requested");
    }
  }
});

test("regression: computeBlockLayout with neither links nor music is byte-identical to pre-4.2-A computeBlockLayout(input, overrides)", () => {
  const input = baseInput();
  const overrides: BlockOverrides = { identity: { x: 0.2, y: 0.3 }, views: { x: 0.8, y: 0.8 } };
  const twoArgCall = computeBlockLayout(input, overrides);
  const fourArgCallAllUndefined = computeBlockLayout(input, overrides, undefined, undefined);
  assert.deepEqual(twoArgCall, fourArgCallAllUndefined);
});

test("music block appears as a 6th box once requested, without disturbing pfp/identity/location/views/links", () => {
  const input = baseInput();
  const withoutMusic = computeBlockLayout(input, undefined, LINKS_SMALL);
  const withMusic = computeBlockLayout(input, undefined, LINKS_SMALL, MUSIC_SMALL);
  assert.ok(withMusic.boxes.music, "music box should be present");
  assert.equal(withMusic.boxes.music!.w, MUSIC_SMALL.size.width);
  assert.equal(withMusic.boxes.music!.h, MUSIC_SMALL.size.height);
  for (const role of ["pfp", "name", "handle", "descriptor", "location", "views", "links"] as const) {
    assert.deepEqual(withMusic.boxes[role], withoutMusic.boxes[role], `${role} should be unaffected by music being present`);
  }
});

test("music block can appear even when links is absent", () => {
  const input = baseInput();
  const layout = computeBlockLayout(input, undefined, undefined, MUSIC_SMALL);
  assert.ok(layout.boxes.music, "music box should be present without a links block");
  assert.equal(layout.boxes.links, undefined, "links box should not appear when not requested");
});

test("music block never overlaps pfp, identity, location, views, or links", () => {
  // Tall enough to give both extra blocks genuine room — like real usage,
  // where the growth effect (ProfileCard.tsx) already grew the card before
  // this many blocks need to coexist; the anti-overlap escape system is a
  // last-resort safety net, not the primary way non-overlapping room is made.
  const input = baseInput({ boxH: 500 });
  const layout = computeBlockLayout(input, undefined, LINKS_SMALL, MUSIC_SMALL);
  const music = layout.boxes.music!;
  const others = (["pfp", "name", "handle", "descriptor", "bio", "location", "views", "links"] as const)
    .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of others) assert.ok(!boxesOverlap(b, music), `music overlaps: ${JSON.stringify(b)}`);
});

test("music block stays within card bounds, including at extreme override anchors", () => {
  const input = baseInput();
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
    const layout = computeBlockLayout(input, { music: anchor }, LINKS_SMALL, MUSIC_SMALL);
    const b = layout.boxes.music!;
    assert.ok(b.x >= 20 - 0.5 && b.y >= 20 - 0.5, `music outside top-left at ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
    assert.ok(b.x + b.w <= input.boxW - 20 + 0.5 && b.y + b.h <= input.boxH - 20 + 0.5, `music outside bottom-right at ${JSON.stringify(anchor)}: ${JSON.stringify(b)}`);
  }
});

test("priority: dragging music onto pfp/identity/location/views/links displaces only music, never the others", () => {
  const input = baseInput({ boxH: 500 }); // genuine room for 6 blocks at once, see the "never overlaps" test above
  const target = { x: 0.5, y: 0.5 };
  const withoutMusic = computeBlockLayout(input, { identity: target, location: target, views: target, links: target }, LINKS_SMALL);
  const withMusic = computeBlockLayout(input, { identity: target, location: target, views: target, links: target, music: target }, LINKS_SMALL, MUSIC_SMALL);
  for (const role of ["pfp", "name", "handle", "descriptor", "location", "views", "links"] as const) {
    assert.deepEqual(withMusic.boxes[role], withoutMusic.boxes[role], `${role} moved because music was dragged onto it`);
  }
  const music = withMusic.boxes.music!;
  const others = (["pfp", "name", "handle", "descriptor", "bio", "location", "views", "links"] as const)
    .map(r => withMusic.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of others) assert.ok(!boxesOverlap(b, music), `music overlaps ${JSON.stringify(b)} despite priority resolution`);
});

test("priority: music is displaced by links when both land on the same spot, never the reverse", () => {
  const input = baseInput();
  const target = { x: 0.5, y: 0.5 };
  // Both blocks dragged onto the exact same anchor: links (higher priority)
  // must land exactly where it would if music didn't exist at all; music
  // (lower priority) must yield out of the way instead.
  const linksAlone = computeBlockLayout(input, { links: target }, LINKS_SMALL);
  const layout = computeBlockLayout(input, { links: target, music: target }, LINKS_SMALL, MUSIC_SMALL);
  assert.deepEqual(layout.boxes.links, linksAlone.boxes.links, "links' position must be unaffected by music being dragged onto the same spot");
  assert.ok(!boxesOverlap(layout.boxes.links!, layout.boxes.music!), "music must yield, not overlap the higher-priority links block");
});

test("music respects its own anchor override via the same anchorToRect/rectToAnchor contract as other blocks", () => {
  // pfp moved to the opposite corner so the {0,0} target below is genuinely
  // free — otherwise this would just be re-testing anti-overlap escape (see
  // the "never overlaps"/priority tests above), not the anchor contract itself.
  const input = baseInput({
    pfp: { anchorX: 1, anchorY: 1, size: 70 },
    content: { name: { present: false }, handle: { present: false }, bio: { present: false }, descriptor: { present: false }, location: { present: false }, views: { present: false } },
  });
  const layout = computeBlockLayout(input, { music: { x: 0, y: 0 } }, undefined, MUSIC_SMALL);
  const b = layout.boxes.music!;
  assert.ok(Math.abs(b.x - input.padding) < 0.5, `music.x should hug the top-left padding edge: ${b.x}`);
  assert.ok(Math.abs(b.y - input.padding) < 0.5, `music.y should hug the top-left padding edge: ${b.y}`);
});

test("music block grows downward without overlap once the card is tall enough to fit it, alongside links (vertical growth integration)", () => {
  const input = baseInput({ boxH: 600 }); // simulates a card already grown via computeRequiredCardHeight
  const layout = computeBlockLayout(input, undefined, LINKS_SMALL, MUSIC_SMALL);
  assert.ok(layout.boxes.links && layout.boxes.music, "both links and music should fit once the card has enough height");
  const music = layout.boxes.music!;
  assert.ok(music.y + music.h <= input.boxH - input.padding + 0.5, "music must stay within the taller box");
  assert.ok(!boxesOverlap(layout.boxes.links!, music), "links and music must not overlap even when both fit");
});

test("small card sizes degrade coherently under computeBlockLayout, never overflowing bounds", () => {
  const input: CompositionInput = {
    format: "phone", boxW: 140, boxH: 249, padding: 14,
    pfp: { anchorX: 0.5, anchorY: 0.5, size: 52 },
    content: fullContent({ bio: { present: true, length: 400 } }),
    typography: TYPO,
  };
  const layout = computeBlockLayout(input, { location: { x: 0.9, y: 0.9 }, views: { x: 0.1, y: 0.9 } });
  const all = (["name", "handle", "descriptor", "bio", "location", "views", "pfp"] as const)
    .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
  for (const b of all) {
    assert.ok(b.x >= -0.5 && b.y >= -0.5, `box starts outside: ${JSON.stringify(b)}`);
    assert.ok(b.x + b.w <= input.boxW + 0.5 && b.y + b.h <= input.boxH + 0.5, `box overflows: ${JSON.stringify(b)}`);
  }
});

// ── Stage 3B.3-B: drag integration — anchor grid + explicit priority ─────────
// Covers the etapa's own numbered list (X/Y at 0, 0.5, 1; drag-against-bounds;
// drag-that-overlaps; explicit priority ordering). The mouse-driven parts of
// 3B.3-B (mousedown/mousemove/mouseup, updateProfile persistence, "don't move
// the whole ProfileCard") live in ProfileCard.tsx and this repo has no DOM/
// component-testing harness (no jsdom or React Testing Library configured) —
// those are verified by code review (see the summary) and manual QA, exactly
// how the PFP's own drag was verified in 3B.2-A/B. What's tested here is
// everything the drag calls into: computeBlockLayout + blockConstraints.

test("location resolves correctly for every combination of X,Y in {0, 0.5, 1}", () => {
  const input = baseInput();
  for (const x of [0, 0.5, 1]) {
    for (const y of [0, 0.5, 1]) {
      const layout = computeBlockLayout(input, { location: { x, y } });
      const b = layout.boxes.location!;
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `non-finite result at (${x},${y})`);
      assert.ok(b.x >= 19.5 && b.y >= 19.5 && b.x + b.w <= input.boxW - 19.5 && b.y + b.h <= input.boxH - 19.5,
        `out of bounds at anchor (${x},${y}): ${JSON.stringify(b)}`);
    }
  }
});

test("identity resolves correctly for every combination of X,Y in {0, 0.5, 1}", () => {
  const input = baseInput();
  for (const x of [0, 0.5, 1]) {
    for (const y of [0, 0.5, 1]) {
      const layout = computeBlockLayout(input, { identity: { x, y } });
      for (const role of ["name", "handle", "descriptor", "bio"] as const) {
        const b = layout.boxes[role];
        if (!b) continue;
        assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `${role}: non-finite result at (${x},${y})`);
        assert.ok(b.x >= 19.5 && b.y >= 19.5 && b.x + b.w <= input.boxW - 19.5 && b.y + b.h <= input.boxH - 19.5,
          `${role}: out of bounds at anchor (${x},${y}): ${JSON.stringify(b)}`);
      }
    }
  }
});

test("priority is exactly PFP > Identity > Location > Views: a higher-priority block dragged onto a lower one keeps its own requested position untouched", () => {
  const input = baseInput();
  // Deliberately away from the pfp's own footprint (x:[125,195], y:[39,109]
  // in this 320x300 card) — this test isolates identity/location/views
  // priority specifically; identity yielding to the PFP is already covered
  // by the "PFP outranks every block" test below.
  const target = { x: 0.1, y: 0.7 };

  // Identity dragged onto where Location/Views would want to be: identity's
  // OWN position must land exactly on the raw anchor (nothing to yield to,
  // pfp isn't there) — it's Location/Views that must move instead.
  const layout = computeBlockLayout(input, { identity: target, location: target, views: target });
  const identityUnion = (["name", "handle", "descriptor", "bio"] as const)
    .map(r => layout.boxes[r]).filter((b): b is ElementBox => b != null);
  assert.ok(layout.identityRect, "identityRect should be present");
  const expected = { x: 20 + target.x * (input.boxW - 40 - layout.identityRect!.w), y: 20 + target.y * (input.boxH - 40 - layout.identityRect!.h) };
  assert.ok(Math.abs(layout.identityRect!.x - expected.x) < 1 && Math.abs(layout.identityRect!.y - expected.y) < 1,
    `identity should sit exactly at its raw anchor (unyielding): got ${JSON.stringify(layout.identityRect)}, expected ~${JSON.stringify(expected)}`);

  const loc = layout.boxes.location!, views = layout.boxes.views!;
  for (const b of identityUnion) {
    assert.ok(!boxesOverlap(b, loc), "location must have yielded away from identity");
  }
  assert.ok(!boxesOverlap(loc, views) , "views must have yielded away from location too");
});

test("PFP outranks every block: dragging identity onto the pfp moves identity away, never the pfp", () => {
  const input = baseInput();
  const layout = computeBlockLayout(input, { identity: { x: input.pfp.anchorX, y: input.pfp.anchorY } });
  const expectedPfp = computeComposition(input).boxes.pfp;
  assert.deepEqual(layout.boxes.pfp, expectedPfp, "pfp must be completely unaffected by any block override");
});

test("a profile with no block anchors at all behaves identically to the pre-3B.3 engine (compatibility)", () => {
  const input = baseInput();
  const withUndefinedOverrides = computeBlockLayout(input, { identity: undefined, location: undefined, views: undefined });
  const withNoOverridesArg = computeBlockLayout(input);
  const plain = computeComposition(input);
  assert.deepEqual(withUndefinedOverrides.boxes, plain.boxes);
  assert.deepEqual(withNoOverridesArg.boxes, plain.boxes);
});

// ── Identity bounding-box fix: the box must track its own content, not the
// whole width it's allowed to use for wrapping. Root cause: resolveContentBlock
// gave bio's row an unconditional w=availWidth (needed for its wrap-height
// math), and identityRect is the union of every role's box — so any card with
// a bio (nearly all of them) got an identityRect as wide as the whole
// negotiated content column, regardless of how little of it the actual text
// used. Fix: bio's row now reports its own natural (single-line) ink width
// when it fits on one line, matching how name/handle/descriptor already
// worked, and only falls back to availWidth when it genuinely needs to wrap.

const shortIdentityContent = content({
  name: { present: true, length: 5 }, handle: { present: true, length: 6 }, bio: { present: true, length: 12 },
});
const longIdentityContent = content({
  name: { present: true, length: 30 }, handle: { present: true, length: 20 }, bio: { present: true, length: 220 },
});

test("identity: short content produces a small bounding box, not the whole available width", () => {
  const input = baseInput({ boxW: 400, boxH: 300, content: shortIdentityContent });
  const layout = computeBlockLayout(input);
  assert.ok(layout.identityRect, "identityRect should be present");
  assert.ok(layout.identityRect!.w < 150, `expected a tight box for short content, got w=${layout.identityRect!.w}`);
});

test("identity: long content (long name/handle and a long, wrapping bio) produces a wider bounding box than short content", () => {
  const shortLayout = computeBlockLayout(baseInput({ boxW: 400, boxH: 300, content: shortIdentityContent }));
  const longLayout  = computeBlockLayout(baseInput({ boxW: 400, boxH: 300, content: longIdentityContent }));
  assert.ok(longLayout.identityRect!.w > shortLayout.identityRect!.w,
    `long content should be wider: short=${shortLayout.identityRect!.w}, long=${longLayout.identityRect!.w}`);
});

test("identity: a bio long enough to wrap onto multiple lines gets a width/height consistent with its real line count, not a single-line assumption", () => {
  const input = baseInput({ boxW: 360, boxH: 300, content: longIdentityContent });
  const layout = computeBlockLayout(input);
  const bio = layout.boxes.bio!;
  assert.ok((bio.lines ?? 0) >= 2, `expected bio to wrap onto multiple lines, got lines=${bio.lines}`);
  const expectedH = (bio.lines ?? 0) * TYPO.bioFontSize * 1.5; // TEXT_METRICS.bioLineH
  assert.ok(Math.abs(bio.h - expectedH) < 0.5, `bio.h=${bio.h} should match lines*fontSize*lineHeight=${expectedH}`);
  assert.ok(bio.w > 100, "a wrapped multi-line bio should still use a generous wrap width, not shrink to a single-line ink estimate");
});

test("identity: bounding box width is identical across left/center/right text alignment (a short block stays tight regardless of alignment)", () => {
  const widths = (["left", "center", "right"] as const).map(textAlign =>
    computeBlockLayout(baseInput({ boxW: 400, boxH: 300, content: shortIdentityContent, textAlign })).identityRect!.w
  );
  assert.ok(widths.every(w => w < 150), `all should be tight: ${widths}`);
  assert.equal(widths[0], widths[1], "left vs center width mismatch");
  assert.equal(widths[1], widths[2], "center vs right width mismatch");
});

test("identity CAN move substantially horizontally inside a wide card when its content is short (the actual bug: a short identity's box used to be as wide as the whole available column, leaving ~0 room to move)", () => {
  const input = baseInput({
    boxW: 500, boxH: 260, padding: 20,
    pfp: { anchorX: 0, anchorY: 0, size: 60 },
    content: shortIdentityContent,
  });
  const layout = computeBlockLayout(input, { identity: { x: 1, y: 0.5 } }); // drag fully to the right
  const rect = layout.identityRect!;
  assert.ok(rect.w < 150, `expected a tight box, got w=${rect.w}`);
  assert.ok(rect.x + rect.w > input.boxW - 20 - 5, `identity should reach the right edge when dragged there: got x=${rect.x}, w=${rect.w}`);
  assert.ok(rect.x > input.boxW / 2, `identity should have moved well past the horizontal midline: got x=${rect.x}`);
});

test("identity with short content still respects card bounds at every extreme anchor", () => {
  const input = baseInput({ boxW: 400, boxH: 300, content: shortIdentityContent });
  for (const anchor of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]) {
    const layout = computeBlockLayout(input, { identity: anchor });
    const rect = layout.identityRect!;
    assert.ok(rect.x >= 20 - 0.5 && rect.y >= 20 - 0.5, `outside top-left at ${JSON.stringify(anchor)}: ${JSON.stringify(rect)}`);
    assert.ok(rect.x + rect.w <= input.boxW - 20 + 0.5 && rect.y + rect.h <= input.boxH - 20 + 0.5, `outside bottom-right at ${JSON.stringify(anchor)}: ${JSON.stringify(rect)}`);
  }
});

test("anti-overlap still keeps a (now correctly tight) short identity block clear of the pfp when dragged onto it", () => {
  const input = baseInput({ boxW: 400, boxH: 300, content: shortIdentityContent });
  const layout = computeBlockLayout(input, { identity: { x: input.pfp.anchorX, y: input.pfp.anchorY } });
  const pfp = layout.boxes.pfp!;
  for (const role of ["name", "handle", "bio"] as const) {
    const b = layout.boxes[role];
    if (b) assert.ok(!boxesOverlap(pfp, b), `${role} overlaps pfp: ${JSON.stringify(b)}`);
  }
});

test("identity anchored at the grid's center point still resolves its (now tight) box centered on the card", () => {
  const input = baseInput({
    boxW: 400, boxH: 300, padding: 20,
    pfp: { anchorX: 0.5, anchorY: 0.9, size: 60 },
    content: shortIdentityContent,
  });
  const layout = computeBlockLayout(input, { identity: { x: 0.5, y: 0.1 } });
  const rect = layout.identityRect!;
  const rectCenterX = rect.x + rect.w / 2;
  assert.ok(Math.abs(rectCenterX - input.boxW / 2) < 1, `expected the box centered on the card, got center=${rectCenterX}`);
});

test("location's bounding box remains driven purely by its own content length, unaffected by the bio fix", () => {
  const shortW = computeBlockLayout(baseInput({ content: fullContent({ location: { present: true, length: 4 }, bio: { present: false, length: 0 } }) })).boxes.location!.w;
  const longW  = computeBlockLayout(baseInput({ content: fullContent({ location: { present: true, length: 30 }, bio: { present: false, length: 0 } }) })).boxes.location!.w;
  assert.ok(longW > shortW, `location width should scale with its own content: short=${shortW}, long=${longW}`);
});

test("views' bounding box stays a small, fixed width regardless of available card width, unaffected by the bio fix", () => {
  const narrow = computeBlockLayout(baseInput({ boxW: 300, content: fullContent({ bio: { present: false, length: 0 } }) })).boxes.views!.w;
  const wide   = computeBlockLayout(baseInput({ boxW: 600, content: fullContent({ bio: { present: false, length: 0 } }) })).boxes.views!.w;
  assert.ok(narrow < 100 && wide < 100, `views should stay tight regardless of available width: narrow=${narrow}, wide=${wide}`);
});

test("PFP stays exactly as computeComposition placed it even with the corrected (tight) identity box overridden", () => {
  const input = baseInput({ content: shortIdentityContent });
  const base = computeComposition(input);
  const layout = computeBlockLayout(input, { identity: { x: 0.9, y: 0.9 } });
  assert.deepEqual(layout.boxes.pfp, base.boxes.pfp);
});

test("with no overrides, the corrected bio width still produces byte-identical output to computeComposition (automatic layout untouched)", () => {
  const input = baseInput({ content: shortIdentityContent });
  const base = computeComposition(input);
  const layout = computeBlockLayout(input);
  assert.deepEqual(layout.boxes, base.boxes);
});
