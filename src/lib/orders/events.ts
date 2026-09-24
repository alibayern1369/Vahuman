/**
 * Append-only order event history.
 */
import type { Database } from "@/lib/db";
import { orderEvents } from "@/lib/db/schema";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/states";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type OrderEventType =
  | "order_created"
  | "reservation_created"
  | "receipt_submitted"
  | "receipt_replaced"
  | "payment_approved"
  | "payment_rejected"
  | "reservation_released"
  | "reservation_committed"
  | "order_processing"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "order_expired"
  | "admin_note_updated";

export async function recordOrderEvent(
  tx: Tx | Database,
  input: {
    orderId: string;
    eventType: OrderEventType;
    fromOrderStatus?: OrderStatus | null;
    toOrderStatus?: OrderStatus | null;
    fromPaymentStatus?: PaymentStatus | null;
    toPaymentStatus?: PaymentStatus | null;
    actorType?: "system" | "customer" | "admin";
    actorUserId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(orderEvents).values({
    orderId: input.orderId,
    eventType: input.eventType,
    fromOrderStatus: input.fromOrderStatus ?? null,
    toOrderStatus: input.toOrderStatus ?? null,
    fromPaymentStatus: input.fromPaymentStatus ?? null,
    toPaymentStatus: input.toPaymentStatus ?? null,
    actorType: input.actorType ?? "system",
    actorUserId: input.actorUserId ?? null,
    payload: input.payload ?? null,
  });
}
