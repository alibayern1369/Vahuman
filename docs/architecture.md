# Architecture decisions — Phase 0

## ORM: Drizzle

Chosen over Prisma for this project because:

1. Native fit with `@neondatabase/serverless` (HTTP) on Vercel.
2. Smaller runtime footprint and predictable SQL.
3. Clear migration workflow via `drizzle-kit`.
4. Easier long-term control for complex commerce queries.

Prisma remains a valid alternative; it was not selected for serverless cold-start and driver-adapter complexity on Neon.

## Auth (planned): Better Auth

Documented in `src/lib/auth/README.ts`. Not installed in Phase 0.

## Folder layout

```text
src/
  app/           # Next.js App Router (UI + route handlers)
  components/    # Shared UI (created when needed)
  config/        # App + env configuration
  features/      # Domain modules (added per feature phase)
  lib/
    auth/        # Auth design notes / future implementation
    db/          # Drizzle client + schema
    payments/    # Payment architecture notes
    security/    # Shared errors / future hardening
    utils/       # Pure helpers (dates, numbers, currency)
  types/         # Shared TypeScript types
```

Feature folders under `features/` are intentionally not pre-populated.

## Background jobs

Import crawling, image pipelines, Instagram publishing, and AI batch work must not run inside unbounded serverless request timeouts. Future workers should use a queue + separate worker (or a long-running host). Vercel Hobby is not assumed for production commerce.

## Storage

Product images go to object storage (S3-compatible / similar), never as bytea in PostgreSQL. Provider remains configurable.
