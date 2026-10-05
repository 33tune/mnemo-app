/**
 * Block 2 (editor UI): pure numeric helpers for SliderRow's click-to-edit
 * value. A slider's stored value can differ from what its label shows
 * (`fmt={v => `${Math.round(v * 100)}%`}` on a 0-1 opacity); the editable
 * field works in the DISPLAYED unit so typing "50" on an opacity means 50%,
 * not 50.0 clamped to 1.
 */

/** Number of decimals a step implies (0.01 -> 2, 0.5 -> 1, 1 -> 0). */
export function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = String(step);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Clamp to [min, max] and snap to the step grid anchored at `min`
 * (same grid a native <input type=range> uses). */
export function clampToStep(value: number, min: number, max: number, step = 1): number {
  if (!Number.isFinite(value)) return min;
  const lo = Math.min(min, max), hi = Math.max(min, max);
  let v = Math.min(hi, Math.max(lo, value));
  if (step > 0) {
    v = lo + Math.round((v - lo) / step) * step;
    if (v > hi + 1e-9) v -= step; // epsilon: float bounds (1.15 - 1 = 0.1499…) must not drop a step
    v = Math.min(hi, Math.max(lo, v));
  }
  return Number(v.toFixed(Math.max(stepDecimals(step), 0)));
}

/** First number found in a display string ("45%" -> 45, "-3px" -> -3,
 * "1.5x" -> 1.5, "normal" -> null). Accepts a comma decimal separator. */
export function leadingNumber(text: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(text);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * The factor between a slider's stored value and its displayed number,
 * inferred from its `fmt` — only the clean scales actually used across the
 * menus (1, 100 for percentages, 1000 for seconds shown as ms). Anything
 * else (offset formulas like `(v - 1) * 100`, non-numeric labels) falls
 * back to 1 = edit the raw value, which is always correct, just less
 * friendly.
 */
export function inferDisplayScale(fmt: ((v: number) => string) | undefined, min: number, max: number): number {
  if (!fmt) return 1;
  const samples = [max, (min + max) / 2].filter(v => v !== 0);
  let found: number | null = null;
  for (const scale of [1, 100, 1000]) {
    const ok = samples.every(v => {
      const shown = leadingNumber(fmt(v));
      if (shown === null) return false;
      return Math.abs(shown - v * scale) <= Math.max(1, Math.abs(v * scale) * 0.02);
    });
    if (ok) { found = scale; break; }
  }
  return found ?? 1;
}

/**
 * Parses what a person typed into the value field. `scale` is the display
 * factor (see inferDisplayScale). Returns null when nothing numeric was
 * typed (caller cancels the edit), else the stored value clamped and
 * snapped to the slider's own range/step.
 */
export function parseNumericInput(text: string, opts: { min: number; max: number; step?: number; scale?: number }): number | null {
  const n = leadingNumber(text);
  if (n === null) return null;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  return clampToStep(n / scale, opts.min, opts.max, opts.step ?? 1);
}

/** The text the edit field starts with: the stored value in display units,
 * without float noise (0.45 * 100 -> "45", not "45.00000000000001"). */
export function formatEditValue(value: number, step = 1, scale = 1): string {
  const decimals = Math.max(0, stepDecimals(step) - Math.round(Math.log10(scale || 1)));
  return String(Number((value * scale).toFixed(decimals)));
}

// ── Iteration 0: shared numeric commit (SliderRow + NumberField) ────────────

export interface NumericFieldSpec {
  min: number; max: number; step?: number;
  /** displayed = (stored + offset) * scale (see SliderRow's displayScale). */
  scale: number; offset?: number;
}

/**
 * The click-to-edit commit of SliderRow (and NumberField): `null` = emit
 * nothing — the text is unchanged since the field opened (blur/Enter
 * without typing never snaps or writes), it doesn't parse, or the parsed
 * value equals the current one. Otherwise the stored value, clamped and
 * snapped to min/max/step in the (offset-)shifted space.
 */
export function commitSliderDraft(draft: string, initial: string | null, spec: NumericFieldSpec, current: number): number | null {
  if (draft.trim() === initial) return null;
  const offset = spec.offset ?? 0;
  const step = spec.step ?? 1;
  const parsed = parseNumericInput(draft, { min: +(spec.min + offset).toFixed(10), max: +(spec.max + offset).toFixed(10), step, scale: spec.scale });
  if (parsed === null) return null;
  const next = +(parsed - offset).toFixed(10);
  return next === current ? null : next;
}

/**
 * Double-click on a slider track. Same semantics as the modified-dot reset:
 * when the field has a stored (raw) value with a reset, the raw key is
 * deleted ("reset"); otherwise, a plain `defaultValue` is written
 * ("default"); otherwise nothing.
 */
export function resolveSliderDoubleClick(opts: { state?: "modified" | "inherited"; hasReset: boolean; defaultValue?: number }): "reset" | "default" | null {
  if (opts.state === "modified" && opts.hasReset) return "reset";
  if (opts.defaultValue !== undefined) return "default";
  return null;
}

/** Iteration 0: switch-gated effect intensities (shadow/glow of card, PFP,
 * text, Music) never go to 0 while the effect is "on" — at 0 the effect is
 * invisible but the switch would still read "on" (or, for the card shadow,
 * whose on-state is derived from the intensity, the slider would unmount
 * under the pointer). Turning it off is the switch's job. */
export const EFFECT_INTENSITY_MIN = 0.01;

/** Did the commit clamp what was typed? (NumberField announces it.) */
export function wasClamped(draft: string, committed: number, spec: NumericFieldSpec): boolean {
  const n = leadingNumber(draft);
  if (n === null) return false;
  const typed = n / (spec.scale || 1) - (spec.offset ?? 0);
  return Math.abs(typed - committed) > 1e-9 && (committed === spec.min || committed === spec.max);
}

/**
 * Review r2 (Critic-3): NumberField commit with a moving baseline. The
 * "unchanged since focus" rule must be measured against the LAST COMMITTED
 * text, not the text at focus — otherwise 300 → type 350 + Enter → type 300
 * + Enter (without leaving the field) is ignored. Returns the value to emit
 * (or null) and the baseline for the next edit.
 */
export function numberFieldCommit(
  draft: string, baseline: string | null, spec: NumericFieldSpec, current: number,
): { value: number | null; baseline: string | null } {
  const value = commitSliderDraft(draft, baseline, spec, current);
  if (value === null) return { value: null, baseline };
  return { value, baseline: formatEditValue(value + (spec.offset ?? 0), spec.step ?? 1, spec.scale) };
}
