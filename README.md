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

## Deploy on Vercel

1. Import the GitHub repo `alibayern1369/Vahuman` in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (see `vercel.json`, region `fra1`).
3. Set environment variables (Production + Preview as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | Neon **pooled** connection string |
| `DATABASE_URL_UNPOOLED` | recommended | Neon direct URL for migrations |
| `BETTER_AUTH_SECRET` | yes | ≥32 chars random secret |
| `BETTER_AUTH_URL` | yes | Public site URL, e.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | yes | Same public URL as above |
| `AUTH_DISABLE_SIGNUP` | optional | `false` to allow customer signup |
| `CRON_SECRET` | recommended | Protects `/api/cron/expire-reservations` (Vercel Cron sends Bearer token) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | local seed only | Do **not** rely on these in Vercel build; seed admin once via CLI against Neon |

4. After first deploy, run migrations against Neon from your machine:

```bash
pnpm db:migrate
pnpm db:seed-admin
```

5. Update Better Auth URLs if you attach a custom domain.

### Vercel Cron

`vercel.json` schedules hourly cleanup:

- `GET/POST` path: `/api/cron/expire-reservations`
- Requires `Authorization: Bearer $CRON_SECRET`

### Receipt storage on Vercel

Without S3 credentials, receipts use ephemeral `/tmp` storage (not durable across instances).  
Configure real object storage before production traffic.

## Notes

- Customer signup is enabled unless `AUTH_DISABLE_SIGNUP=true`.
- Role cannot be set from client (`role` input: false); default is `customer`.
- Prices are integer Iranian toman; totals resolved server-side only.
- Receipt upload never auto-confirms payment.
