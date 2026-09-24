# Vahuman (وهومن) — Persian-first e-commerce

## Current status (Phase 5)

- Customer account: `/account`, `/account/login`, `/account/register`
- Customer orders: `/account/orders`, `/account/orders/[reference]`
- Guest cart → customer cart merge on login/register
- Guest orders can be claimed into an account via secure access token
- Guest checkout still works without an account
- Phase 4 checkout / card-to-card payment retained

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
pnpm e2e:phase4
pnpm e2e:phase5
pnpm orders:expire
```

## Notes

- Customer signup is enabled unless `AUTH_DISABLE_SIGNUP=true`.
- Role cannot be set from client (`role` input: false); default is `customer`.
- Prices are integer Iranian toman; totals resolved server-side only.
- Receipt upload never auto-confirms payment.
