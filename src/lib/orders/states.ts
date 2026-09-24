/**
 * Order & payment state machines (Phase 4).
 *
 * Relationship:
 * - payment_status tracks money verification independently of fulfillment.
 * - order_status tracks customer-visible lifecycle including fulfillment.
 * - receipt upload NEVER sets payment to verified or order to paid.
 *
 * Typical happy path:
 *   unpaid + pending_payment
 *   → receipt_submitted + awaiting_payment_verification
 *   → verified + paid
 *   → processing → shipped → delivered
 */

export const ORDER_STATUSES = [
  "pending_payment",
  "awaiting_payment_verification",
  "payment_rejected",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "receipt_submitted",
  "verified",
  "rejected",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Valid order_status transitions (from → allowed next). */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: [
    "awaiting_payment_verification",
    "cancelled",
    "expired",
  ],
  awaiting_payment_verification: ["paid", "payment_rejected", "cancelled", "expired"],
  payment_rejected: [
    "awaiting_payment_verification",
    "cancelled",
    "expired",
  ],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  expired: [],
};

/** Valid payment_status transitions. */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ["receipt_submitted"],
  receipt_submitted: ["verified", "rejected"],
  verified: [],
  rejected: ["receipt_submitted"],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return false;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`گذار وضعیت سفارش از ${from} به ${to} مجاز نیست.`);
  }
}

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return false;
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`گذار وضعیت پرداخت از ${from} به ${to} مجاز نیست.`);
  }
}

/** Persian labels for customer/admin UI. */
export const ORDER_STATUS_LABELS_FA: Record<OrderStatus, string> = {
  pending_payment: "در انتظار پرداخت",
  awaiting_payment_verification: "در انتظار تأیید پرداخت",
  payment_rejected: "پرداخت رد شده",
  paid: "پرداخت تأیید شد",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغو شده",
  expired: "منقضی شده",
};

export const PAYMENT_STATUS_LABELS_FA: Record<PaymentStatus, string> = {
  unpaid: "پرداخت‌نشده",
  receipt_submitted: "رسید ارسال‌شده",
  verified: "تأییدشده",
  rejected: "ردشده",
};

/** Whether unpaid reservation may still accept a (re)submitted receipt. */
export function canSubmitReceipt(input: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  reservationExpiresAt: Date;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.reservationExpiresAt.getTime() <= now.getTime()) return false;
  if (input.paymentStatus === "verified") return false;
  if (
    input.orderStatus === "cancelled" ||
    input.orderStatus === "expired" ||
    input.orderStatus === "delivered" ||
    input.orderStatus === "shipped" ||
    input.orderStatus === "processing" ||
    input.orderStatus === "paid"
  ) {
    return false;
  }
  return (
    input.paymentStatus === "unpaid" ||
    input.paymentStatus === "rejected" ||
    input.paymentStatus === "receipt_submitted"
  );
}
