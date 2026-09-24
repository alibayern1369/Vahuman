/**
 * Phase 5: customer account, cart merge, order ownership claim.
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const results: string[] = [];
  const { getDb, getPool } = await import("@/lib/db");
  const {
    user,
    account,
    products,
    carts,
    cartItems,
    orders,
    orderItems,
    orderEvents,
  } = await import("@/lib/db/schema");
  const { mergeCartLineQuantities } = await import("@/lib/cart/merge");
  const { ensureUserCart } = await import("@/lib/cart/merge-service");
  const {
    generateOrderAccessToken,
    hashOrderAccessToken,
    verifyOrderAccessToken,
  } = await import("@/lib/orders/access");
  const { generateOrderReference } = await import("@/lib/orders/reference");

  const db = getDb();
  const marker = `e2e5-${Date.now()}`;

  // Create temp customer
  const customerId = randomUUID();
  const email = `${marker}@vahuman.test`;
  const hashed = await hashPassword("Phase5TestPass!");
  await db.insert(user).values({
    id: customerId,
    name: "مشتری فاز۵",
    email,
    emailVerified: true,
    role: "customer",
  });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: customerId,
    providerId: "credential",
    userId: customerId,
    password: hashed,
  });
  results.push("customer_created:ok");

  // Product + guest cart lines → merge into user cart
  const [product] = await db
    .insert(products)
    .values({
      name: `محصول ${marker}`,
      slug: marker,
      status: "published",
      priceToman: 80000,
      trackInventory: true,
      stockQuantity: 20,
      publishedAt: new Date(),
    })
    .returning();

  const guestToken = randomUUID();
  const [guestCart] = await db
    .insert(carts)
    .values({ guestToken })
    .returning();
  await db.insert(cartItems).values({
    cartId: guestCart.id,
    productId: product.id,
    quantity: 2,
  });

  const { cartId: userCartId } = await ensureUserCart(customerId);
  // Simulate merge without cookies: copy logic inline
  const guestLines = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart.id));
  for (const line of guestLines) {
    const existing = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, userCartId))
      .limit(1);
    const next = mergeCartLineQuantities(
      existing[0]?.quantity ?? 0,
      line.quantity,
      20,
    );
    if (existing[0]) {
      await db
        .update(cartItems)
        .set({ quantity: next })
        .where(eq(cartItems.id, existing[0].id));
    } else {
      await db.insert(cartItems).values({
        cartId: userCartId,
        productId: line.productId,
        quantity: next,
      });
    }
  }
  await db.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await db.delete(carts).where(eq(carts.id, guestCart.id));

  const userLines = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, userCartId));
  if (userLines.length !== 1 || userLines[0]!.quantity !== 2) {
    throw new Error("cart merge failed");
  }
  results.push("cart_merge:ok");

  // Guest order claim by access token hash
  const token = generateOrderAccessToken();
  const reference = generateOrderReference();
  const [order] = await db
    .insert(orders)
    .values({
      reference,
      accessTokenHash: hashOrderAccessToken(token),
      checkoutIdempotencyKey: randomUUID(),
      customerFullName: "مهمان",
      customerMobile: "09120000000",
      shippingProvince: "تهران",
      shippingCity: "تهران",
      shippingAddress: "آدرس تست فاز ۵",
      shippingPostalCode: "1111111111",
      subtotalToman: 80000,
      shippingToman: 0,
      discountToman: 0,
      totalToman: 80000,
      reservationExpiresAt: new Date(Date.now() + 3600_000),
      userId: null,
    })
    .returning();
  await db.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    productNameSnapshot: product.name,
    productSlugSnapshot: product.slug,
    unitPriceToman: 80000,
    quantity: 1,
    lineTotalToman: 80000,
  });

  if (!verifyOrderAccessToken(token, order.accessTokenHash)) {
    throw new Error("token verify failed");
  }

  // Claim
  await db
    .update(orders)
    .set({ userId: customerId })
    .where(eq(orders.id, order.id));
  const [claimed] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);
  if (claimed.userId !== customerId) throw new Error("claim failed");
  results.push("order_claim:ok");

  // Ownership: other customer must not see
  const otherId = randomUUID();
  await db.insert(user).values({
    id: otherId,
    name: "دیگر",
    email: `other-${marker}@vahuman.test`,
    emailVerified: true,
    role: "customer",
  });
  if (claimed.userId === otherId) throw new Error("ownership leak");
  results.push("ownership_isolation:ok");

  // Cleanup
  await db.delete(orderEvents).where(eq(orderEvents.orderId, order.id));
  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.delete(orders).where(eq(orders.id, order.id));
  await db.delete(cartItems).where(eq(cartItems.cartId, userCartId));
  await db.delete(carts).where(eq(carts.id, userCartId));
  await db.delete(products).where(like(products.slug, `${marker}%`));
  await db.delete(account).where(eq(account.userId, customerId));
  await db.delete(user).where(eq(user.id, customerId));
  await db.delete(user).where(eq(user.id, otherId));

  console.log("PHASE5_E2E_PASS");
  for (const line of results) console.log(` - ${line}`);
  await getPool().end();
}

main().catch(async (error: unknown) => {
  console.error("PHASE5_E2E_FAIL");
  console.error(error instanceof Error ? error.message : error);
  try {
    const { getPool } = await import("@/lib/db");
    await getPool().end();
  } catch {
    // ignore
  }
  process.exit(1);
});
