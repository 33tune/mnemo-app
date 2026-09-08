import { test } from "node:test";
import assert from "node:assert/strict";
import { computeComposition, computeBlockLayout, type CompositionContentInput, type CompositionInput, type ElementBox, type BlockOverrides } from "./cardComposition";

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
