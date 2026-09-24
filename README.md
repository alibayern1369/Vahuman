# Vahuman (وهومن) — Persian-first e-commerce

## Current status (Phase 3)

- Public storefront: `/`, `/shop`, `/product/[slug]`, `/category/[slug]`, `/brand/[slug]`, `/search`
- Guest cart with server-side price/stock validation
- SEO: metadata, sitemap, robots
- Phase 2 admin catalog + Phase 1 auth

## Commands

```bash
pnpm install
pnpm db:migrate
pnpm db:seed-admin
pnpm db:seed-demo
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Notes

- Prices are integer Iranian toman.
- Cart cookie stores identity only; totals resolved on the server.
- Draft/archived products never appear publicly.
