type ImageVariant = "small" | "large";

/**
 * Per-set CDN overrides. Default for every set is pokemontcg.io, which is
 * community-maintained and typically lags newly released sets by a few
 * weeks. When we have a known-good alternative source for a specific set,
 * register a template here — `{n}` is replaced with the card number, and
 * `{v}` is replaced with "" for small or "_hires" for large.
 *
 * Example (hypothetical):
 *   me3: { small: "https://cdn.example.com/me3/{n}.png", large: "..." }
 */
const SET_IMAGE_OVERRIDES: Record<string, { small: string; large: string }> = {};

function build(setId: string, number: string, variant: ImageVariant): string {
  const override = SET_IMAGE_OVERRIDES[setId];
  const suffix = variant === "large" ? "_hires" : "";
  if (override) {
    return override[variant].replace("{n}", number).replace("{v}", suffix);
  }
  return `https://images.pokemontcg.io/${setId}/${number}${suffix}.png`;
}

export function cardImageSmall(setId: string, number: string): string {
  return build(setId, number, "small");
}

export function cardImageLarge(setId: string, number: string): string {
  return build(setId, number, "large");
}
