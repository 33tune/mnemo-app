/**
 * "Apagar no borra" (Block 1 — editor redesign): pure pause/resume helpers
 * for CardEffects sub-objects.
 *
 * Before this, most effect toggles in the ProfileCard menus wrote
 * `undefined` on "off" — the user's whole configuration (colors, blur,
 * offsets, gradient stops...) was lost the moment they toggled it off to
 * compare. Now "off" MOVES the active sub-object into `effects.paused` at
 * the same path, and "on" moves it back.
 *
 * `effects.paused` is an editor-only stash: no renderer reads it.
 * getProfileCardEffects()/getModuleCardEffects() spread `...card.effects`,
 * so it does flow through into `effectiveEffects` — harmless, because
 * CardLayers.tsx, textEffects.ts, useCardInteractions.ts, useCardAnimations
 * and ProfileCard.tsx all read specific keys (`shadow`, `glow`, `text`,
 * `textRoles`, `pfp`, `gradient`, `interactions`...), never `paused`.
 *
 * Invariant: a config lives in EITHER the active tree OR `paused`, never
 * both. pause() removes it from active, resume() removes it from paused,
 * remove() deletes both. The one exception is pause()'s optional
 * `offValue` — an explicit "off" sentinel written to the active slot when
 * plain absence would NOT render as off (e.g. the PFP shadow, whose
 * absence falls back to a variant-derived default shadow on guns/poster).
 * That sentinel is not the user's config; resume() overwrites it.
 *
 * All functions are immutable: they return a new CardEffects and never
 * mutate their input. Empty parent objects left behind by a removal are
 * pruned (never the root), so pausing `text.shadow` when it was the only
 * text effect leaves no dangling `text: {}`.
 */
import type { CardEffects, TextRole } from "@/types";

export type EffectPath =
  | "shadow"
  | "glow"
  | "gradient"
  | "text.shadow"
  | "text.glow"
  | "text.stroke"
  | `textRoles.${TextRole}.gradient`
  | `textRoles.${TextRole}.shimmer`
  | `textRoles.${TextRole}.letterAnimation`
  | "pfp.shadow"
  | "pfp.glow"
  | "interactions.hoverScale";

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getAt(root: unknown, keys: string[]): unknown {
  let cur: unknown = root;
  for (const k of keys) {
    if (!isObj(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

/** Returns a copy of `root` with `keys` set to `value` (or deleted when
 * `value` is undefined), cloning every object along the path. Empty
 * intermediate objects are pruned after a delete. */
function setAt(root: Obj, keys: string[], value: unknown): Obj {
  const [head, ...rest] = keys;
  const next: Obj = { ...root };
  if (rest.length === 0) {
    if (value === undefined) delete next[head];
    else next[head] = value;
    return next;
  }
  const child = isObj(root[head]) ? (root[head] as Obj) : {};
  const updated = setAt(child, rest, value);
  if (Object.keys(updated).length === 0) delete next[head];
  else next[head] = updated;
  return next;
}

function split(path: EffectPath): string[] {
  return path.split(".");
}

/** The active value at `path` (what render sees), or undefined. */
export function getActive<T = unknown>(effects: CardEffects | undefined, path: EffectPath): T | undefined {
  return getAt(effects, split(path)) as T | undefined;
}

/** The paused value at `path` (editor-only stash), or undefined. */
export function getPaused<T = unknown>(effects: CardEffects | undefined, path: EffectPath): T | undefined {
  return getAt(effects?.paused, split(path)) as T | undefined;
}

function withPaused(effects: Obj, paused: Obj): CardEffects {
  const next: Obj = { ...effects };
  if (Object.keys(paused).length === 0) delete next.paused;
  else next.paused = paused;
  return next as CardEffects;
}

/**
 * Moves the active value at `path` into `effects.paused`. No active value
 * -> no-op on the stash (an older paused value, if any, is kept). When
 * `offValue` is given, it's written to the active slot instead of deleting
 * it (see the file header for when that's needed).
 */
export function pauseEffect(effects: CardEffects | undefined, path: EffectPath, offValue?: unknown): CardEffects {
  const keys = split(path);
  const root = (effects ?? {}) as Obj;
  const active = getAt(root, keys);
  const paused = isObj(root.paused) ? (root.paused as Obj) : {};
  const nextPaused = active !== undefined ? setAt(paused, keys, active) : paused;
  const nextActive = setAt(root, keys, offValue);
  return withPaused(nextActive, nextPaused);
}

/**
 * Moves the paused value at `path` back to the active tree. When nothing
 * is paused there, `fallback` (the control's current default) becomes the
 * active value instead (or the active value is kept as-is when no fallback
 * is given). Either way the paused slot ends up empty.
 */
export function resumeEffect(effects: CardEffects | undefined, path: EffectPath, fallback?: unknown): CardEffects {
  const keys = split(path);
  const root = (effects ?? {}) as Obj;
  const paused = isObj(root.paused) ? (root.paused as Obj) : {};
  const stashed = getAt(paused, keys);
  // Nothing stashed and no fallback -> keep whatever is active (never turn
  // a resume into a silent delete).
  const value = stashed !== undefined ? stashed : fallback !== undefined ? fallback : getAt(root, keys);
  const nextActive = setAt(root, keys, value);
  return withPaused(nextActive, setAt(paused, keys, undefined));
}

/** Deletes `path` from both the active tree and the paused stash. */
export function removeEffect(effects: CardEffects | undefined, path: EffectPath): CardEffects {
  const keys = split(path);
  const root = (effects ?? {}) as Obj;
  const paused = isObj(root.paused) ? (root.paused as Obj) : {};
  return withPaused(setAt(root, keys, undefined), setAt(paused, keys, undefined));
}

/** Toggle convenience: `on` -> resumeEffect(fallback), off -> pauseEffect. */
export function toggleEffect(
  effects: CardEffects | undefined, path: EffectPath, on: boolean,
  opts?: { fallback?: unknown; offValue?: unknown },
): CardEffects {
  return on
    ? resumeEffect(effects, path, opts?.fallback)
    : pauseEffect(effects, path, opts?.offValue);
}

/** Default intensity restored when a resumed effect would otherwise be
 * invisible (intensity 0/absent, e.g. data saved by the old "off" that
 * wrote intensity:0). */
export const RESUME_MIN_INTENSITY = 0.5;

/**
 * resumeEffect for intensity-driven effects (card/PFP shadow, text/PFP
 * glow): after restoring, an intensity that isn't > 0 is bumped to
 * RESUME_MIN_INTENSITY — otherwise "on" would restore an invisible effect.
 */
export function resumeWithIntensity(effects: CardEffects | undefined, path: EffectPath, fallback?: object): CardEffects {
  const next = resumeEffect(effects, path, fallback);
  const v = getActive<{ intensity?: number }>(next, path);
  if (v && (v.intensity ?? 0) > 0) return next;
  return setAt(next as Obj, split(path), { ...(v ?? {}), intensity: RESUME_MIN_INTENSITY }) as CardEffects;
}

/**
 * Shallow-merges `patch` into `base`, DELETING every key the patch sets to
 * undefined instead of storing an explicit undefined. Matters for "clear"
 * buttons over legacy fields: getProfileCardEffects spreads effects.* over
 * the legacy value, so an in-memory `{color: undefined}` masks the legacy
 * color for the session, then JSON drops the key and the legacy color
 * reappears after reload. Deleting the key behaves the same both times.
 */
export function mergePatch<T extends object>(base: T | undefined, patch: Partial<T>): T {
  const next = { ...(base ?? {}) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  return next as T;
}
