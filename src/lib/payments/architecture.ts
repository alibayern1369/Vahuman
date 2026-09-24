/**
 * Future payment architecture notes (card-to-card — not implemented in Phase 0).
 *
 * Workflow:
 * 1. Customer places order → server calculates and stores immutable totals.
 * 2. System issues a unique order reference.
 * 3. Customer views bank card details + exact payable amount.
 * 4. Customer transfers externally and uploads a receipt (+ optional bank ref).
 * 5. Order enters `payment_verification` queue — upload NEVER auto-confirms.
 * 6. Admin independently verifies the bank transfer.
 * 7. Only admin can confirm or reject; fulfillment starts after confirmation.
 *
 * Security requirements (later phases):
 * - Server-side total calculation only
 * - Receipts in private object storage (not public URLs by default)
 * - Idempotent confirmation (no duplicate payment confirmations)
 * - Auditable payment/order status history table
 * - Replay protection on receipt submissions
 * - Inventory reservation with TTL / expiration
 * - RBAC: customers cannot change payment status
 *
 * Do not install payment gateway SDKs.
 */

export const paymentStatuses = [
  "awaiting_transfer",
  "receipt_submitted",
  "under_review",
  "confirmed",
  "rejected",
  "expired",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
