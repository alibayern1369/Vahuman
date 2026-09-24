/**
 * Authentication is implemented with Better Auth + Drizzle (Phase 1).
 *
 * Roles: admin | customer
 * Admin UI: /admin (cookie gate + server-side role check)
 * Seed: pnpm db:seed-admin (requires ADMIN_EMAIL / ADMIN_PASSWORD)
 * Public signup: disabled by default (AUTH_DISABLE_SIGNUP)
 */
export { auth } from "@/lib/auth/index";
