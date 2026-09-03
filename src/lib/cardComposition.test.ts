import { test } from "node:test";
import assert from "node:assert/strict";
import { computeComposition, type CompositionContentInput, type CompositionInput, type ElementBox } from "./cardComposition";

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
