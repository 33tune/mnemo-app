// Temporary, render-only z-index boost applied to the selected element(s)
// of the editor canvas. Never written to `zIndex`/`layer`/`zCounter` —
// purely a stacking-order override so the active element (and its
// resize/rotate handles, which render as its DOM children) stay above
// every other canvas element while selected. On deselect, the element
// renders at its persisted zIndex/layer again, unchanged.
//
// Must stay below the fixed/portaled menu z-indexes (CardMenu/GuestbookMenu
// at 9999, ProfileCard config menu / ImageLinkPortal at 999999) so open
// menus always remain on top.
export const SELECTION_Z_BOOST = 5000;

// z-index for the multi-select bounding box, kept above any boosted
// selected element (SELECTION_Z_BOOST + max layer contribution).
export const GROUP_BOUNDS_Z = SELECTION_Z_BOOST + 300;
