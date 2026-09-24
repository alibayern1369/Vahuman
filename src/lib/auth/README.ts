/**
 * Authentication architecture (Phase 0 — design only).
 *
 * Selected approach for later phases: Better Auth + Drizzle + Neon PostgreSQL.
 *
 * Why Better Auth:
 * - First-class App Router and TypeScript support
 * - Session cookies with secure defaults
 * - Role / additional fields for admin vs customer
 * - Password hashing handled by the library (no custom crypto)
 * - Extensible for future SMS OTP without hard-coding credentials
 *
 * Planned roles:
 * - `admin` — dashboard and payment verification
 * - `customer` — storefront account, cart, orders
 *
 * Planned protections:
 * - HTTP-only secure session cookies
 * - Server-side session validation on admin routes (middleware + layout guards)
 * - Never expose secrets or session tokens to the client bundle
 * - OTP: provider-agnostic SMS adapter; OTP codes hashed at rest; short TTL
 *
 * Explicitly out of scope for Phase 0:
 * - Login / registration UI
 * - Hard-coded admin users
 * - Fake auth bypasses
 *
 * Install and wire Better Auth only when Phase 1 (accounts) starts.
 */

export const authRoles = ["admin", "customer"] as const;

export type AuthRole = (typeof authRoles)[number];
