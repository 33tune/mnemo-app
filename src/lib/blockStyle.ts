/**
 * First version of per-block visual overrides for ProfileCard's internal
 * blocks (Stage FASE 1 — Personalization Core). Same 5 block keys
 * ProfileCard.tsx's own BlockKey uses for drag (identity/location/views/
 * links/music) — see ProfileCard.tsx's BLOCK_ANCHOR_FIELDS.
 *
 * Deliberately background/textColor/iconColor/radius ONLY — no padding, no
 * border width, no size. Those would change the box computeBlockLayout()
 * measures and reserves for this block; adding them here without also
 * teaching the engine to measure them would silently reopen the exact class
 * of overlap/clip bug the 4 rounds of resize/growth fixes already closed
 * (see CLAUDE.md). A future stage that wants block padding/border needs to
 * extend LinksBlockInput/MusicBlockInput's size contract first — this file
 * is not that, on purpose.
 *
 * `textColor`/`iconColor` are wired into render ONLY for blocks that don't
 * already have a finer-grained per-role color system: Identity's 4 roles
 * (name/handle/descriptor/bio) already have independent overrides via
 * cardColors.ts, and Contact Links' icon color is also a cardColors role —
 * layering a second, coarser color control on top of those would just be two
 * fields fighting over the same pixels with no clear precedence. Location,
 * Views, and Music don't have that ambiguity (Location/Views each render one
 * thing; Music's textColor maps 1:1 to ProfileMusicPlayer's `textColor`
 * prop), so those three are where blockStyle.textColor actually applies.
 * `bg`/`radius` apply uniformly to all 5 blocks — no such ambiguity there.
 */
import type { BlockStyleKey, BlockStyleOverride, ProfileCardData } from "@/types";

export interface ResolvedBlockStyle {
  bg?:        string;
  textColor?: string;
  iconColor?: string;
  radius:     number;
}

// Exactly the radius each of the 5 block wrappers already hardcoded in
// ProfileCard.tsx's renderComposed() before this stage.
const DEFAULT_BLOCK_RADIUS: Record<BlockStyleKey, number> = {
  identity: 2,
  location: 2,
  views:    2,
  links:    2,
  music:    6,
};

/**
 * Resolves the effective style for one block. `card.blockStyle?.[key]`
 * absent (every existing card) or any of its fields absent both mean
 * "inherit ProfileCard's own look, exactly as before this stage" — bg/
 * textColor/iconColor stay `undefined` (caller's existing fallback applies),
 * radius falls back to that block's own pre-existing hardcoded default.
 */
export function resolveBlockStyle(card: Pick<ProfileCardData, "blockStyle">, key: BlockStyleKey): ResolvedBlockStyle {
  const o: BlockStyleOverride | undefined = card.blockStyle?.[key];
  return {
    bg:        o?.bg,
    textColor: o?.textColor,
    iconColor: o?.iconColor,
    radius:    o?.radius ?? DEFAULT_BLOCK_RADIUS[key],
  };
}
