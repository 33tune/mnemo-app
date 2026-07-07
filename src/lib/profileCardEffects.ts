import type { ProfileCardData, CardEffects } from "@/types";

type ProfileCardEffectsSource = Pick<ProfileCardData,
  "bgColor" | "bgImage" | "bgMode" | "opacity" |
  "borderColor" | "borderWidth" | "borderRadius" |
  "glowColor" | "glowIntensity" | "variant" | "effects"
>;

/**
 * Computes the effective CardEffects for a ProfileCard, merging its
 * legacy bg/border/glow/variant fields with any explicit `effects` overrides.
 * Shared by the editor (ProfileCard) and MobilePublicCanvas so both render
 * the same visual system via CardLayers.
 */
type ModuleCardEffectsSource = {
  bgColor?:       string;
  bgImage?:       string;
  bgMode?:        "cover" | "repeat";
  opacity?:       number;
  borderColor?:   string;
  borderWidth?:   number;
  borderRadius?:  number;
  glowColor?:     string;
  glowIntensity?: number;
  effects?:       CardEffects;
};

/**
 * Computes the effective CardEffects for a module card (Social/Music/Links/Stats),
 * merging its legacy bg/border/glow fields with any explicit `effects` overrides.
 * Mirrors the effectiveEffects construction in each *CardWidget so MobilePublicCanvas
 * renders the same visual system via CardLayers.
 */
export function getModuleCardEffects(card: ModuleCardEffectsSource, defaultRadius: number): CardEffects {
  return {
    ...card.effects,
    bg: {
      color:     card.bgColor,
      image:     card.bgImage,
      imageMode: card.bgMode,
      ...card.effects?.bg,
    },
    border: {
      color:  card.borderColor,
      width:  card.borderWidth,
      radius: card.borderRadius ?? defaultRadius,
      ...card.effects?.border,
    },
    glow: {
      color:     card.glowColor,
      intensity: card.glowIntensity,
      outer:     true,
      ...card.effects?.glow,
    },
    opacity: card.effects?.opacity ?? card.opacity,
    padding: card.effects?.padding,
  };
}

export function getProfileCardEffects(card: ProfileCardEffectsSource): CardEffects {
  const variant = card.variant ?? "classic";
  const isGlassVariant = variant === "glass" || (!card.bgColor && !card.bgImage);
  const spotlightIntensity =
    variant === "guns"    ? 0.09 :
    variant === "minimal" ? 0    :
    variant === "glass"   ? 0.07 : 0.055;

  return {
    ...card.effects,
    bg: {
      color:     card.bgColor || undefined,
      image:     card.bgImage || undefined,
      imageMode: card.bgMode,
      opacity:   card.opacity,
      glass:     isGlassVariant,
      ...card.effects?.bg,
    },
    border: {
      color:  card.borderColor,
      width:  card.borderWidth,
      radius: card.borderRadius,
      ...card.effects?.border,
    },
    glow: {
      color:     card.glowColor,
      intensity: card.glowIntensity,
      outer:     (card.glowIntensity ?? 0) > 0,
      ...card.effects?.glow,
    },
    interactions: {
      spotlight:      spotlightIntensity > 0,
      spotlightColor: `rgba(255,255,255,${spotlightIntensity * 2.5})`,
      ...card.effects?.interactions,
    },
  };
}
