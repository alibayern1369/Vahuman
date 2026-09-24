/**
 * Checkout: cart → order with server-side price resolution + atomic inventory reservation.
 */
import { eq } from "drizzle-orm";
import { z } from "zod";

import { resolveSellableLine } from "@/lib/cart/cart";
import { getDb } from "@/lib/db";
import {
  cartItems,
  carts,
  orderItems,
  orders,
} from "@/lib/db/schema";
import {
  generateOrderAccessToken,
  hashOrderAccessToken,
} from "@/lib/orders/access";
import { recordOrderEvent } from "@/lib/orders/events";
import { generateOrderReference } from "@/lib/orders/reference";
import { reserveStockForOrderItem } from "@/lib/orders/reservation";
import {
  getCardToCardSettings,
  getShippingSettings,
} from "@/lib/orders/settings";
import { calculateOrderTotals } from "@/lib/orders/totals";

export const checkoutCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "نام کامل الزامی است.")
    .max(120, "نام کامل خیلی طولانی است."),
  mobile: z
    .string()
    .trim()
    .regex(/^09\d{9}$/, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود."),
  province: z.string().trim().min(2, "استان الزامی است.").max(80),
  city: z.string().trim().min(2, "شهر الزامی است.").max(80),
  address: z
    .string()
    .trim()
    .min(8, "آدرس تحویل الزامی است.")
    .max(500, "آدرس خیلی طولانی است."),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد."),
  customerNote: z.string().trim().max(1000).optional().nullable(),
  idempotencyKey: z.string().uuid("کلید یکتایی پرداخت نامعتبر است."),
});

export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>;

export type CheckoutResult = {
  orderId: string;
  reference: string;
  accessToken: string;
  totalToman: number;
  reservationExpiresAt: Date;
  reusedExisting: boolean;
};

