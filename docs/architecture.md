# Architecture decisions

Brand: وهومن / VAHUMAN (technical: `vahuman`). Admin title: مدیریت وهومن.

## ORM: Drizzle

Chosen over Prisma for this project because:

1. Native fit with Neon on Vercel.
2. Smaller runtime footprint and predictable SQL.
3. Clear migration workflow via `drizzle-kit`.
4. Easier long-term control for complex commerce queries.

Runtime DB access uses `pg` (Node pool) for Better Auth compatibility and reliable TCP on restricted networks. Neon HTTP remains available for lightweight smoke checks.

## Auth: Better Auth (Phase 1)

- Email/password for administrators
- Roles: `admin` | `customer`
- Cookie sessions + server-side role checks on `/admin`
- Public signup disabled by default
- First admin created via `pnpm db:seed-admin`

## Folder layout

```text
src/
  app/           # Next.js App Router (storefront + /admin + auth API)
  components/    # Shared UI
  config/        # App + env configuration
  features/      # Domain modules (admin started in Phase 1)
  lib/
    auth/        # Better Auth server + client helpers
    db/          # Drizzle client + schema + migrate/seed
    payments/    # Payment architecture notes
    security/    # Shared errors
    utils/       # Pure helpers
  types/
```

## Background jobs

Import crawling, image pipelines, Instagram publishing, and AI batch work must not run inside unbounded serverless request timeouts.

## Storage

Product images go to object storage, never as bytea in PostgreSQL.
