/**
 * Iteration 0 (O1): the element resize math, moved VERBATIM out of
 * useDragDrop.ts (no formula changes) so the keyboard resize
 * (canvasNudge.ts) runs through exactly the same code as the mouse drag.
 */
export type ResizeHandle = "nw"|"n"|"ne"|"e"|"se"|"s"|"sw"|"w";

/** Per-type minimum size for the generic (non-profile, non-text) resize —
 * the same table useDragDrop.ts used inline. */
export function resizeMinimums(type: string): { minW: number; minH: number } {
  const isModule = type==="social"||type==="music"||type==="links"||type==="stats";
  const minW = type==="image"?40 : type==="card"?80 : type==="gallery"?160 : type==="media"?200 : type==="guestbook"?200 : isModule?48 : 160;
  const minH = type==="image"?1  : type==="card"?60  : type==="gallery"?120 : type==="media"?60  : type==="guestbook"?260 : isModule?20 : 120;
  return { minW, minH };
}

// Per-handle resize delta computation — returns new position and size
export function computeResize(
  handle: ResizeHandle,
  dx: number, dy: number,
  startW: number, startH: number,
  startX: number, startY: number,
  ratio: number,   // h/w aspect ratio for images (0 = ignore)
  isImage: boolean,
  minW: number, minH: number,
): { nx: number; ny: number; nw: number; nh: number } {
  let nw = startW, nh = startH, nx = startX, ny = startY;

  if (isImage && ratio > 0) {
    // All image handles maintain aspect ratio so objectFit:contain fills the container
    // with no invisible empty space. Anchor = opposite side/corner from handle.
    switch (handle) {
      // Corners: driven by width, height follows ratio
      case "se": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, Math.round(nw * ratio)); break; }
      case "ne": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, Math.round(nw * ratio)); ny = startY + (startH - nh); break; }
      case "sw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, Math.round(nw * ratio)); nx = startX + (startW - nw); break; }
      case "nw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, Math.round(nw * ratio)); nx = startX + (startW - nw); ny = startY + (startH - nh); break; }
      // Horizontal sides: driven by width, height follows ratio, top anchored
      case "e":  { nw = Math.max(minW, startW + dx); nh = Math.max(minH, Math.round(nw * ratio)); break; }
      case "w":  { nw = Math.max(minW, startW - dx); nh = Math.max(minH, Math.round(nw * ratio)); nx = startX + (startW - nw); break; }
      // Vertical sides: driven by height, width follows ratio, left anchored
      case "s":  { nh = Math.max(minH, startH + dy); nw = Math.max(minW, Math.round(nh / ratio)); break; }
      case "n":  { nh = Math.max(minH, startH - dy); nw = Math.max(minW, Math.round(nh / ratio)); ny = startY + (startH - nh); break; }
    }
  } else {
    switch (handle) {
      case "se": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, startH + dy); break; }
      case "e":  { nw = Math.max(minW, startW + dx); break; }
      case "s":  { nh = Math.max(minH, startH + dy); break; }
      case "sw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, startH + dy); nx = startX + (startW - nw); break; }
      case "n":  { nh = Math.max(minH, startH - dy); ny = startY + (startH - nh); break; }
      case "ne": { nw = Math.max(minW, startW + dx); nh = Math.max(minH, startH - dy); ny = startY + (startH - nh); break; }
      case "nw": { nw = Math.max(minW, startW - dx); nh = Math.max(minH, startH - dy); nx = startX + (startW - nw); ny = startY + (startH - nh); break; }
      case "w":  { nw = Math.max(minW, startW - dx); nx = startX + (startW - nw); break; }
    }
  }
  return { nx, ny, nw, nh };
}

