import { createHash, randomBytes } from "crypto";

/**
 * Generate a new API key: a plaintext token the caller must store,
 * a SHA-256 hash we persist, and a short display prefix.
 *
 * Format: asg_live_<32 hex chars>
 */
export function generateApiKey(): { plaintext: string; hashed: string; prefix: string } {
  const random = randomBytes(16).toString("hex");
  const plaintext = `asg_live_${random}`;
  const hashed = hashApiKey(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hashed, prefix };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
