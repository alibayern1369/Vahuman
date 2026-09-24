/**
 * Portable reservation expiration job (not tied to a single host).
 *
 * Invoke via:
 * - HTTP cron hitting POST /api/cron/expire-reservations with CRON_SECRET
 * - CLI: `pnpm orders:expire`
 * - Any background worker calling expireUnpaidReservations()
 *
 * Idempotent: releasing already-released reservations is a no-op;
 * already-expired orders are skipped.
 */
import { and, eq, inArray, lte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { recordOrderEvent } from "@/lib/orders/events";
import { releaseOrderReservations } from "@/lib/orders/reservation";
import type { OrderStatus } from "@/lib/orders/states";
import { assertOrderTransition } from "@/lib/orders/states";

const EXPIREABLE: OrderStatus[] = [
  "pending_payment",
  "awaiting_payment_verification",
  "payment_rejected",
];

export async function expireUnpaidReservations(now = new Date()): Promise<{
  scanned: number;
  expired: number;
}> {
  const db = getDb();
  const candidates = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.orderStatus, EXPIREABLE),
        lte(orders.reservationExpiresAt, now),
      ),
    );

  let expired = 0;
  for (const order of candidates) {
    try {
      assertOrderTransition(order.orderStatus, "expired");
    } catch {
      continue;
    }

    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, order.id))
        .for("update")
        .limit(1);
      if (!locked) return;
      if (!EXPIREABLE.includes(locked.orderStatus)) return;
      if (locked.reservationExpiresAt.getTime() > now.getTime()) return;
      if (locked.paymentStatus === "verified") return;

      const released = await releaseOrderReservations(tx, locked.id);

      await tx
        .update(orders)
        .set({
          orderStatus: "expired",
          expiredAt: now,
          updatedAt: now,
        })
        .where(eq(orders.id, locked.id));

      await recordOrderEvent(tx, {
        orderId: locked.id,
        eventType: "order_expired",
        fromOrderStatus: locked.orderStatus,
        toOrderStatus: "expired",
        fromPaymentStatus: locked.paymentStatus,
        actorType: "system",
        payload: { releasedReservations: released },
      });

      if (released > 0) {
        await recordOrderEvent(tx, {
          orderId: locked.id,
          eventType: "reservation_released",
          actorType: "system",
          payload: { reason: "expired", count: released },
        });
      }

      expired += 1;
    });
  }

  return { scanned: candidates.length, expired };
}
