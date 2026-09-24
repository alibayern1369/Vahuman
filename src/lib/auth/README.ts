/**
 * Authentication is Better Auth + Drizzle.
 *
 * Roles: admin | customer
 * Admin UI: /admin (cookie gate + server-side role check)
 * Customer UI: /account (Phase 5) — signup enabled unless AUTH_DISABLE_SIGNUP=true
 * Seed admin: pnpm db:seed-admin
 * Guest checkout remains available without an account.
 * On login/register: guest cart merges into customer cart; token-accessible orders may be claimed.
 */
export { auth } from "@/lib/auth/index";
