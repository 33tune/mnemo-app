/**
 * Menu redesign, Phase 1 (Cimientos) — the ONE effect state model shared by
 * every effect owner (ProfileCard, its PFP and text, and Music).
 *
 * Before this, the same switch semantics were wired four times
 * (ProfileEffectsMenu, MusicCardWidget, ProfileTypographyMenu,
 * ProfileIdentityMenu): read the effective value, write the raw one, pause
 * instead of delete, revive invisible intensities, write the O3 neutral
 * glow color on create. This module owns those rules; the menus (and the
 * Phase 4 effect tiles) only render a state and call setEnabled/patch.
 *
 * Separation (docs/ux/menu-redesign/implementation-plan.md, K):
 * - edit STATE ............ this file (EffectState, bindEffect);
 * - DEFAULTS ............... effectEditorDefaults.ts (display + "on" values);
 * - CAPABILITIES ........... editorCapabilities.ts (what each owner can edit,
 *                            and where in the UI — the coverage matrix);
 * - PRESENTATION ........... src/ui + the menus (never decide semantics).
 *
 * Contract (unchanged from Block 1 / Iteration 0, now in one place):
 * - Read effective, write raw: `state` derives from `owner.effective` (what
 *   renders, legacy fields merged); every write is built on `owner.raw`.
 * - "On" = visible, never mere presence (intensity > 0 where it applies).
 * - Off PAUSES (effectPause.ts) — the user's config survives; on resumes it.
 * - Glows created by the editor get the explicit neutral color (O3,
 *   neutralGlow.ts); a resumed/visible glow is never recolored.
 * - Pure: every function returns the next raw CardEffects and never mutates
 *   its input. The owner's `write` decides how to persist (updateProfile /
 *   update_profile for the card, setEffects / update_music for Music) — the
 *   seam Phase 6's style undo snapshots around.
 */
import type { CardEffects, ProfileCardVariant } from "@/types";
import {
  getActive, getPaused, pauseEffect, removeEffect, resumeEffect, resumeWithIntensity, mergePatch,
  type EffectPath,
} from "./effectPause";
import { withNeutralGlowOnCreate, neutralGlowPatch } from "./neutralGlow";
import {
  EFFECT_DISPLAY_DEFAULTS, EFFECT_ON_DEFAULTS, glowFlagPatch, isCardGlowFlagVisible, isIntensityEffectVisible,
  pfpShadowOn, pfpVariantShadowOn,
} from "./effectEditorDefaults";

// ── Owner ───────────────────────────────────────────────────────────────────

/** Which object owns an effects tree. Music keeps its own display defaults
 * (O4) — see EFFECT_DISPLAY_DEFAULTS[kind]. */
export type EffectOwnerKind = "profile" | "music";

export interface EffectOwner {
  kind: EffectOwnerKind;
  /** card.effects as stored — the base every write is built on. */
  raw: CardEffects | undefined;
  /** What renders: getProfileCardEffects(card) / getMusicCardEffects(card). */
  effective: CardEffects;
  /** Persists the next RAW effects tree. */
  write: (next: CardEffects) => void;
  /** Only the PFP shadow depends on it (variant default shadow). */
  variant?: ProfileCardVariant;
}

/** The display defaults an owner's controls show for absent fields — O4:
 * Music keeps its own (radius 10, tilt 5…), parity-tested. */
export function displayDefaultsFor(kind: EffectOwnerKind) {
  return kind === "music" ? EFFECT_DISPLAY_DEFAULTS.music : EFFECT_DISPLAY_DEFAULTS.card;
}

// ── State ───────────────────────────────────────────────────────────────────

/** on = visible now · paused = off with a stashed config that "on" brings
 * back · off = nothing to bring back (on starts from the "on" default). */
export type EffectStatus = "on" | "paused" | "off";

export interface EffectState {
  status: EffectStatus;
  /** The raw tree holds a value at this path (the user touched it). */
  modified: boolean;
}