async function clearCartItems(cartId: string): Promise<void> {
  const db = getDb();
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

export async function createOrderFromCart(input: {
  cartId: string;
  customer: CheckoutCustomerInput;
  userId?: string | null;
}): Promise<CheckoutResult> {
  const customer = checkoutCustomerSchema.parse(input.customer);
  const db = getDb();

  // Idempotency: return existing order if same key already succeeded.
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.checkoutIdempotencyKey, customer.idempotencyKey))
    .limit(1);
  if (existing) {
    return {
      orderId: existing.id,
      reference: existing.reference,
      accessToken: "", // token already issued; caller should use cookie
      totalToman: existing.totalToman,
      reservationExpiresAt: existing.reservationExpiresAt,
      reusedExisting: true,
    };
  }

  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, input.cartId));
  if (!items.length) {
    throw new Error("سبد خرید خالی است.");
  }

  const resolvedLines: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    productName: string;
    productSlug: string;
    variantTitle: string | null;
    sku: string | null;
    unitPriceToman: number;
    trackInventory: boolean;
  }> = [];
  for (const item of items) {
    const resolved = await resolveSellableLine({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    });
    resolvedLines.push({
      productId: item.productId,
      variantId: resolved.variant?.id ?? null,
      quantity: item.quantity,
      productName: resolved.product.name,
      productSlug: resolved.product.slug,
      variantTitle: resolved.variant?.title ?? null,
      sku: resolved.variant?.sku ?? resolved.product.sku,
      unitPriceToman: resolved.unitPriceToman,
      trackInventory: resolved.product.trackInventory,
    });
  }

  const shipping = await getShippingSettings();
  const payment = await getCardToCardSettings();
  const totals = calculateOrderTotals({
    lines: resolvedLines.map((l) => ({
      unitPriceToman: l.unitPriceToman,
      quantity: l.quantity,
    })),
    shippingToman: shipping.flatRateToman,
    discountToman: 0,
  });

  const accessToken = generateOrderAccessToken();
  const accessTokenHash = hashOrderAccessToken(accessToken);
  const reservationExpiresAt = new Date(
    Date.now() + payment.reservationMinutes * 60_000,
  );

  let createdReference = "";
  let createdOrderId = "";
  let didCreate = false;

  await db.transaction(async (tx) => {
    // Re-check idempotency inside transaction
    const [again] = await tx
      .select()
      .from(orders)
      .where(eq(orders.checkoutIdempotencyKey, customer.idempotencyKey))
      .limit(1);
    if (again) {
      createdOrderId = again.id;
      createdReference = again.reference;
      return;
    }

    let reference = generateOrderReference();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const [order] = await tx
          .insert(orders)
          .values({
            reference,
            accessTokenHash,
            userId: input.userId ?? null,
            cartId: input.cartId,
            checkoutIdempotencyKey: customer.idempotencyKey,
            customerFullName: customer.fullName,
            customerMobile: customer.mobile,
            customerNote: customer.customerNote || null,
            shippingProvince: customer.province,
            shippingCity: customer.city,
            shippingAddress: customer.address,
            shippingPostalCode: customer.postalCode,
            subtotalToman: totals.subtotalToman,
            shippingToman: totals.shippingToman,
            discountToman: totals.discountToman,
            totalToman: totals.totalToman,
            currencyUnit: "toman",
            orderStatus: "pending_payment",
            paymentStatus: "unpaid",
            reservationExpiresAt,
          })
          .returning();

        createdOrderId = order.id;
        createdReference = order.reference;
        didCreate = true;

        await recordOrderEvent(tx, {
          orderId: order.id,
          eventType: "order_created",
          toOrderStatus: "pending_payment",
          toPaymentStatus: "unpaid",
          actorType: "customer",
          actorUserId: input.userId ?? null,
          payload: { reference: order.reference, totalToman: order.totalToman },
        });

        for (let i = 0; i < resolvedLines.length; i++) {
          const line = resolvedLines[i]!;
          const [orderItem] = await tx
            .insert(orderItems)
            .values({
              orderId: order.id,
              productId: line.productId,
              variantId: line.variantId,
              productNameSnapshot: line.productName,
              productSlugSnapshot: line.productSlug,
              variantTitleSnapshot: line.variantTitle,
              skuSnapshot: line.sku,
              unitPriceToman: line.unitPriceToman,
              quantity: line.quantity,
              lineTotalToman: totals.lineTotals[i]!,
            })
            .returning();

          const reserved = await reserveStockForOrderItem(tx, {
            orderId: order.id,
            orderItemId: orderItem.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            trackInventory: line.trackInventory,
            expiresAt: reservationExpiresAt,
          });

          if (!("skipped" in reserved)) {
            await recordOrderEvent(tx, {
              orderId: order.id,
              eventType: "reservation_created",
              actorType: "system",
              payload: {
                orderItemId: orderItem.id,
                reservationId: reserved.reservationId,
                quantity: line.quantity,
              },
            });
          }
        }

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("orders_reference_uidx") ||
          message.includes("orders_checkout_idempotency_uidx") ||
          message.includes("duplicate key")
        ) {
          const [idem] = await tx
            .select()
            .from(orders)
            .where(eq(orders.checkoutIdempotencyKey, customer.idempotencyKey))
            .limit(1);
          if (idem) {
            createdOrderId = idem.id;
            createdReference = idem.reference;
            return;
          }
          reference = generateOrderReference();
          continue;
        }
        throw error;
      }
    }
    throw new Error("تولید شماره سفارش یکتا ناموفق بود.");
  });

  if (!createdOrderId || !createdReference) {
    throw new Error("ایجاد سفارش ناموفق بود.");
  }

  const [finalOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, createdOrderId))
    .limit(1);

  if (didCreate) {
    await clearCartItems(input.cartId);
  }

  return {
    orderId: createdOrderId,
    reference: createdReference,
    accessToken: didCreate ? accessToken : "",
    totalToman: finalOrder?.totalToman ?? totals.totalToman,
    reservationExpiresAt:
      finalOrder?.reservationExpiresAt ?? reservationExpiresAt,
    reusedExisting: !didCreate,
  };
}

export async function getCartIdForGuestToken(
  token: string,
): Promise<string | null> {
  const db = getDb();
  const [cart] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.guestToken, token))
    .limit(1);
  return cart?.id ?? null;
}

export async function getOrderByReference(reference: string) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.reference, reference))
    .limit(1);
  return order ?? null;
}

export async function getOrderItems(orderId: string) {
  const db = getDb();
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}
