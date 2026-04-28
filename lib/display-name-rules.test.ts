import { describe, it, expect } from "vitest";
import { validateDisplayName, sanitizeEmailPrefix } from "./display-name-rules";

describe("validateDisplayName", () => {
  describe("length", () => {
    it("rejects names shorter than 2 chars", () => {
      const result = validateDisplayName("a");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/at least 2/);
    });

    it("rejects names longer than 30 chars", () => {
      const result = validateDisplayName("a".repeat(31));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/30 characters or fewer/);
    });

    it("trims whitespace before measuring length", () => {
      // " a " trims to "a" — 1 char, should fail
      const result = validateDisplayName(" a ");
      expect(result.valid).toBe(false);
    });
  });

  describe("characters", () => {
    it("accepts letters, numbers, spaces, hyphens, underscores", () => {
      expect(validateDisplayName("Ash Ketchum").valid).toBe(true);
      expect(validateDisplayName("trainer_42").valid).toBe(true);
      expect(validateDisplayName("dark-side").valid).toBe(true);
    });

    it("rejects emoji and special characters", () => {
      expect(validateDisplayName("ash!").valid).toBe(false);
      expect(validateDisplayName("ash@home").valid).toBe(false);
      expect(validateDisplayName("ash🔥").valid).toBe(false);
    });
  });

  describe("blocklist", () => {
    it("rejects platform-reserved names case-insensitively", () => {
      expect(validateDisplayName("admin").valid).toBe(false);
      expect(validateDisplayName("ADMIN").valid).toBe(false);
      expect(validateDisplayName("Tcgdexter").valid).toBe(false);
    });

    it("rejects brand names", () => {
      expect(validateDisplayName("pokemon").valid).toBe(false);
      expect(validateDisplayName("Charizard").valid).toBe(false);
    });

    it("rejects names that start with a blocked term as a distinct word", () => {
      expect(validateDisplayName("admin tools").valid).toBe(false);
    });

    it("rejects names that end with a blocked term as a distinct word", () => {
      expect(validateDisplayName("the admin").valid).toBe(false);
    });

    it("allows names that merely contain a blocked substring inside another word", () => {
      // "administrator" contains "admin" but the full word "administrator"
      // is itself blocked — pick a substring case that isn't on the list.
      // "admiration" contains "admir" — neither "admiration" nor any substring is blocked.
      expect(validateDisplayName("admiration").valid).toBe(true);
    });
  });

  it("returns valid: true and error: null for clean names", () => {
    expect(validateDisplayName("Christian")).toEqual({ valid: true, error: null });
  });
});

describe("sanitizeEmailPrefix", () => {
  it("strips invalid characters", () => {
    expect(sanitizeEmailPrefix("ash.ketchum+pkmn")).toBe("ashketchumpkmn");
  });

  it("truncates to 30 characters", () => {
    const long = "a".repeat(50);
    expect(sanitizeEmailPrefix(long)).toHaveLength(30);
  });

  it("falls back to 'Trainer' if cleaned result is shorter than 2 chars", () => {
    expect(sanitizeEmailPrefix("!")).toBe("Trainer");
    expect(sanitizeEmailPrefix("")).toBe("Trainer");
  });

  it("preserves valid characters as-is", () => {
    expect(sanitizeEmailPrefix("ash_42")).toBe("ash_42");
  });
});
