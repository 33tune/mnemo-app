/**
 * How many pictures a room may hold (decision of 2026-10-27): 10 images on the
 * canvas. Stickers are the card's own (max 10, stickerGeometry.ts) and don't
 * count. A room saved with more before the limit keeps them; it only can't
 * add new ones until it is under the limit. Pure, so it's tested.
 */
export const MAX_CANVAS_IMAGES = 10;

export const IMAGE_LIMIT_MESSAGE =
  `Tu sala puede tener hasta ${MAX_CANVAS_IMAGES} imágenes. Borrá alguna para agregar otra.`;

/** How many of `incoming` new images fit next to the `current` ones. */
export function imageSlots(current: number, incoming: number, max = MAX_CANVAS_IMAGES): number {
  return Math.max(0, Math.min(incoming, max - current));
}

/** `items` without the images past the limit (other kinds always pass). */
export function withinImageLimit<T extends { elementType: string }>(items: T[], current: number, max = MAX_CANVAS_IMAGES): { kept: T[]; dropped: number } {
  let room = Math.max(0, max - current), dropped = 0;
  const kept = items.filter(it => {
    if (it.elementType !== "image") return true;
    if (room > 0) { room--; return true; }
    dropped++;
    return false;
  });
  return { kept, dropped };
}
