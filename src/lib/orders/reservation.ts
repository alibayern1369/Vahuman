/**
 * Inventory reservation service.
 *
 * Strategy: hard decrement sellable stock inside a DB transaction with row locks.
 * - create: FOR UPDATE → check qty → decrement → insert reservation(active)
 * - release: only if active → restore stock → status=released (idempotent)
 * - commit: only if active → status=committed (no stock restore; already sold)
 *
 * Never release committed reservations as if unpaid.
 */
import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "@/lib/db";
import {
  inventoryReservations,
  productVariants,
  products,
} from "@/lib/db/schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function reserveStockForOrderItem(
  tx: Tx,
  input: {
    orderId: string;
    orderItemId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    trackInventory: boolean;
    expiresAt: Date;
  },
): Promise<{ reservationId: string } | { skipped: true }> {
  if (!input.trackInventory) {
    return { skipped: true };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("مقدار رزرو نامعتبر است.");
  }

  if (input.variantId) {
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, input.variantId))
      .for("update")
      .limit(1);
    if (!variant || variant.productId !== input.productId) {
      throw new Error("واریانت برای رزرو یافت نشد.");
    }
    if (variant.stockQuantity < input.quantity) {
      throw new Error("موجودی کافی برای رزرو نیست.");
    }
    await tx
      .update(productVariants)
      .set({
        stockQuantity: variant.stockQuantity - input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, variant.id));
  } else {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);
    if (!product) {
      throw new Error("محصول برای رزرو یافت نشد.");
    }
    if (product.stockQuantity < input.quantity) {
      throw new Error("موجودی کافی برای رزرو نیست.");
    }
    await tx
      .update(products)
      .set({
        stockQuantity: product.stockQuantity - input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));
  }

  const [row] = await tx
    .insert(inventoryReservations)
    .values({
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      status: "active",
      expiresAt: input.expiresAt,
    })
    .returning({ id: inventoryReservations.id });

  return { reservationId: row.id };
}

async function restoreStock(
  tx: Tx,
  input: {
    productId: string | null;
    variantId: string | null;
    quantity: number;
  },
): Promise<void> {
  if (!input.productId) return;
  if (input.variantId) {
    const [variant] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, input.variantId))
      .for("update")
      .limit(1);
    if (!variant) return;
    await tx
      .update(productVariants)
      .set({
        stockQuantity: variant.stockQuantity + input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, variant.id));
  } else {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .for("update")
      .limit(1);
    if (!product) return;
    await tx
      .update(products)
      .set({
        stockQuantity: product.stockQuantity + input.quantity,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));
  }
}

/**
 * Idempotent release of all active reservations for an order.
 * Returns number of reservations actually released in this call.
 */
export async function releaseOrderReservations(
  tx: Tx,
  orderId: string,
): Promise<number> {
  const active = await tx
    .select()
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, orderId),
        eq(inventoryReservations.status, "active"),
      ),
    )
    .for("update");

  let released = 0;
  for (const row of active) {
    await restoreStock(tx, {
      productId: row.productId,
      variantId: row.variantId,
      quantity: row.quantity,
    });
    await tx
      .update(inventoryReservations)
      .set({ status: "released", releasedAt: new Date() })
      .where(
        and(
          eq(inventoryReservations.id, row.id),
          eq(inventoryReservations.status, "active"),
        ),
      );
    released += 1;
  }
  return released;
}

/**
 * Convert active reservations to committed (sold). Idempotent.
 * Does NOT restore stock.
 */
export async function commitOrderReservations(
  tx: Tx,
  orderId: string,
): Promise<number> {
  const active = await tx
    .select()
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.orderId, orderId),
        eq(inventoryReservations.status, "active"),
      ),
    )
    .for("update");

  if (!active.length) {
    const existing = await tx
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));
    if (existing.every((r) => r.status === "committed")) {
      return 0;
    }
    if (existing.some((r) => r.status === "released")) {
      throw new Error("نمی‌توان رزرو آزادشده را به فروش قطعی تبدیل کرد.");
    }
  }

  const ids = active.map((r) => r.id);
  if (ids.length) {
    await tx
      .update(inventoryReservations)
      .set({ status: "committed", committedAt: new Date() })
      .where(inArray(inventoryReservations.id, ids));
  }
  return ids.length;
}
