// Alphabet excludes ambiguous chars (0/O, 1/I, l) and lowercase to keep codes
// easy to read aloud and type. 30 characters total → ~590k 4-char codes,
// ~17M 5-char codes; we generate 6 for plenty of headroom even with collisions.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

export function generateMatchCode(length: number = CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function normalizeMatchCode(input: string): string {
  // User-typed codes get uppercased and stripped of whitespace + ambiguous
  // chars mapped to the alphabet's intended equivalents.
  return input
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/O/g, "0".replace("0", "")) // O has no real equivalent in our set; drop
    .replace(/0/g, "")
    .replace(/I/g, "")
    .replace(/L/g, "")
    .replace(/1/g, "");
}

export function isValidMatchCodeShape(code: string): boolean {
  if (code.length < 4 || code.length > 8) return false;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
