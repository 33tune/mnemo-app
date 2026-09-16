import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactLinksNaturalSize, requiredCardHeightForContactLinks, composedContentBottom,
  CONTACT_LINK_ICON_SIZE, CONTACT_LINK_GAP,
} from "./contactLinksBlock";
import { getCardConstraints } from "./cardGeometry";
import type { ElementBox } from "./cardComposition";

// ── Data: 0 / 1 / many links (Stage 4.2-B §11 "Data") ────────────────────────

test("contactLinksNaturalSize: no links claims no room (ProfileCard without Contact Links)", () => {
  assert.deepEqual(contactLinksNaturalSize(0, 300), { width: 0, height: 0 });
});

test("contactLinksNaturalSize: one link sizes to exactly one icon", () => {
  assert.deepEqual(contactLinksNaturalSize(1, 300), { width: CONTACT_LINK_ICON_SIZE, height: CONTACT_LINK_ICON_SIZE });
});

test("contactLinksNaturalSize: several links wrap once availableWidth runs out", () => {
  const perRow = 3;
  const availableWidth = perRow * CONTACT_LINK_ICON_SIZE + (perRow - 1) * CONTACT_LINK_GAP;
  const size = contactLinksNaturalSize(perRow + 1, availableWidth);
  assert.equal(size.height, 2 * CONTACT_LINK_ICON_SIZE + CONTACT_LINK_GAP, "a 4th link should wrap to a second row");
});

test("contactLinksNaturalSize: removing a link (count decreasing) never grows the block", () => {
  const availableWidth = 400;
  const five = contactLinksNaturalSize(5, availableWidth);
  const four = contactLinksNaturalSize(4, availableWidth);
  assert.ok(four.height <= five.height);
  assert.ok(four.width <= five.width || four.height < five.height);
});

// ── Growth (Stage 4.2-B §8 / §11 "Growth") ────────────────────────────────────

test("requiredCardHeightForContactLinks: no links -> currentH unchanged exactly (no growth)", () => {
  const h = requiredCardHeightForContactLinks({
    format: "vertical", currentH: 220, contentBottom: 180, padding: 20, count: 0, availableWidth: 300,
  });
  assert.equal(h, 220);
});

test("requiredCardHeightForContactLinks: grows the card when Contact Links needs more room than currentH allows", () => {
  const c = getCardConstraints("vertical");
  const currentH = c.minH + 5;
  const h = requiredCardHeightForContactLinks({
    format: "vertical", currentH, contentBottom: currentH - 20, padding: 20, count: 6, availableWidth: 120,
  });
  assert.ok(h > currentH, `expected growth: ${h} should exceed ${currentH}`);
});

test("requiredCardHeightForContactLinks: never exceeds the format's maxH", () => {
  for (const format of ["vertical", "horizontal", "square", "phone", "card"] as const) {
    const c = getCardConstraints(format);
    const h = requiredCardHeightForContactLinks({
      format, currentH: c.minH, contentBottom: c.minH, padding: 20, count: 12, availableWidth: 40,
    });
    assert.ok(h <= c.maxH, `${format}: ${h} exceeds maxH ${c.maxH}`);
  }
});

test("requiredCardHeightForContactLinks: never goes below the format's minH", () => {
  for (const format of ["vertical", "horizontal", "square", "phone", "card"] as const) {
    const c = getCardConstraints(format);
    const h = requiredCardHeightForContactLinks({
      format, currentH: c.minH, contentBottom: 0, padding: 0, count: 1, availableWidth: 300,
    });
    assert.ok(h >= c.minH, `${format}: ${h} below minH ${c.minH}`);
  }
});

test("requiredCardHeightForContactLinks: only ever returns a height number — never repositions y", () => {
  const h = requiredCardHeightForContactLinks({
    format: "vertical", currentH: 200, contentBottom: 150, padding: 20, count: 3, availableWidth: 200,
  });
  assert.equal(typeof h, "number");
});

test("requiredCardHeightForContactLinks: repeated calls with unchanged inputs converge (no drift)", () => {
  const input = { format: "card" as const, currentH: 200, contentBottom: 150, padding: 20, count: 4, availableWidth: 150 };
  const first = requiredCardHeightForContactLinks(input);
  const second = requiredCardHeightForContactLinks({ ...input, currentH: first });
  assert.equal(second, first);
});

// ── composedContentBottom (feeds the growth effect's `contentBottom`) ────────

test("composedContentBottom: 0 when nothing is present", () => {
  assert.equal(composedContentBottom({}, undefined), 0);
});

test("composedContentBottom: the lowest bottom edge among pfp/identity/location/views wins", () => {
  const pfp: ElementBox = { x: 10, y: 10, w: 60, h: 60 };
  const identity: ElementBox = { x: 10, y: 80, w: 100, h: 40 };
  const location: ElementBox = { x: 10, y: 60, w: 100, h: 10 };
  const views: ElementBox = { x: 10, y: 130, w: 80, h: 12 };
  const bottom = composedContentBottom({ pfp, location, views }, identity);
  assert.equal(bottom, views.y + views.h);
});

test("composedContentBottom ignores boxes.links itself (it's the block being sized, not existing content)", () => {
  const pfp: ElementBox = { x: 10, y: 10, w: 60, h: 60 };
  const links: ElementBox = { x: 10, y: 500, w: 100, h: 40 };
  const bottom = composedContentBottom({ pfp, links }, undefined);
  assert.equal(bottom, pfp.y + pfp.h);
});
