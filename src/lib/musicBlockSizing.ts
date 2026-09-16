/**
 * Pure sizing for the Music internal block (Stage 4.2-C.1 infrastructure,
 * height finalized against the real player in Stage 4.2-C.2 — see
 * CLAUDE.md's Etapa 4 roadmap). No React, no DOM: just "how much room does
 * the Music block need", so computeRequiredCardHeight() (cardGeometry.ts)
 * and computeBlockLayout()'s music extension (cardComposition.ts) have a
 * natural size to work with. Same architectural family as linksBlockSizing.ts.
 *
 * Unlike Links (whose natural size depends on how many icons there are),
 * Music is a single fixed-shape column (artwork+title/artist+play row, seek
 * row, volume row — see ProfileMusicPlayer.tsx) — its natural size doesn't
 * take a `count`, just how much width it has to work with.
 */

/** Fixed height matching ProfileMusicPlayer.tsx's actual layout (3 stacked
 * rows + padding) — kept here, not measured from the DOM, for the same
 * reason every other block's natural size in this system is computed rather
 * than measured (see cardComposition.ts's file header on heuristic sizing). */
export const MUSIC_BLOCK_HEIGHT = 100;
/** Gap between the Music block and whatever sits above it (Links, or the
 * base content if Links is absent) — same contract as CONTACT_LINK_GAP. */
export const MUSIC_BLOCK_GAP = 10;

export interface MusicNaturalSizeInput {
  /** Width available to the block, px. */
  availableWidth: number;
}

export interface NaturalSize {
  width: number;
  height: number;
}

/** Spans the full available width (a horizontal player bar), fixed height —
 * see the file header for MUSIC_BLOCK_HEIGHT's source of truth. */
export function computeMusicNaturalSize(input: MusicNaturalSizeInput): NaturalSize {
  return { width: Math.max(0, input.availableWidth), height: MUSIC_BLOCK_HEIGHT };
}
