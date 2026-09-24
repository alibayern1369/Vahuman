# Vahuman (وهومن) — Persian-first e-commerce foundation

Custom Next.js storefront and admin platform for **وهومن / VAHUMAN** (technical slug: `vahuman`).

## Current status (Phase 2)

Implemented:

- Phase 0 foundation + Phase 1 auth/admin shell
- Full catalog engine: brands, nested categories, attributes/values, products, variants, media refs, specifications
- Admin CRUD under `/admin/*` with server-side authorization
- Integer toman pricing, draft/published/archived lifecycle
- Drizzle migrations on Neon

Not implemented yet:

- Public storefront catalog pages
- Cart, checkout, orders, card-to-card payment
- URL importer, AI, SMS, Instagram
- Object-storage image pipeline (media stores URL/metadata only)

## Pricing

Canonical DB unit: **integer Iranian toman**. Never float. Never trust client-side totals.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm db:seed-admin
pnpm dev
```

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Admin: http://localhost:3000/admin/login

## Catalog admin routes

- `/admin/products`
- `/admin/categories`
- `/admin/brands`
- `/admin/attributes`

## License

Private project — all rights reserved.
