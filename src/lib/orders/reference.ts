/**
 * Human-friendly order reference strategy:
 *
 * Format: VH-YYYYMMDD-XXXXXX
 * - VH = Vahuman brand prefix
 * - YYYYMMDD = calendar day in Asia/Tehran (support-friendly grouping)
 * - XXXXXX = 6 Crockford Base32 chars from crypto random (≈30 bits entropy)
 *
 * Properties:
 * - Unique via DB unique index + retry on collision
 * - Not a sequential DB id (harder to enumerate)
 * - Short enough for phone/support reference
 * - Safe for public display (no PII)
 */
import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCrockford(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CROCKFORD[bytes[i]! % CROCKFORD.length];
  }
  return out;
}

function tehranDateParts(now = new Date()): {
  y: string;
  m: string;
  d: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function generateOrderReference(now = new Date()): string {
  const { y, m, d } = tehranDateParts(now);
  return `VH-${y}${m}${d}-${randomCrockford(6)}`;
}

export function isValidOrderReferenceFormat(value: string): boolean {
  return /^VH-\d{8}-[0-9A-HJKMNP-TV-Z]{6}$/i.test(value);
}
