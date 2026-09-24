/**
 * Phase 4 payment architecture (implemented).
 *
 * Card-to-card manual flow — NO payment gateway.
 *
 * 1. Checkout resolves cart lines from PostgreSQL (prices/stock/names).
 * 2. Order + snapshots + inventory reservations created in one transaction.
 * 3. Customer sees /order/[reference]/payment with exact server total.
 * 4. Customer uploads receipt → payment_status=receipt_submitted,
 *    order_status=awaiting_payment_verification (NEVER auto-paid).
 * 5. Admin verifies independently → verified + paid + reservations committed.
 * 6. Fulfillment: paid → processing → shipped → delivered.
 *
 * Guest access: high-entropy access token (hashed). Reference alone is insufficient.
 * Expiration: call expireUnpaidReservations() via cron/CLI — portable, not Vercel-locked.
 */
export { paymentStatuses } from "./architecture-compat";
