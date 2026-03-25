import { createHash } from "crypto";

// Hash the IP with a secret salt so it cannot be reversed
// We can identify "same player" without ever storing the IP
export function hashIp(ip: string): string {
  const salt = process.env.PLAYER_ID_SALT || "dexter-tcg-2026";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}
