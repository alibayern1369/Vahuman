/**
 * Admin fulfillment / payment verification.
 * Cancel restores active reservations; committed stock is restored on cancel after pay.
 */
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  inventoryReservations,
  orders,
  products,
  productVariants,
} from "@/lib/db/schema";
import { recordOrderEvent } from "@/lib/orders/events";
import {
  commitOrderReservations,
  releaseOrderReservations,
} from "@/lib/orders/reservation";
import {
  assertOrderTransition,
  assertPaymentTransition,
  type OrderStatus,
} from "@/lib/orders/states";

export async function approvePayment(input: {
  orderId: string;
  adminUserId: string;
}): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new Error("سفارش یافت نشد.");

    if (order.paymentStatus === "verified" && order.orderStatus === "paid") {
      return;
    }

    assertPaymentTransition(order.paymentStatus, "verified");
    assertOrderTransition(order.orderStatus, "paid");

    const committed = await commitOrderReservations(tx, order.id);

    await tx
      .update(orders)
      .set({
        paymentStatus: "verified",
        orderStatus: "paid",
        paidAt: new Date(),
        paymentVerifiedBy: input.adminUserId,
        paymentVerifiedAt: new Date(),
        paymentRejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await recordOrderEvent(tx, {
      orderId: order.id,
      eventType: "payment_approved",
      fromOrderStatus: order.orderStatus,
      toOrderStatus: "paid",
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: "verified",
      actorType: "admin",
      actorUserId: input.adminUserId,
      payload: { committedReservations: committed },
    });

    if (committed > 0) {
      await recordOrderEvent(tx, {
        orderId: order.id,
        eventType: "reservation_committed",
        actorType: "admin",
        actorUserId: input.adminUserId,
        payload: { count: committed },
      });
    }
  });
}

export async function rejectPayment(input: {
  orderId: string;
  adminUserId: string;
  reason: string;
}): Promise<void> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new Error("دلیل رد پرداخت الزامی است.");
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new Error("سفارش یافت نشد.");

    if (
      order.paymentStatus === "rejected" &&
      order.orderStatus === "payment_rejected"
    ) {
      return;
    }

    assertPaymentTransition(order.paymentStatus, "rejected");
    assertOrderTransition(order.orderStatus, "payment_rejected");

    await tx
      .update(orders)
      .set({
        paymentStatus: "rejected",
        orderStatus: "payment_rejected",
        paymentRejectionReason: reason.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await recordOrderEvent(tx, {
      orderId: order.id,
      eventType: "payment_rejected",
      fromOrderStatus: order.orderStatus,
      toOrderStatus: "payment_rejected",
      fromPaymentStatus: order.paymentStatus,
      toPaymentStatus: "rejected",
      actorType: "admin",
      actorUserId: input.adminUserId,
      payload: { reason: reason.slice(0, 500) },
    });
  });
}

const FULFILLMENT_EVENT: Partial<
  Record<OrderStatus, "order_processing" | "order_shipped" | "order_delivered">
> = {
  processing: "order_processing",
  shipped: "order_shipped",
  delivered: "order_delivered",
};

export async function transitionFulfillment(input: {
  orderId: string;
  adminUserId: string;
  toStatus: Extract<OrderStatus, "processing" | "shipped" | "delivered">;
  trackingCode?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.paymentStatus !== "verified") {
      throw new Error("قبل از ارسال، پرداخت باید تأیید شده باشد.");
    }
    if (order.orderStatus === input.toStatus) return;

    assertOrderTransition(order.orderStatus, input.toStatus);

    const patch: {
      orderStatus: typeof input.toStatus;
      updatedAt: Date;
      shippedAt?: Date;
      deliveredAt?: Date;
      trackingCode?: string;
    } = {
      orderStatus: input.toStatus,
      updatedAt: new Date(),
    };
    if (input.toStatus === "shipped") {
      patch.shippedAt = new Date();
      if (input.trackingCode?.trim()) {
        patch.trackingCode = input.trackingCode.trim().slice(0, 120);
      }
    }
    if (input.toStatus === "delivered") {
      patch.deliveredAt = new Date();
    }

    await tx.update(orders).set(patch).where(eq(orders.id, order.id));

    const eventType = FULFILLMENT_EVENT[input.toStatus];
    if (eventType) {
      await recordOrderEvent(tx, {
        orderId: order.id,
        eventType,
        fromOrderStatus: order.orderStatus,
        toOrderStatus: input.toStatus,
        actorType: "admin",
        actorUserId: input.adminUserId,
        payload: input.trackingCode
          ? { trackingCode: input.trackingCode.trim().slice(0, 120) }
          : undefined,
      });
    }
  });
}

export async function cancelOrder(input: {
  orderId: string;
  adminUserId: string;
  reason?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new Error("سفارش یافت نشد.");
    if (order.orderStatus === "cancelled") return;

    assertOrderTransition(order.orderStatus, "cancelled");

    const released = await releaseOrderReservations(tx, order.id);

    const committed = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, order.id),
          eq(inventoryReservations.status, "committed"),
        ),
      )
      .for("update");

    for (const row of committed) {
      if (row.variantId) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, row.variantId))
          .for("update")
          .limit(1);
        if (variant) {
          await tx
            .update(productVariants)
            .set({
              stockQuantity: variant.stockQuantity + row.quantity,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, variant.id));
        }
      } else if (row.productId) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, row.productId))
          .for("update")
          .limit(1);
        if (product) {
          await tx
            .update(products)
            .set({
              stockQuantity: product.stockQuantity + row.quantity,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));
        }
      }
      await tx
        .update(inventoryReservations)
        .set({ status: "released", releasedAt: new Date() })
        .where(eq(inventoryReservations.id, row.id));
    }

    await tx
      .update(orders)
      .set({
        orderStatus: "cancelled",
        cancelledAt: new Date(),
        adminNote: input.reason?.trim().slice(0, 500) || order.adminNote,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await recordOrderEvent(tx, {
      orderId: order.id,
      eventType: "order_cancelled",
      fromOrderStatus: order.orderStatus,
      toOrderStatus: "cancelled",
      actorType: "admin",
      actorUserId: input.adminUserId,
      payload: {
        reason: input.reason?.trim().slice(0, 500) ?? null,
        releasedActive: released,
        releasedCommitted: committed.length,
      },
    });
  });
}
