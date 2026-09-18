/**
 * Pure sizing for the Music internal block (Stage 4.2-C.1 infrastructure,
 * height finalized against the real player in Stage 4.2-C.2, redesigned
 * minimalist in Stage 4.2-C.2.2 — see CLAUDE.md's Etapa 4 roadmap). No
 * React, no DOM: just "how much room does the Music block need", so
 * computeRequiredCardHeight() (cardGeometry.ts) and computeBlockLayout()'s
 * music extension (cardComposition.ts) have a natural size to work with.
 * Same architectural family as linksBlockSizing.ts.
 *
 * Stage 4.2-C.2.2: Music stopped claiming the card's entire available width
 * (the original design — see git history) because a full-width, tall block
 * read as "a card inside the card" and left little room to escape the
 * anti-overlap system when the card hadn't grown yet (see CLAUDE.md's Music
 * redesign notes). It's now a compact, content-sized band — bounded by two
 * fixed width targets (with vs. without a visible title/artist line) and
 * capped by whatever width is actually available, never claiming more than
 * it needs the way Links already didn't.
 */

/** Compact width target when there's no title/artist to show — just
 * artwork (if any) + play control + seek + volume toggle. */
export const MUSIC_BLOCK_WIDTH_COMPACT = 130;
/** Width target when a title or artist line is shown — enough room for a
 * short line of text before it ellipsizes. */
export const MUSIC_BLOCK_WIDTH_FULL = 220;
/** Fixed height matching ProfileMusicPlayer.tsx's compact 2-row layout
 * (controls+text row, seek row) — kept here, not measured from the DOM,
 * for the same reason every other block's natural size in this system is
 * computed rather than measured (see cardComposition.ts's file header on
 * heuristic sizing). Volume lives behind a toggle (progressive disclosure)
 * so it never adds to the reserved height. */
export const MUSIC_BLOCK_HEIGHT = 56;
/** Gap between the Music block and whatever sits above it (Links, or the
 * base content if Links is absent) — same contract as CONTACT_LINK_GAP. */
export const MUSIC_BLOCK_GAP = 10;

export interface MusicNaturalSizeInput {
  /** Width available to the block, px — a ceiling, not a target. */
  availableWidth: number;
  /** Whether title and/or artist will actually render a text line —
   * drives which of the two width targets applies. */
  hasText: boolean;
}

export interface NaturalSize {
  width: number;
  height: number;
}

/** Content-sized band, never wider than `availableWidth` — see the file
 * header for why this replaced "spans the full available width". Height is
 * fixed regardless of width/content, same contract as before. */
export function computeMusicNaturalSize(input: MusicNaturalSizeInput): NaturalSize {
  const target = input.hasText ? MUSIC_BLOCK_WIDTH_FULL : MUSIC_BLOCK_WIDTH_COMPACT;
  const width = Math.max(0, Math.min(target, input.availableWidth));
  return { width, height: MUSIC_BLOCK_HEIGHT };
}
