/**
 * Pure sizing for the Music internal block (Stage 4.2-C.1 infrastructure,
 * height finalized against the real player in Stage 4.2-C.2, redesigned
 * minimalist in Stage 4.2-C.2.2, width made user-controlled in Stage
 * 4.2-C.2.3 — see CLAUDE.md's Etapa 4 roadmap). No React, no DOM: just "how
 * much room does the Music block need", so computeRequiredCardHeight()
 * (cardGeometry.ts) and computeBlockLayout()'s music extension
 * (cardComposition.ts) have a natural size to work with. Same
 * architectural family as linksBlockSizing.ts.
 *
 * Stage 4.2-C.2.3: width is no longer content-driven (it used to depend on
 * whether a title/artist line was present) — it's a real, user-chosen
 * value (`card.musicWidth`, set via a slider in ProfileMusicMenu.tsx), the
 * ONLY thing the user can resize about this block. Height stays a fixed
 * constant regardless of width, by design — Music must only ever grow/
 * shrink horizontally.
 */

/** Floor so play/seek/volume controls always fit, regardless of what the
 * user drags the width slider down to. */
export const MUSIC_BLOCK_WIDTH_MIN = 120;
/** Starting width for a card that has never had `musicWidth` set (e.g.
 * right after enabling Music for the first time). */
export const MUSIC_BLOCK_WIDTH_DEFAULT = 180;
/** Fixed height matching ProfileMusicPlayer.tsx's compact 2-row layout
 * (controls+text row, seek row) — kept here, not measured from the DOM,
 * for the same reason every other block's natural size in this system is
 * computed rather than measured (see cardComposition.ts's file header on
 * heuristic sizing). Volume lives behind a toggle (progressive disclosure)
 * so it never adds to the reserved height. Never varies with width. */
export const MUSIC_BLOCK_HEIGHT = 56;
/** Gap between the Music block and whatever sits above it (Links, or the
 * base content if Links is absent) — same contract as CONTACT_LINK_GAP. */
export const MUSIC_BLOCK_GAP = 10;

export interface MusicNaturalSizeInput {
  /** Width available to the block, px — a ceiling, never exceeded. */
  availableWidth: number;
  /** User-chosen width (`card.musicWidth`). Undefined -> MUSIC_BLOCK_WIDTH_DEFAULT. */
  width?: number;
}

export interface NaturalSize {
  width: number;
  height: number;
}

/** User-controlled width, clamped to [MUSIC_BLOCK_WIDTH_MIN, availableWidth]
 * — never content-driven anymore (see the file header). When
 * `availableWidth` itself is below MUSIC_BLOCK_WIDTH_MIN, the available
 * space wins (same "never claim more room than the card actually has"
 * contract every other block in this system already follows — e.g.
 * computeLinksNaturalSize). Height is always MUSIC_BLOCK_HEIGHT, entirely
 * independent of width. */
export function computeMusicNaturalSize(input: MusicNaturalSizeInput): NaturalSize {
  const availableWidth = Math.max(0, input.availableWidth);
  const target = input.width ?? MUSIC_BLOCK_WIDTH_DEFAULT;
  const width = Math.min(Math.max(MUSIC_BLOCK_WIDTH_MIN, target), availableWidth);
  return { width, height: MUSIC_BLOCK_HEIGHT };
}