/** Switch paths: the EffectPaths with on/off semantics. */
export type SwitchPath = EffectPath;

interface SwitchRule {
  /** Visible now (effective tree). */
  isOn: (effective: CardEffects, variant?: ProfileCardVariant) => boolean;
  /** Value written when switched on with nothing paused. */
  onDefault?: () => unknown;
  /** Resume through resumeWithIntensity (an intensity of 0 comes back
   * visible) instead of a plain resume. */
  intensity?: boolean;
  /** New glows get the O3 neutral color. */
  neutralGlow?: boolean;
}

function present(path: EffectPath) {
  return (e: CardEffects) => getActive(e, path) !== undefined;
}
function intensityVisible(path: EffectPath) {
  return (e: CardEffects) => isIntensityEffectVisible(getActive<{ intensity?: number }>(e, path));
}
/** Fresh copy so stored defaults are never shared by reference. */
function fresh<T>(v: T): T {
  return (typeof v === "object" && v !== null ? JSON.parse(JSON.stringify(v)) : v) as T;
}

function rule(path: EffectPath): SwitchRule {
  switch (path) {
    case "shadow":
    case "pfp.glow":
    case "text.glow":
      return {
        isOn: intensityVisible(path), intensity: true,
        neutralGlow: path !== "shadow",
      };
    case "pfp.shadow":
      return { isOn: (e, variant) => pfpShadowOn(variant, e.pfp?.shadow), intensity: true };
    case "glow":
      return { isOn: e => isCardGlowFlagVisible(e.glow, "outer") || isCardGlowFlagVisible(e.glow, "inner") };
    case "gradient":
      return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.gradient) };
    case "text.shadow":
      return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.textShadow) };
    case "text.stroke":
      return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.textStroke) };
    case "interactions.hoverScale":
      // Same "presence = on, 1 = no-op too" contract as useCardInteractions.
      return {
        isOn: e => e.interactions?.hoverScale != null && e.interactions.hoverScale !== 1,
        onDefault: () => EFFECT_ON_DEFAULTS.hoverScale,
      };
  }
  const key = path.split(".")[2];
  if (key === "gradient") return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.textGradient) };
  if (key === "shimmer") return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.textShimmer) };
  return { isOn: present(path), onDefault: () => fresh(EFFECT_ON_DEFAULTS.letterAnimation) };
}

/** State of a switchable effect. `effective` decides on/off (what renders);
 * `raw` decides paused/modified (what is stored). */
export function effectState(
  raw: CardEffects | undefined, effective: CardEffects, path: SwitchPath, variant?: ProfileCardVariant,
): EffectState {
  const on = rule(path).isOn(effective, variant);
  const modified = getActive(raw, path) !== undefined;
  if (on) return { status: "on", modified };
  return { status: getPaused(raw, path) !== undefined ? "paused" : "off", modified };
}

/**
 * Next raw effects after switching `path` on/off. Off pauses; on resumes
 * the stash (or writes the "on" default), reviving invisible intensities
 * and adding the O3 neutral color to NEW glows.
 *
 * PFP shadow special case: on guns/poster, ABSENCE renders the variant's
 * default shadow, so off leaves an explicit `{intensity: 0}` sentinel, and
 * on with nothing paused just removes the sentinel (the variant default
 * comes back exactly as it was).
 *
 * The card-level "glow" has no single switch (Exterior/Interior flags) —
 * use setGlowFlag.
 */
export function setEffectEnabled(
  raw: CardEffects | undefined, path: SwitchPath, on: boolean, variant?: ProfileCardVariant,
): CardEffects {
  if (path === "glow") throw new Error('setEffectEnabled: use setGlowFlag for the card glow ("glow")');
  const r = rule(path);
  if (path === "pfp.shadow") {
    const variantDefault = pfpVariantShadowOn(variant);
    if (!on) return pauseEffect(raw, path, variantDefault ? { intensity: 0 } : undefined);
    if (getPaused(raw, path) === undefined && variantDefault) return removeEffect(raw, path);
    return resumeWithIntensity(raw, path);
  }
  if (!on) return pauseEffect(raw, path);
  const resumed = r.intensity
    ? resumeWithIntensity(raw, path, r.onDefault?.() as object | undefined)
    : resumeEffect(raw, path, r.onDefault?.());
  return r.neutralGlow ? withNeutralGlowOnCreate(raw, path, resumed) : resumed;
}

