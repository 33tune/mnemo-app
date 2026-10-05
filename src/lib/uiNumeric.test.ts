import { test } from "node:test";
import assert from "node:assert/strict";
import { stepDecimals, clampToStep, leadingNumber, inferDisplayScale, parseNumericInput, formatEditValue } from "./uiNumeric";

test("stepDecimals", () => {
  assert.equal(stepDecimals(1), 0);
  assert.equal(stepDecimals(0.5), 1);
  assert.equal(stepDecimals(0.01), 2);
  assert.equal(stepDecimals(0.05), 2);
  assert.equal(stepDecimals(1e-7), 7);
});

test("clampToStep: clamps and snaps to the grid anchored at min", () => {
  assert.equal(clampToStep(150, 0, 100, 1), 100);
  assert.equal(clampToStep(-5, 0, 100, 1), 0);
  assert.equal(clampToStep(0.456, 0, 1, 0.01), 0.46);
  assert.equal(clampToStep(2.26, 0, 6, 0.5), 2.5);
  assert.equal(clampToStep(1.07, 0.3, 3, 0.1), 1.1);
  assert.equal(clampToStep(7, 5, 360, 5), 5);
  assert.equal(clampToStep(NaN, 2, 10, 1), 2);
});

test("leadingNumber", () => {
  assert.equal(leadingNumber("45%"), 45);
  assert.equal(leadingNumber("-3px"), -3);
  assert.equal(leadingNumber("1,5x"), 1.5);
  assert.equal(leadingNumber("normal"), null);
});

test("inferDisplayScale: percent, ms, plain, and non-linear fallbacks", () => {
  assert.equal(inferDisplayScale(v => `${Math.round(v * 100)}%`, 0, 1), 100);
  assert.equal(inferDisplayScale(v => `${Math.round(v * 1000)}ms`, 0, 0.2), 1000);
  assert.equal(inferDisplayScale(v => `${v}°`, 0, 360), 1);
  assert.equal(inferDisplayScale(v => `${v.toFixed(1)}x`, 0.3, 3), 1);
  assert.equal(inferDisplayScale(undefined, 0, 10), 1);
  // hover scale: (v - 1) * 100 is not a clean factor -> edit raw
  assert.equal(inferDisplayScale(v => `${Math.round((v - 1) * 100)}%`, 1.01, 1.15), 1);
  assert.equal(inferDisplayScale(() => "normal", 0.9, 2), 1);
});

test("parseNumericInput: display units, clamped, snapped", () => {
  assert.equal(parseNumericInput("50", { min: 0, max: 1, step: 0.01, scale: 100 }), 0.5);
  assert.equal(parseNumericInput("50%", { min: 0, max: 1, step: 0.01, scale: 100 }), 0.5);
  assert.equal(parseNumericInput("250", { min: 0, max: 1, step: 0.01, scale: 100 }), 1);
  assert.equal(parseNumericInput("12px", { min: 0, max: 40, step: 1 }), 12);
  assert.equal(parseNumericInput("abc", { min: 0, max: 40, step: 1 }), null);
  assert.equal(parseNumericInput("-90", { min: -180, max: 180, step: 1 }), -90);
});

test("formatEditValue: no float noise", () => {
  assert.equal(formatEditValue(0.45, 0.01, 100), "45");
  assert.equal(formatEditValue(0.07, 0.01, 1000), "70");
  assert.equal(formatEditValue(1.5, 0.1, 1), "1.5");
  assert.equal(formatEditValue(12, 1, 1), "12");
});

test("Block 2 review (UX-5): offset display mapping used by SliderRow displayOffset — hover scale 1.01..1.15 shown as (v-1)*100", () => {
  // SliderRow parses in the shifted space [min+offset, max+offset] and adds the offset back.
  const offset = -1;
  assert.equal(formatEditValue(1.05 + offset, 0.01, 100), "5");
  const parsed = parseNumericInput("8", { min: 1.01 + offset, max: 1.15 + offset, step: 0.01, scale: 100 });
  assert.equal(parsed, 0.08);
  assert.equal(+((parsed as number) - offset).toFixed(10), 1.08);
  // Out of range clamps to the stored max.
  const big = parseNumericInput("80", { min: 1.01 + offset, max: 1.15 + offset, step: 0.01, scale: 100 });
  assert.equal(+((big as number) - offset).toFixed(10), 1.15);
});

// ── Iteration 0: shared commit (SliderRow + NumberField) ────────────────────
import { commitSliderDraft, resolveSliderDoubleClick, wasClamped, EFFECT_INTENSITY_MIN } from "./uiNumeric";

test("commitSliderDraft: hover scale typed '8' commits 1.08 through the REAL path (offset -1, scale 100)", () => {
  const spec = { min: 1.01, max: 1.15, step: 0.01, scale: 100, offset: -1 };
  assert.equal(commitSliderDraft("8", "5", spec, 1.05), 1.08);
  assert.equal(commitSliderDraft("80", "5", spec, 1.05), 1.15, "clamped to max");
});

test("commitSliderDraft: unchanged text, unparseable, or same value -> null (never writes)", () => {
  const spec = { min: 0, max: 1, step: 0.01, scale: 100 };
  assert.equal(commitSliderDraft("45", "45", spec, 0.45), null);
  assert.equal(commitSliderDraft(" 45 ", "45", spec, 0.45), null);
  assert.equal(commitSliderDraft("abc", "45", spec, 0.45), null);
  assert.equal(commitSliderDraft("45.0", "45", spec, 0.45), null, "parses to the current value");
  assert.equal(commitSliderDraft("50", "45", spec, 0.45), 0.5);
});

test("resolveSliderDoubleClick: modified + reset deletes the raw key, else defaultValue, else nothing", () => {
  assert.equal(resolveSliderDoubleClick({ state: "modified", hasReset: true, defaultValue: 3 }), "reset");
  assert.equal(resolveSliderDoubleClick({ state: "modified", hasReset: false, defaultValue: 3 }), "default");
  assert.equal(resolveSliderDoubleClick({ hasReset: true, defaultValue: 0 }), "default");
  assert.equal(resolveSliderDoubleClick({ state: "inherited", hasReset: true }), null);
  assert.equal(resolveSliderDoubleClick({ hasReset: false }), null);
});

test("wasClamped: only when the typed number differs AND the result is a bound", () => {
  const spec = { min: 240, max: 1200, step: 1, scale: 1 };
  assert.equal(wasClamped("100", 240, spec), true);
  assert.equal(wasClamped("5000", 1200, spec), true);
  assert.equal(wasClamped("300", 300, spec), false);
});

test("EFFECT_INTENSITY_MIN keeps switch-gated effects visible (> 0)", () => {
  assert.ok(EFFECT_INTENSITY_MIN > 0 && EFFECT_INTENSITY_MIN <= 0.01);
});

// ── Review r2 (Critic-3): NumberField moving baseline ───────────────────────
import { numberFieldCommit } from "./uiNumeric";

test("numberFieldCommit: 300 -> 350 + Enter -> 300 + Enter (same focus) applies both times", () => {
  const spec = { min: 240, max: 1200, step: 1, scale: 1 };
  const first = numberFieldCommit("350", "300", spec, 300);
  assert.equal(first.value, 350);
  assert.equal(first.baseline, "350");
  const second = numberFieldCommit("300", first.baseline, spec, 350);
  assert.equal(second.value, 300, "typing the original value back must apply");
  const noop = numberFieldCommit("300", second.baseline, spec, 300);
  assert.equal(noop.value, null, "unchanged since the last commit never writes");
  assert.equal(noop.baseline, "300");
});
