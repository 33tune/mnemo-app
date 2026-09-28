import { test } from "node:test";
import assert from "node:assert/strict";
import { TYPOGRAPHY_METRICS, resolveTypographyMetrics, resolveCardTypography } from "./cardTypography";

test("resolveTypographyMetrics: no overrides matches TYPOGRAPHY_METRICS exactly", () => {
  const m = resolveTypographyMetrics({ nameFontSize: 15, bioFontSize: 8 });
  assert.equal(m.nameCharW, TYPOGRAPHY_METRICS.nameCharW);
  assert.equal(m.nameLineH, TYPOGRAPHY_METRICS.nameLineH);
  assert.equal(m.nameLetterSpacing, TYPOGRAPHY_METRICS.nameLetterSpacing);
  assert.equal(m.monoCharW, TYPOGRAPHY_METRICS.monoCharW);
  assert.equal(m.monoLineH, TYPOGRAPHY_METRICS.monoLineH);
  assert.equal(m.handleFontSize, TYPOGRAPHY_METRICS.monoFontSize);
  assert.equal(m.handleLetterSpacing, TYPOGRAPHY_METRICS.handleLetterSpacing);
  assert.equal(m.descriptorFontSize, TYPOGRAPHY_METRICS.monoFontSize);
  assert.equal(m.descriptorLetterSpacing, TYPOGRAPHY_METRICS.descriptorLetterSpacing);
  assert.equal(m.locationFontSize, TYPOGRAPHY_METRICS.locationFontSize);
  assert.equal(m.locationLetterSpacing, TYPOGRAPHY_METRICS.locationLetterSpacing);
  assert.equal(m.bioCharW, TYPOGRAPHY_METRICS.bioCharW);
  assert.equal(m.bioLineH, TYPOGRAPHY_METRICS.bioLineH);
  assert.equal(m.viewsFontSize, TYPOGRAPHY_METRICS.viewsFontSize);
  assert.equal(m.viewsWidthPx, TYPOGRAPHY_METRICS.viewsWidthPx);
});

test("resolveTypographyMetrics: explicit overrides win, everything else stays default", () => {
  const m = resolveTypographyMetrics({ nameFontSize: 15, bioFontSize: 8, handleFontSize: 12, locationLetterSpacing: 2 });
  assert.equal(m.handleFontSize, 12);
  assert.equal(m.locationLetterSpacing, 2);
  assert.equal(m.descriptorFontSize, TYPOGRAPHY_METRICS.monoFontSize); // untouched
});

test("resolveCardTypography: no card overrides matches ProfileCard.tsx's pre-existing hardcodes", () => {
  const t = resolveCardTypography({}, 15);
  assert.deepEqual(t.name, { fontSize: 15, letterSpacing: 0, lineHeight: 1.2, fontWeight: 700 });
  assert.equal(t.handle.fontSize, 9);
  assert.equal(t.handle.letterSpacing, 0.4);
  assert.equal(t.handle.lineHeight, undefined); // pre-existing render never set an explicit line-height for this role
  assert.equal(t.descriptor.fontSize, 9);
  assert.equal(t.descriptor.letterSpacing, 0.5);
  assert.equal(t.location.fontSize, 8);
  assert.equal(t.location.letterSpacing, 0.3);
  assert.deepEqual(t.bio, { fontSize: 8, lineHeight: 1.6 });
  assert.equal(t.views.fontSize, 9);
  assert.equal(t.views.letterSpacing, 1.5);
});

test("resolveCardTypography: overriding monoLineHeight applies it to all 4 mono roles", () => {
  const t = resolveCardTypography({ monoLineHeight: 1.6 }, 15);
  assert.equal(t.handle.lineHeight, 1.6);
  assert.equal(t.descriptor.lineHeight, 1.6);
  assert.equal(t.location.lineHeight, 1.6);
  assert.equal(t.views.lineHeight, 1.6);
});

test("resolveCardTypography: descriptor size reuses the existing statusFontSize field", () => {
  const t = resolveCardTypography({ statusFontSize: 11 }, 15);
  assert.equal(t.descriptor.fontSize, 11);
});

test("resolveCardTypography and resolveTypographyMetrics land on the same number once overridden (render/engine sync)", () => {
  const cardOverride = { statusFontSize: 13, nameLineHeight: 1.5 };
  const rendered = resolveCardTypography(cardOverride, 15);
  const measured = resolveTypographyMetrics({ nameFontSize: 15, bioFontSize: 8, descriptorFontSize: cardOverride.statusFontSize, nameLineHeight: cardOverride.nameLineHeight });
  assert.equal(rendered.descriptor.fontSize, measured.descriptorFontSize);
  assert.equal(rendered.name.lineHeight, measured.nameLineH);
});

test("resolveCardTypography and resolveTypographyMetrics deliberately differ by default (safety margin preserved)", () => {
  const rendered = resolveCardTypography({}, 15);
  const measured = resolveTypographyMetrics({ nameFontSize: 15, bioFontSize: 8 });
  assert.equal(rendered.name.lineHeight, 1.2);
  assert.equal(measured.nameLineH, 1.3);
  assert.notEqual(rendered.name.lineHeight, measured.nameLineH);
});