/** Card / Music glow flag (Exterior/Interior): glowFlagPatch + the O3
 * neutral color when turning on. */
export function setGlowFlag(
  raw: CardEffects | undefined, effective: CardEffects, flag: "outer" | "inner", on: boolean,
): CardEffects {
  return patchEffectGroup(raw, "glow", { ...glowFlagPatch(effective.glow, flag, on), ...(on ? neutralGlowPatch(effective) : {}) });
}

/** Hover glow (interactions.hoverGlow) — reuses the card glow's color, so
 * turning it on with no color anywhere writes the O3 neutral. */
export function setHoverGlow(raw: CardEffects | undefined, effective: CardEffects, on: boolean): CardEffects {
  const colorPatch = on ? neutralGlowPatch(effective) : {};
  return {
    ...raw,
    interactions: mergePatch(raw?.interactions, { hoverGlow: on }),
    ...(colorPatch.color ? { glow: mergePatch(raw?.glow, colorPatch) } : {}),
  };
}

// ── Patches ─────────────────────────────────────────────────────────────────

/** Groups edited field-by-field with "clear deletes the key" semantics. */
export type PatchGroup = "bg" | "border" | "glow" | "shadow" | "interactions" | "animations";

/**
 * Shallow-patches one group of the RAW tree with mergePatch: a field set to
 * undefined is DELETED (reset/clear), so a legacy value underneath shows the
 * same before and after reload (see effectPause.ts's mergePatch).
 */
export function patchEffectGroup<G extends PatchGroup>(
  raw: CardEffects | undefined, group: G, patch: Partial<NonNullable<CardEffects[G]>>,
): CardEffects {
  return { ...raw, [group]: mergePatch(raw?.[group] as NonNullable<CardEffects[G]> | undefined, patch) };
}

// ── Binding ─────────────────────────────────────────────────────────────────

export interface EffectBinding<V = unknown> {
  path: SwitchPath;
  state: EffectState;
  /** The effective (rendered) value at `path`, if any. */
  value: V | undefined;
  setEnabled: (on: boolean) => void;
  /** Deletes the effect AND its paused stash ("Quitar"). */
  remove: () => void;
}

/** Binds one switchable effect of an owner: state from effective/raw,
 * writes through owner.write. */
export function bindEffect<V = unknown>(owner: EffectOwner, path: SwitchPath): EffectBinding<V> {
  return {
    path,
    state: effectState(owner.raw, owner.effective, path, owner.variant),
    value: getActive<V>(owner.effective, path),
    setEnabled: on => owner.write(setEffectEnabled(owner.raw, path, on, owner.variant)),
    remove: () => owner.write(removeEffect(owner.raw, path)),
  };
}

/** Owner-bound shortcuts for the non-path switches and group patches —
 * what a menu (or a Phase 4 tile) needs besides bindEffect. */
export function effectActions(owner: EffectOwner) {
  return {
    patch: <G extends PatchGroup>(group: G, patch: Partial<NonNullable<CardEffects[G]>>) =>
      owner.write(patchEffectGroup(owner.raw, group, patch)),
    setGlowFlag: (flag: "outer" | "inner", on: boolean) =>
      owner.write(setGlowFlag(owner.raw, owner.effective, flag, on)),
    setHoverGlow: (on: boolean) => owner.write(setHoverGlow(owner.raw, owner.effective, on)),
    setEnabled: (path: SwitchPath, on: boolean) =>
      owner.write(setEffectEnabled(owner.raw, path, on, owner.variant)),
  };
}
