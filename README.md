# Vahuman (وهومن) — Persian-first e-commerce foundation

Custom Next.js storefront and admin platform for **وهومن / VAHUMAN** (technical slug: `vahuman`). Not WordPress / WooCommerce.

## Current status (Phase 1)

Implemented:

- Next.js App Router + TypeScript + Tailwind CSS
- Persian / RTL foundation page
- Neon + Drizzle ORM (auth + catalog + settings schema)
- Better Auth (email/password, roles: `admin` | `customer`)
- Protected admin shell at `/admin` (مدیریت وهومن)
- Admin seed script + store settings defaults

Not implemented yet:

- Full product CRUD UI
- Storefront catalog, cart, checkout
- Card-to-card payment workflow
- Product importer, AI, SMS, Instagram, image pipeline
- Customer self-registration / OTP

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
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

Edit `.env.local` and set:

- Neon `DATABASE_URL` / `DATABASE_URL_UNPOOLED`
- `BETTER_AUTH_SECRET` (32+ random chars)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (for seeding the first admin)

## Environment variables

See `.env.example`. Never commit `.env.local` or real credentials.

## Local development

```bash
pnpm dev
```

- Storefront placeholder: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:seed-admin
```

`pnpm db:migrate` uses TCP via `pg` (recommended). `pnpm db:migrate:kit` uses drizzle-kit / Neon WebSocket.

## Admin bootstrap

1. Set `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env.local`
2. Run `pnpm db:migrate`
3. Run `pnpm db:seed-admin`
4. Open `/admin/login`

Public sign-up stays disabled unless `AUTH_DISABLE_SIGNUP=false`.

## Vercel preview

1. Set the same env vars in the Vercel project
2. Deploy a preview environment only for testing
3. Do not treat Vercel Hobby as production-ready for a live commercial store

## Troubleshooting

| Issue | What to try |
|---|---|
| SSL / TLS errors on install | Set `NODE_OPTIONS=--tls-min-v1.0 --tls-max-v1.2` |
| `DATABASE_URL is not configured` | Copy `.env.example` → `.env.local` |
| `BETTER_AUTH_SECRET` errors | Generate a 32+ char secret and restart `pnpm dev` |
| Migration WebSocket timeout | Use `pnpm db:migrate` (pg TCP) |
| Cannot log into admin | Run `pnpm db:seed-admin` after setting admin env vars |

## License

Private project — all rights reserved.
