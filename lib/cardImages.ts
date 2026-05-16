export function cardImageSmall(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}.png`;
}

export function cardImageLarge(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}_hires.png`;
}
