/**
 * Pure display/logic helpers for the Music player (Stage 4.2-C.2). No React,
 * no DOM, no <audio> — just the small, independently testable pieces of the
 * player's logic, kept out of ProfileMusicPlayer.tsx so they can be unit
 * tested without a DOM harness (this repo has none — real playback/<audio>
 * events are verified by manual QA, same precedent as drag interactions in
 * cardComposition.test.ts).
 */

/** Clamps a volume value into the valid [0,1] range; nullish/NaN -> 1 (full
 * volume), matching <audio>'s own default. */
export function clampVolume(v: number | undefined): number {
  if (v == null || Number.isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
}

/** The volume actually applied to <audio>: muted always wins regardless of
 * the slider's own value — the slider stays at its position while muted
 * (same behavior every native media player uses), so un-muting restores it
 * exactly. */
export function effectiveVolume(volume: number, muted: boolean): number {
  return muted ? 0 : clampVolume(volume);
}

/**
 * Formats a duration in seconds as "m:ss" (or "h:mm:ss" past one hour).
 * Non-finite/negative input (NaN before <audio> metadata loads, Infinity for
 * some streamed sources) safely renders as "0:00" rather than showing NaN or
 * throwing.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

// ── Iteration 0 — O2: "Tamaño" and "Fuente" of the Music element ──────────

/** The menu's "Tamaño" value that reproduces today's exact player text
 * (title 10px, artist/times 8px, error 7px). Also what an unset value means. */
export const MUSIC_TEXT_SIZE_DEFAULT = 8;
export const MUSIC_DEFAULT_TITLE_FONT = "'DM Sans', sans-serif";
export const MUSIC_DEFAULT_META_FONT = "'Space Mono', monospace";

export interface MusicPlayerText {
  titleSize: number; artistSize: number; timeSize: number; errorSize: number;
  titleFont: string; artistFont: string; timeFont: string;
}

/**
 * Player text sizes/fonts from the element's stored `textSize`/`font`.
 * - Size: one scale k = textSize/8 applied to the whole hierarchy (title
 *   10·k, artist and times 8·k, error 7·k, rounded to 0.5px). No stored
 *   value (or 8) → exactly today's px, so no existing Music changes.
 * - Font (a resolved CSS font-family, or undefined): applies to title and
 *   artist. Times and the error stay Space Mono (tabular numbers). No font
 *   → today's DM Sans (title) / Space Mono (artist).
 */
export function resolveMusicPlayerText(textSize: number | undefined, fontFamily: string | undefined): MusicPlayerText {
  const size = textSize != null && Number.isFinite(textSize) && textSize > 0 ? textSize : MUSIC_TEXT_SIZE_DEFAULT;
  const k = size / MUSIC_TEXT_SIZE_DEFAULT;
  const r = (n: number) => Math.round(n * k * 2) / 2;
  return {
    titleSize: r(10), artistSize: r(8), timeSize: r(8), errorSize: r(7),
    titleFont: fontFamily ?? MUSIC_DEFAULT_TITLE_FONT,
    artistFont: fontFamily ?? MUSIC_DEFAULT_META_FONT,
    timeFont: MUSIC_DEFAULT_META_FONT,
  };
}
