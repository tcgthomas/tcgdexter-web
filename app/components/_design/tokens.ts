/**
 * Shared design tokens for the /experiments/* design-identity preview.
 *
 * Kept as string constants (not a CSS var) so arbitrary Tailwind values can
 * consume them via inline style / `bg-[...]` arbitrary classes.
 */

/** 3-stop warm gradient used on the headline accent, primary CTAs, and the
 *  glow ring around the deck input. Amber → red → crimson. */
export const BRAND_GRADIENT =
  "linear-gradient(90deg,#F2A20C_0%,#D91E0D_50%,#A60D0D_100%)";

/** Same gradient expressed without underscores (for inline style consumption). */
export const BRAND_GRADIENT_CSS =
  "linear-gradient(90deg,#F2A20C 0%,#D91E0D 50%,#A60D0D 100%)";

/** Warm, coral-red tinted shadow used under the hero input card and the
 *  final-CTA panel. */
export const WARM_SHADOW = "0 20px 60px -15px rgba(217,30,13,0.25)";

/** Eyebrow accent color (section intros). Matches the project accent. */
export const EYEBROW_COLOR = "#D91E0D";
