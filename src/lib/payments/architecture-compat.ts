/** Compat re-export for older paymentStatuses constant. */
export const paymentStatuses = [
  "unpaid",
  "receipt_submitted",
  "verified",
  "rejected",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
