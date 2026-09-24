# Vahuman (وهومن) — Persian-first e-commerce

## Current status (Phase 4)

- Checkout, orders, inventory reservation, card-to-card payment
- Receipt upload (private storage; admin verification required)
- Admin order management + fulfillment states
- Guest order access via high-entropy token (reference alone is insufficient)

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
pnpm orders:expire
```

## Order reference strategy

Format `VH-YYYYMMDD-XXXXXX` (Tehran date + Crockford Base32). Unique index + retry.

## Reservation expiration

Portable job — not locked to one host:

- CLI: `pnpm orders:expire`
- HTTP: `POST /api/cron/expire-reservations` with `Authorization: Bearer $CRON_SECRET`

## Notes

- Prices are integer Iranian toman; totals resolved server-side only.
- Receipt upload never auto-confirms payment.
- Local receipt adapter: `.data/private-receipts/` (gitignored). Production object storage still to be wired.
