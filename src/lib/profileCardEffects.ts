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
