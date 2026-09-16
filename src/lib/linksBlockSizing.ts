/**
 * Pure sizing for the future Links internal block (Stage 4.2-A infrastructure
 * — see CLAUDE.md's Etapa 4 roadmap). No URL parsing, no icons, no rendering,
 * no UI: just "how much room would N link icons need", so
 * computeRequiredCardHeight() (cardGeometry.ts) and computeBlockLayout()'s
 * links extension (cardComposition.ts) have a natural size to work with once
 * an actual Links UI exists (Stage 4.2-B). Same architectural family as
 * cardGeometry.ts and cardComposition.ts: constants + pure functions, no
 * state, no DOM.
 */

export interface LinksNaturalSizeInput {
  /** Number of link icons to lay out. */
  count: number;
  /** Icon diameter/side, px. */
  iconSize: number;
  /** Gap between icons, px — both axes. */
  gap: number;
  /** Width available to wrap icons within, px. */
  availableWidth: number;
}

export interface NaturalSize {
  width: number;
  height: number;
}

/**
 * Lays out `count` equal-size icons in a left-to-right, wrapping grid (same
 * shape as a simple flex-wrap row) within `availableWidth`, and returns the
 * bounding box that grid actually needs. Zero/non-positive count or icon
 * size returns a zero-size box — "no links yet" must never claim any room.
 */
export function computeLinksNaturalSize(input: LinksNaturalSizeInput): NaturalSize {
  const { count, iconSize } = input;
  if (count <= 0 || iconSize <= 0) return { width: 0, height: 0 };

  const gap = Math.max(0, input.gap);
  const availableWidth = Math.max(0, input.availableWidth);

  const perRow = Math.max(1, Math.floor((availableWidth + gap) / (iconSize + gap)));
  const cols = Math.min(count, perRow);
  const rows = Math.ceil(count / perRow);

  return {
    width: cols * iconSize + (cols - 1) * gap,
    height: rows * iconSize + (rows - 1) * gap,
  };
}
