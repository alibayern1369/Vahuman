# Vahuman (وهومن) — Persian-first e-commerce foundation

Custom Next.js storefront and admin platform for **وهومن / VAHUMAN** (technical slug: `vahuman`). Not WordPress / WooCommerce.

## Current status (Phase 0)

Implemented:

- Next.js App Router + TypeScript + Tailwind CSS
- Persian / RTL foundation page
- Neon + Drizzle ORM wiring and migration skeleton
- Environment template and security headers
- Auth / payment / importer / AI architecture notes only

Not implemented yet:

- Storefront catalog, cart, checkout
- Admin dashboard
- Authentication UI
- Card-to-card payment workflow
- Product importer, AI, SMS, Instagram, image pipeline

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Package manager | pnpm |
| Hosting target | Vercel (dev/preview; production needs a suitable plan) |

## Prerequisites

- Node.js 20+ (22 LTS recommended)
- pnpm 9+
- A Neon project (for database commands)

> **Windows / Node 26 note:** If `pnpm install` fails with `ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION`, run installs with:
> `NODE_OPTIONS=--tls-min-v1.0 --tls-max-v1.2`

## Installation

```bash
pnpm install
cp .env.example .env.local
```

Edit `.env.local` and set your Neon `DATABASE_URL` (and optionally `DATABASE_URL_UNPOOLED` for migrations).

## Environment variables

See `.env.example`. Required for DB features:

- `DATABASE_URL` — pooled Neon URL for the app runtime
- `DATABASE_URL_UNPOOLED` — direct URL preferred for migrations

Never commit `.env.local` or real credentials.

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

## Database

Generate migrations from the schema:

```bash
pnpm db:generate
```

Apply migrations (requires credentials; uses TCP via `pg`):

```bash
pnpm db:migrate
```

Optional connection smoke test (Neon HTTP, with TCP fallback):

```bash
pnpm db:check
```

> Note: `pnpm db:migrate:kit` runs `drizzle-kit migrate` (Neon WebSocket). Prefer `pnpm db:migrate` if WebSockets time out on your network.

Phase 0 includes only `schema_health_checks` to verify the migration pipeline.

## Vercel preview

1. Install Vercel CLI (`pnpm add -g vercel`) or connect the repo in the Vercel dashboard.
2. Set environment variables in the Vercel project (never bake secrets into the client).
3. Deploy a **preview** environment for testing.
4. Do not treat Vercel Hobby as production-ready for a live commercial store.

```bash
vercel
```

## Troubleshooting

| Issue | What to try |
|---|---|
| SSL / TLS errors on install | Set `NODE_OPTIONS=--tls-min-v1.0 --tls-max-v1.2` then reinstall |
| `DATABASE_URL is not configured` | Copy `.env.example` → `.env.local` and add Neon URL |
| Migration fails | Prefer `DATABASE_URL_UNPOOLED` for `pnpm db:migrate` |
| Build fails after pull | Run `pnpm install` then `pnpm typecheck` |

## License

Private project — all rights reserved.
