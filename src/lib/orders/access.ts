/**
 * Guest order access: high-entropy token + SHA-256 hash stored on the order.
 * Reference alone is NEVER sufficient authorization.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ORDER_ACCESS_COOKIE = "vahuman_order_access";

export function generateOrderAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOrderAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyOrderAccessToken(
  token: string | null | undefined,
  storedHash: string,
): boolean {
  if (!token || !storedHash) return false;
  const hash = hashOrderAccessToken(token);
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Cookie value encodes multiple order tokens: ref1:token1|ref2:token2 */
export function parseAccessCookie(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const part of raw.split("|")) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const ref = part.slice(0, idx);
    const token = part.slice(idx + 1);
    if (ref && token) map.set(ref, token);
  }
  return map;
}

export function serializeAccessCookie(map: Map<string, string>): string {
  return Array.from(map.entries())
    .slice(-20)
    .map(([ref, token]) => `${ref}:${token}`)
    .join("|");
}
